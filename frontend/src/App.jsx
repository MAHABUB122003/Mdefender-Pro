import { useState, useEffect } from 'react'
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
import Register from './pages/Register'
import UserLogin from './pages/UserLogin'
import UserDashboard from './pages/UserDashboard'
import UserWebsites from './pages/UserWebsites'
import UserLogs from './pages/UserLogs'
import UserRules from './pages/UserRules'
import UserSettings from './pages/UserSettings'
import Finance from './pages/Finance'
import NoticeBoard from './pages/NoticeBoard'
import Docs from './pages/Docs'

function App() {
  const [token, setToken] = useState(localStorage.getItem('mdefender_token'))

  const login = (newToken) => {
    localStorage.setItem('mdefender_token', newToken)
    setToken(newToken)
  }

  const logout = () => {
    localStorage.removeItem('mdefender_token')
    setToken(null)
  }

  const [userToken, setUserToken] = useState(localStorage.getItem('mdefender_user_token'))

  useEffect(() => {
    const handler = () => setUserToken(localStorage.getItem('mdefender_user_token'))
    window.addEventListener('userTokenChanged', handler)
    return () => window.removeEventListener('userTokenChanged', handler)
  }, [])

  const userLogout = () => {
    localStorage.removeItem('mdefender_user_token')
    localStorage.removeItem('mdefender_user_plan')
    localStorage.removeItem('mdefender_user_name')
    setUserToken(null)
    window.location.href = '/user/login'
  }

  return (
    <Routes>
      {/* Public pages */}
      <Route path="/" element={<Landing />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/docs" element={<Docs />} />
      <Route path="/register" element={<Register />} />
      <Route path="/blocked" element={<BlockPage />} />

      {/* User routes */}
      <Route path="/user/login" element={<UserLogin />} />
      <Route path="/user/dashboard" element={
        userToken ? <UserLayout onLogout={userLogout}><UserDashboard /></UserLayout> : <Navigate to="/user/login" replace />
      } />
      <Route path="/user/logs" element={
        userToken ? <UserLayout onLogout={userLogout}><UserLogs /></UserLayout> : <Navigate to="/user/login" replace />
      } />
      <Route path="/user/rules" element={
        userToken ? <UserLayout onLogout={userLogout}><UserRules /></UserLayout> : <Navigate to="/user/login" replace />
      } />
      <Route path="/user/websites" element={
        userToken ? <UserLayout onLogout={userLogout}><UserWebsites /></UserLayout> : <Navigate to="/user/login" replace />
      } />
      <Route path="/user/finance" element={
        userToken ? <UserLayout onLogout={userLogout}><Finance /></UserLayout> : <Navigate to="/user/login" replace />
      } />
      <Route path="/user/notices" element={
        userToken ? <UserLayout onLogout={userLogout}><NoticeBoard /></UserLayout> : <Navigate to="/user/login" replace />
      } />
      <Route path="/user/settings" element={
        userToken ? <UserLayout onLogout={userLogout}><UserSettings /></UserLayout> : <Navigate to="/user/login" replace />
      } />

      {/* Admin routes */}
      {!token ? (
        <>
          <Route path="/admin/login" element={<Login onLogin={login} />} />
          <Route path="/admin/*" element={<Navigate to="/admin/login" replace />} />
        </>
      ) : (
        <>
          <Route path="/admin/login" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={
            <Layout onLogout={logout}>
              <Dashboard token={token} />
            </Layout>
          } />
          <Route path="/admin/logs" element={
            <Layout onLogout={logout}>
              <Logs token={token} />
            </Layout>
          } />
          <Route path="/admin/rules" element={
            <Layout onLogout={logout}>
              <Rules token={token} />
            </Layout>
          } />
          <Route path="/admin/clients" element={
            <Layout onLogout={logout}>
              <Clients token={token} />
            </Layout>
          } />
          <Route path="/admin/blacklist" element={
            <Layout onLogout={logout}>
              <Blacklist token={token} />
            </Layout>
          } />
          <Route path="/admin/settings" element={
            <Layout onLogout={logout}>
              <Settings token={token} />
            </Layout>
          } />
          <Route path="/admin/finance" element={
            <Layout onLogout={logout}>
              <Finance />
            </Layout>
          } />
          <Route path="/admin/notices" element={
            <Layout onLogout={logout}>
              <NoticeBoard />
            </Layout>
          } />
          <Route path="/connect" element={
            <Layout onLogout={logout}>
              <Connect token={token} />
            </Layout>
          } />
        </>
      )}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
