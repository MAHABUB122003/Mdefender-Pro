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
import Landing from './pages/Landing'
import Pricing from './pages/Pricing'
import Register from './pages/Register'
import UserLogin from './pages/UserLogin'
import UserDashboard from './pages/UserDashboard'
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
        localStorage.getItem('mdefender_user_token')
          ? <UserDashboard />
          : <Navigate to="/user/login" replace />
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
