import { lazy, Suspense, useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import { ScrollToTop } from './components/RouteTransitions'

// Instant critical path (Landing page stays eager for instant first-paint)
import Landing from './pages/Landing'

// Code-split lazy loaded pages with auto-recovery on stale deployment chunk errors
function lazyRetry(componentImport) {
  return lazy(async () => {
    try {
      return await componentImport()
    } catch (error) {
      const msg = String(error?.message || error || '').toLowerCase()
      const isChunkError = (
        msg.includes('failed to fetch dynamically imported module') ||
        msg.includes('loading chunk') ||
        msg.includes('chunkloaderror') ||
        msg.includes('importing a module script failed') ||
        msg.includes('dynamically imported module')
      )

      if (isChunkError && typeof window !== 'undefined') {
        const reloadKey = 'mdf_chunk_reload_' + window.location.pathname
        const alreadyReloaded = sessionStorage.getItem(reloadKey)
        if (!alreadyReloaded) {
          sessionStorage.setItem(reloadKey, 'true')
          window.location.reload()
          return new Promise(() => {})
        }
      }
      throw error
    }
  })
}

const Login = lazyRetry(() => import('./pages/Login'))
const Dashboard = lazyRetry(() => import('./pages/Dashboard'))
const Rules = lazyRetry(() => import('./pages/Rules'))
const Clients = lazyRetry(() => import('./pages/Clients'))
const AdminUsers = lazyRetry(() => import('./pages/AdminUsers'))
const AdminPricing = lazyRetry(() => import('./pages/AdminPricing'))
const AdminSupport = lazyRetry(() => import('./pages/AdminSupport'))
const AdminInspector = lazyRetry(() => import('./pages/AdminInspector'))
const UserSupport = lazyRetry(() => import('./pages/UserSupport'))
const Settings = lazyRetry(() => import('./pages/Settings'))
const Connect = lazyRetry(() => import('./pages/Connect'))
const BlockPage = lazyRetry(() => import('./pages/BlockPage'))
const Layout = lazyRetry(() => import('./components/Layout'))
const UserLayout = lazyRetry(() => import('./components/UserLayout'))
const Solutions = lazyRetry(() => import('./pages/Solutions'))
const SolutionDetail = lazyRetry(() => import('./pages/SolutionDetail'))
const ProductDetail = lazyRetry(() => import('./pages/ProductDetail'))
const Pricing = lazyRetry(() => import('./pages/Pricing'))
const Blog = lazyRetry(() => import('./pages/Blog'))
const Register = lazyRetry(() => import('./pages/Register'))
const UserLogin = lazyRetry(() => import('./pages/UserLogin'))
const UserDashboard = lazyRetry(() => import('./pages/UserDashboard'))
const UserWebsites = lazyRetry(() => import('./pages/UserWebsites'))
const UserLogs = lazyRetry(() => import('./pages/UserLogs'))
const UserSettings = lazyRetry(() => import('./pages/UserSettings'))
const UserPricing = lazyRetry(() => import('./pages/UserPricing'))
const UserBlacklist = lazyRetry(() => import('./pages/UserBlacklist'))
const BulkUptime = lazyRetry(() => import('./pages/bulk/BulkUptime'))
const BulkPerformance = lazyRetry(() => import('./pages/bulk/BulkPerformance'))
const BulkBrokenLinks = lazyRetry(() => import('./pages/bulk/BulkBrokenLinks'))
const BulkPlugins = lazyRetry(() => import('./pages/bulk/BulkPlugins'))
const BulkThemes = lazyRetry(() => import('./pages/bulk/BulkThemes'))
const BulkCore = lazyRetry(() => import('./pages/bulk/BulkCore'))
const BulkBackup = lazyRetry(() => import('./pages/bulk/BulkBackup'))
const BulkScanner = lazyRetry(() => import('./pages/bulk/BulkScanner'))
const BulkHardening = lazyRetry(() => import('./pages/bulk/BulkHardening'))
const BulkLoginGateway = lazyRetry(() => import('./pages/bulk/BulkLoginGateway'))
const BulkPostHack = lazyRetry(() => import('./pages/bulk/BulkPostHack'))
const BulkBreachIntelligence = lazyRetry(() => import('./pages/bulk/BulkBreachIntelligence'))
const BulkSafeUpdates = lazyRetry(() => import('./pages/bulk/BulkSafeUpdates'))
const BulkDatabase = lazyRetry(() => import('./pages/bulk/BulkDatabase'))
const BulkBlacklist = lazyRetry(() => import('./pages/bulk/BulkBlacklist'))
const BulkActivity = lazyRetry(() => import('./pages/bulk/BulkActivity'))
const UserTeam = lazyRetry(() => import('./pages/UserTeam'))
const AcceptTeamInvite = lazyRetry(() => import('./pages/AcceptTeamInvite'))
const UserAlerts = lazyRetry(() => import('./pages/UserAlerts'))
const UserReports = lazyRetry(() => import('./pages/UserReports'))
const UserTools = lazyRetry(() => import('./pages/UserTools'))
const SecurityPortScanner = lazyRetry(() => import('./pages/security/SecurityPortScanner'))
const DDoSDashboard = lazyRetry(() => import('./pages/DDoSDashboard'))
const AttackLearning = lazyRetry(() => import('./pages/AttackLearning'))
const Docs = lazyRetry(() => import('./pages/Docs'))
const VerifyEmail = lazyRetry(() => import('./pages/auth/VerifyEmail'))
const ForgotPassword = lazyRetry(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazyRetry(() => import('./pages/auth/ResetPassword'))
const GoogleCallback = lazyRetry(() => import('./pages/auth/GoogleCallback'))
const PaymentSuccess = lazyRetry(() => import('./pages/PaymentSuccess'))
const UserOnboarding = lazyRetry(() => import('./pages/auth/UserOnboarding'))

import api from './api/api'
import userStore from './utils/userStore'
import adminStore from './utils/adminStore'
import { syncPricingWithBackend } from './utils/pricingStore'

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

function isAdminPanelRole(u) {
  if (!u) return false;
  return u.role === 'super_admin' || u.role === 'admin' || u.role === 'support_lead' || u.role === 'support_agent' || Boolean(u.is_admin);
}

function hasAdminPerm(u, perm) {
  if (!u) return false;
  const perms = Array.isArray(u.permissions) ? u.permissions : [];
  if (u.role === 'super_admin' || u.role === 'admin' || u.is_owner || perms.includes('*')) return true;
  if (!perm || perm === 'owner_only') return false;
  return perms.includes(perm);
}

function AdminPermRoute({ user, perm, children }) {
  if (!hasAdminPerm(user, perm)) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
}

function hasUserWorkspaceAccess(u, { ownerOnly = false, allowedRoles = null } = {}) {
  if (!u) return false;
  const isTeam = Boolean(u.team_member_context);
  if (!isTeam) return true;
  if (ownerOnly) return false;
  if (!allowedRoles || allowedRoles.length === 0) return true;
  const role = (u.team_role || 'auditor').toLowerCase();
  return allowedRoles.includes(role);
}

function UserRoleRoute({ user, ownerOnly = false, allowedRoles = null, children }) {
  if (!hasUserWorkspaceAccess(user, { ownerOnly, allowedRoles })) {
    return <Navigate to="/user/dashboard" replace />;
  }
  return children;
}

function isUserOnboarded(u) {
  if (!u) return false;
  if (isAdminPanelRole(u)) return true;
  // Once onboarded, ALWAYS enter dashboard - even if all connected sites are later deleted
  return Boolean(u.onboarded);
}

function getPostLoginTarget(u) {
  if (!u) return '/user/login';
  if (isAdminPanelRole(u)) return '/admin';
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
      return isAdminPanelRole(cached) ? cached : null
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
      } catch (error) {
        console.warn('User profile sync error:', error)
      }
    };
    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener('mdefender_user_update', handleStorageUpdate);
    return () => {
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('mdefender_user_update', handleStorageUpdate);
    };
  }, []);

  useEffect(() => {
    // Intercept Paddle Transaction URL Parameter (_ptxn) from default payment links
    try {
      if (typeof window !== 'undefined' && window.location.search) {
        const urlParams = new URLSearchParams(window.location.search);
        const ptxn = urlParams.get('_ptxn');
        if (ptxn) {
          api.getBillingConfig().then(res => {
            const cfg = res?.data || res;
            if (cfg?.client_token && window.Paddle) {
              try {
                if (cfg.environment === 'sandbox') window.Paddle.Environment.set('sandbox');
                window.Paddle.Initialize({ token: cfg.client_token });
                window.Paddle.Checkout.open({
                  transactionId: ptxn,
                  settings: {
                    displayMode: 'overlay',
                    theme: 'light',
                    successUrl: `${window.location.origin}/payment/success`,
                  },
                });
              } catch (initErr) {
                console.warn('Auto Paddle Init Warning:', initErr);
              }
            }
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Paddle _ptxn check error:', e);
    }

    syncPricingWithBackend(api).catch(() => {});

    const hasToken = typeof localStorage !== 'undefined' && (
      localStorage.getItem('mdefender_access') || localStorage.getItem('mdefender_refresh')
    )
    if (!hasToken) return

    api.getMe().then(data => {
      const user = data.user
      if (isAdminPanelRole(user)) {
        setAdminUser(user)
        userStore.set('admin_profile', user)
        adminStore.prefetchAdminData(api)
      }
      setUserState(user)
      userStore.set('profile', user)
      if (user.plan) localStorage.setItem('mdefender_user_plan', user.plan)
      if (user.is_paid !== undefined) localStorage.setItem('mdefender_is_paid', String(user.is_paid))
      if (user.payment_status) localStorage.setItem('mdefender_payment_status', user.payment_status)
      if (user.name) localStorage.setItem('mdefender_user_name', user.name)
      if (user.trial_days_remaining !== undefined) localStorage.setItem('mdefender_trial_days', String(user.trial_days_remaining))
      if (user.trial_ends_at) localStorage.setItem('mdefender_trial_ends_at', String(user.trial_ends_at))
      if (user.created_at) localStorage.setItem('mdefender_user_created_at', String(user.created_at))
      userStore.prefetchUserData(api)
    }).catch(() => {
      setAdminUser(null)
      setUserState(null)
      userStore.remove('profile')
      userStore.remove('admin_profile')
      api.clearTokens()
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

          <Route path="/team/accept" element={<AcceptTeamInvite />} />
          <Route path="/register" element={
            (userState && typeof localStorage !== 'undefined' && !!localStorage.getItem('mdefender_access')) ? <Navigate to={getPostLoginTarget(userState)} replace /> : <Register />
          } />
          <Route path="/user/login" element={
            (userState && typeof localStorage !== 'undefined' && !!localStorage.getItem('mdefender_access')) ? <Navigate to={getPostLoginTarget(userState)} replace /> : <UserLogin onLoginSuccess={(u) => setUserState(u)} />
          } />
          <Route path="/login" element={
            (userState && typeof localStorage !== 'undefined' && !!localStorage.getItem('mdefender_access')) ? <Navigate to={getPostLoginTarget(userState)} replace /> : <UserLogin onLoginSuccess={(u) => setUserState(u)} />
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
          <Route path="domains" element={<UserRoleRoute user={userState} ownerOnly><Navigate to="/user/websites" replace /></UserRoleRoute>} />
          <Route path="websites" element={<UserRoleRoute user={userState} ownerOnly><UserWebsites /></UserRoleRoute>} />
          <Route path="bulk-management" element={<Navigate to="/user/monitoring/uptime" replace />} />
          <Route path="bulk" element={<Navigate to="/user/monitoring/uptime" replace />} />
          <Route path="bulk/monitoring" element={<Navigate to="/user/monitoring/uptime" replace />} />
          <Route path="monitoring" element={<Navigate to="/user/monitoring/uptime" replace />} />
          <Route path="monitoring/uptime" element={<BulkUptime />} />
          <Route path="monitoring/performance" element={<BulkPerformance />} />
          <Route path="monitoring/broken-links" element={<BulkBrokenLinks />} />
          <Route path="monitoring/blacklist" element={<BulkBlacklist />} />
          <Route path="security/bot-shield" element={<UserRoleRoute user={userState} allowedRoles={['secops']}><UserTools activeMode="bot_shield" isBulk={true} /></UserRoleRoute>} />
          <Route path="security/bot-defense" element={<UserRoleRoute user={userState} allowedRoles={['secops']}><UserTools activeMode="bot_shield" isBulk={true} /></UserRoleRoute>} />
          <Route path="security/login-gateway" element={<UserRoleRoute user={userState} allowedRoles={['secops']}><BulkLoginGateway /></UserRoleRoute>} />
          <Route path="security/rate-limits" element={<UserRoleRoute user={userState} allowedRoles={['secops']}><UserTools activeMode="rate_limits" isBulk={true} /></UserRoleRoute>} />
          <Route path="security/2fa" element={<UserRoleRoute user={userState} allowedRoles={['secops']}><UserTools activeMode="twofactor" isBulk={true} /></UserRoleRoute>} />
          <Route path="security/post-hack" element={<UserRoleRoute user={userState} allowedRoles={['secops']}><BulkPostHack /></UserRoleRoute>} />
          <Route path="security/incident-response" element={<UserRoleRoute user={userState} allowedRoles={['secops']}><BulkPostHack /></UserRoleRoute>} />
          <Route path="bulk/posthack" element={<UserRoleRoute user={userState} allowedRoles={['secops']}><BulkPostHack /></UserRoleRoute>} />
          <Route path="security/threat-intelligence" element={<UserRoleRoute user={userState} allowedRoles={['secops']}><UserTools activeMode="whois" isBulk={true} /></UserRoleRoute>} />
          <Route path="security/port-scanner" element={<UserRoleRoute user={userState} allowedRoles={['secops']}><SecurityPortScanner /></UserRoleRoute>} />
          <Route path="security/breach-intelligence" element={<UserRoleRoute user={userState} allowedRoles={['secops']}><BulkBreachIntelligence /></UserRoleRoute>} />
          <Route path="security/hibp" element={<UserRoleRoute user={userState} allowedRoles={['secops']}><BulkBreachIntelligence /></UserRoleRoute>} />
          <Route path="security/pwned" element={<UserRoleRoute user={userState} allowedRoles={['secops']}><BulkBreachIntelligence /></UserRoleRoute>} />
          <Route path="bulk/breach-intelligence" element={<UserRoleRoute user={userState} allowedRoles={['secops']}><BulkBreachIntelligence /></UserRoleRoute>} />
          <Route path="bulk/plugins" element={<UserRoleRoute user={userState} allowedRoles={['devops', 'secops']}><BulkPlugins /></UserRoleRoute>} />
          <Route path="bulk/themes" element={<UserRoleRoute user={userState} allowedRoles={['devops', 'secops']}><BulkThemes /></UserRoleRoute>} />
          <Route path="bulk/core" element={<UserRoleRoute user={userState} allowedRoles={['devops', 'secops']}><BulkCore /></UserRoleRoute>} />
          <Route path="bulk/backup" element={<UserRoleRoute user={userState} allowedRoles={['devops', 'secops']}><BulkBackup /></UserRoleRoute>} />
          <Route path="backup" element={<UserRoleRoute user={userState} allowedRoles={['devops', 'secops']}><BulkBackup /></UserRoleRoute>} />
          <Route path="backups" element={<UserRoleRoute user={userState} allowedRoles={['devops', 'secops']}><BulkBackup /></UserRoleRoute>} />
          <Route path="bulk/backups" element={<UserRoleRoute user={userState} allowedRoles={['devops', 'secops']}><BulkBackup /></UserRoleRoute>} />
          <Route path="bulk/scanner" element={<UserRoleRoute user={userState} allowedRoles={['secops']}><BulkScanner /></UserRoleRoute>} />
          <Route path="bulk/hardening" element={<UserRoleRoute user={userState} allowedRoles={['secops']}><BulkHardening /></UserRoleRoute>} />
          <Route path="bulk/safe-updates" element={<UserRoleRoute user={userState} allowedRoles={['devops', 'secops']}><BulkSafeUpdates /></UserRoleRoute>} />
          <Route path="safe-updates" element={<UserRoleRoute user={userState} allowedRoles={['devops', 'secops']}><Navigate to="/user/bulk/safe-updates" replace /></UserRoleRoute>} />
          <Route path="bulk/database" element={<UserRoleRoute user={userState} allowedRoles={['devops', 'secops']}><BulkDatabase /></UserRoleRoute>} />
          <Route path="database" element={<UserRoleRoute user={userState} allowedRoles={['devops', 'secops']}><Navigate to="/user/bulk/database" replace /></UserRoleRoute>} />
          <Route path="bulk/environment" element={<UserRoleRoute user={userState} allowedRoles={['secops']}><Navigate to="/user/bulk/hardening?tab=environment" replace /></UserRoleRoute>} />
          <Route path="environment" element={<UserRoleRoute user={userState} allowedRoles={['secops']}><Navigate to="/user/bulk/hardening?tab=environment" replace /></UserRoleRoute>} />
          <Route path="bulk/site-health" element={<Navigate to="/user/monitoring/performance" replace />} />
          <Route path="bulk/activity" element={<UserRoleRoute user={userState} ownerOnly><BulkActivity /></UserRoleRoute>} />
          <Route path="activity" element={<UserRoleRoute user={userState} ownerOnly><Navigate to="/user/bulk/activity" replace /></UserRoleRoute>} />
          <Route path="activity-logs" element={<UserRoleRoute user={userState} ownerOnly><Navigate to="/user/bulk/activity" replace /></UserRoleRoute>} />
          <Route path="audit-logs" element={<UserRoleRoute user={userState} ownerOnly><Navigate to="/user/bulk/activity" replace /></UserRoleRoute>} />
          <Route path="bulk/tools" element={<LegacyToolsRedirect />} />
          <Route path="team" element={<UserRoleRoute user={userState} ownerOnly><UserTeam /></UserRoleRoute>} />
          <Route path="alerts" element={<UserAlerts />} />
          <Route path="reports" element={<UserReports />} />
          <Route path="tools" element={<LegacyToolsRedirect />} />
          <Route path="connect" element={<UserRoleRoute user={userState} ownerOnly><Navigate to="/user/websites" replace /></UserRoleRoute>} />
          <Route path="pricing" element={<UserRoleRoute user={userState} ownerOnly><UserPricing /></UserRoleRoute>} />
          <Route path="plans" element={<UserRoleRoute user={userState} ownerOnly><Navigate to="/user/pricing" replace /></UserRoleRoute>} />
          <Route path="blacklist" element={<UserRoleRoute user={userState} allowedRoles={['secops']}><UserBlacklist activeMode="ip" /></UserRoleRoute>} />
          <Route path="access/ip-blocklist" element={<UserRoleRoute user={userState} allowedRoles={['secops']}><UserBlacklist activeMode="ip" /></UserRoleRoute>} />
          <Route path="access/ip-allowlist" element={<UserRoleRoute user={userState} allowedRoles={['secops']}><UserBlacklist activeMode="whitelist" /></UserRoleRoute>} />
          <Route path="access/country-blocking" element={<UserRoleRoute user={userState} allowedRoles={['secops']}><UserBlacklist activeMode="country" /></UserRoleRoute>} />
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
          <Route path="users" element={<AdminPermRoute user={adminUser} perm="users.view"><AdminUsers /></AdminPermRoute>} />
          <Route path="pricing" element={<AdminPermRoute user={adminUser} perm="owner_only"><AdminPricing /></AdminPermRoute>} />
          <Route path="clients" element={<AdminPermRoute user={adminUser} perm="users.view"><Clients /></AdminPermRoute>} />
          <Route path="websites" element={<AdminPermRoute user={adminUser} perm="users.view"><Clients /></AdminPermRoute>} />
          <Route path="rules" element={<AdminPermRoute user={adminUser} perm="owner_only"><Rules /></AdminPermRoute>} />
          <Route path="settings" element={<Settings />} />
          <Route path="learning" element={<AdminPermRoute user={adminUser} perm="owner_only"><AttackLearning /></AdminPermRoute>} />
          <Route path="ddos" element={<AdminPermRoute user={adminUser} perm="owner_only"><DDoSDashboard /></AdminPermRoute>} />
          <Route path="support" element={<AdminPermRoute user={adminUser} perm="support.tickets"><AdminSupport /></AdminPermRoute>} />
          <Route path="support/inquiries" element={<AdminPermRoute user={adminUser} perm="support.tickets"><AdminSupport /></AdminPermRoute>} />
          <Route path="support/inspector" element={<AdminPermRoute user={adminUser} perm="support.inspector"><AdminInspector /></AdminPermRoute>} />
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
