import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Logs from './pages/Logs'
import Rules from './pages/Rules'
import Clients from './pages/Clients'
import Blacklist from './pages/Blacklist'
import Settings from './pages/Settings'
import Connect from './pages/Connect'
import BlockPage from './pages/BlockPage'
import Layout from './components/Layout'
import UserLayout from './components/UserLayout'
import Landing from './pages/Landing'
import Pricing from './pages/Pricing'
import Blog from './pages/Blog'
import Register from './pages/Register'
import UserLogin from './pages/UserLogin'
import UserDashboard from './pages/UserDashboard'
import UserWebsites from './pages/UserWebsites'
import UserLogs from './pages/UserLogs'
import UserRules from './pages/UserRules'
import UserSettings from './pages/UserSettings'
import UserConnect from './pages/UserConnect'
import UserBlacklist from './pages/UserBlacklist'
import DDoSDashboard from './pages/DDoSDashboard'
import NoticeBoard from './pages/NoticeBoard'
import Docs from './pages/Docs'
import VerifyEmail from './pages/auth/VerifyEmail'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import GoogleCallback from './pages/auth/GoogleCallback'
import SessionsPage from './pages/auth/Sessions'
import PaymentSuccess from './pages/PaymentSuccess'

import api from './api/api'

import userStore from './utils/userStore'

function App() {
  const [adminUser, setAdminUser] = useState(null)
  const [adminLoading, setAdminLoading] = useState(true)
  const [userState, setUserState] = useState(null)
  const [userLoading, setUserLoading] = useState(true)

  useEffect(() => {
    api.getMe().then(data => {
      const user = data.user
      if (user.role === 'super_admin') {
        setAdminUser(user)
      }
      setUserState(user)
      userStore.set('profile', user)
      if (user.plan) localStorage.setItem('mdefender_user_plan', user.plan)
      if (user.name) localStorage.setItem('mdefender_user_name', user.name)
      userStore.prefetchUserData(api)
    }).catch(() => {
      setAdminUser(null)
      setUserState(null)
    }).finally(() => {
      setAdminLoading(false)
      setUserLoading(false)
    })
  }, [])

  const adminLogout = useCallback(async () => {
    try { await api.logout() } catch {}
    setAdminUser(null)
    window.location.href = '/admin/login'
  }, [])

  const userLogout = useCallback(async () => {
    try { await api.logout() } catch {}
    setUserState(null)
    window.location.href = '/user/login'
  }, [])

  if (adminLoading || userLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/docs" element={<Docs />} />
      <Route path="/blocked" element={<BlockPage />} />

      <Route path="/auth/verify-email" element={<VerifyEmail />} />
      <Route path="/auth/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/reset-password" element={<ResetPassword />} />
      <Route path="/auth/google/callback" element={<GoogleCallback />} />

      <Route path="/register" element={
        userState ? <Navigate to="/user/dashboard" replace /> : <Register />
      } />
      <Route path="/user/login" element={
        userState ? <Navigate to="/user/dashboard" replace /> : <UserLogin />
      } />

      {/* Persistent User Layout with 0ms Instant Page Switching */}
      <Route path="/user" element={
        userState ? <UserLayout onLogout={userLogout} /> : <Navigate to="/user/login" replace />
      }>
        <Route index element={<Navigate to="/user/dashboard" replace />} />
        <Route path="dashboard" element={<UserDashboard />} />
        <Route path="logs" element={<UserLogs />} />
        <Route path="rules" element={<UserRules />} />
        <Route path="websites" element={<UserWebsites />} />
        <Route path="connect" element={<UserConnect />} />
        <Route path="blacklist" element={<UserBlacklist />} />
        <Route path="settings" element={<UserSettings />} />
        <Route path="sessions" element={<SessionsPage />} />
      </Route>

      {!adminUser ? (
        <>
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin/*" element={<Navigate to="/admin/login" replace />} />
        </>
      ) : (
        <>
          <Route path="/admin/login" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<Layout onLogout={adminLogout}><Dashboard /></Layout>} />
          <Route path="/admin/logs" element={<Layout onLogout={adminLogout}><Logs /></Layout>} />
          <Route path="/admin/rules" element={<Layout onLogout={adminLogout}><Rules /></Layout>} />
          <Route path="/admin/clients" element={<Layout onLogout={adminLogout}><Clients /></Layout>} />
          <Route path="/admin/blacklist" element={<Layout onLogout={adminLogout}><Blacklist /></Layout>} />
          <Route path="/admin/settings" element={<Layout onLogout={adminLogout}><Settings /></Layout>} />
          <Route path="/admin/notices" element={<Layout onLogout={adminLogout}><NoticeBoard /></Layout>} />
          <Route path="/connect" element={<Layout onLogout={adminLogout}><Connect /></Layout>} />
          <Route path="/admin/ddos" element={<Layout onLogout={adminLogout}><DDoSDashboard /></Layout>} />
        </>
      )}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
