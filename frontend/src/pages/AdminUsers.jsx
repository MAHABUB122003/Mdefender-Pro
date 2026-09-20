import { useState, useEffect, useCallback } from 'react'
import api from '../api/api'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [metrics, setMetrics] = useState({
    total_users: 0,
    verified_users: 0,
    pro_users: 0,
    locked_users: 0,
    suspended_users: 0,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState('all') // all, active, locked, unverified, pro, suspended
  const [selectedUser, setSelectedUser] = useState(null)
  const [modalType, setModalType] = useState(null) // 'plan', 'role', 'details', null
  const [actionLoading, setActionLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  // Plan modal form state
  const [planForm, setPlanForm] = useState({ plan: 'pro', durationDays: 30 })
  // Role modal form state
  const [roleForm, setRoleForm] = useState({ role: 'user' })

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const params = {}
      if (search) params.q = search
      if (filterTab !== 'all') {
        if (filterTab === 'active') params.status = 'active'
        else if (filterTab === 'suspended') params.status = 'suspended'
        else if (filterTab === 'unverified') params.status = 'unverified'
        else if (filterTab === 'verified') params.status = 'verified'
        else if (filterTab === 'pro') params.plan = 'pro'
      }

      const res = await api.adminGetUsers(params)
      if (res && res.data) {
        setUsers(res.data.users || [])
        if (res.data.metrics) setMetrics(res.data.metrics)
      } else if (Array.isArray(res)) {
        setUsers(res)
      }
    } catch (err) {
      console.error(err)
      showToast('Failed to fetch users list', true)
    } finally {
      setLoading(false)
    }
  }, [search, filterTab])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers()
    }, 300)
    return () => clearTimeout(timer)
  }, [fetchUsers])

  // ================= ACTION HANDLERS =================

  const handleUnlock = async (user) => {
    if (!confirm(`Unlock account for ${user.email}? This will reset failed login attempts.`)) return
    try {
      setActionLoading(true)
      await api.adminUnlockUser(user.id)
      showToast(`Account for ${user.email} unlocked successfully!`)
      fetchUsers()
    } catch (err) {
      showToast(err.message || 'Failed to unlock user', true)
    } finally {
      setActionLoading(false)
    }
  }

  const handleVerifyEmail = async (user) => {
    if (!confirm(`Manually verify email address for ${user.email}?`)) return
    try {
      setActionLoading(true)
      await api.adminVerifyUserEmail(user.id)
      showToast(`Email for ${user.email} verified!`)
      fetchUsers()
    } catch (err) {
      showToast(err.message || 'Failed to verify email', true)
    } finally {
      setActionLoading(false)
    }
  }

  const handleResetApiKey = async (user) => {
    if (!confirm(`Regenerate API Key for ${user.email}? Their existing integrations will need the new key.`)) return
    try {
      setActionLoading(true)
      const res = await api.adminResetUserApiKey(user.id)
      const newKey = res?.data?.api_key || res?.api_key
      if (newKey) {
        navigator.clipboard.writeText(newKey)
        showToast(`New API Key generated and copied to clipboard!`)
      } else {
        showToast(`API Key regenerated!`)
      }
      fetchUsers()
    } catch (err) {
      showToast(err.message || 'Failed to reset API key', true)
    } finally {
      setActionLoading(false)
    }
  }

  const handleResetMFA = async (user) => {
    if (!confirm(`Disable Two-Factor Authentication (2FA) for ${user.email}?`)) return
    try {
      setActionLoading(true)
      await api.adminResetUserMFA(user.id)
      showToast(`2FA disabled for ${user.email}.`)
      fetchUsers()
    } catch (err) {
      showToast(err.message || 'Failed to reset 2FA', true)
    } finally {
      setActionLoading(false)
    }
  }

  const handleForceLogout = async (user) => {
    if (!confirm(`Terminate all active sessions for ${user.email}?`)) return
    try {
      setActionLoading(true)
      await api.adminForceLogoutUser(user.id)
      showToast(`All sessions terminated for ${user.email}.`)
      fetchUsers()
    } catch (err) {
      showToast(err.message || 'Failed to force logout', true)
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleSuspend = async (user) => {
    const isSuspended = user.status === 'suspended' || user.is_active === false
    const actionName = isSuspended ? 'restore' : 'suspend'
    if (!confirm(`${actionName.toUpperCase()} user account for ${user.email}?`)) return
    try {
      setActionLoading(true)
      if (isSuspended) {
        await api.adminRestoreUser(user.id)
        showToast(`User ${user.email} activated.`)
      } else {
        await api.adminSuspendUser(user.id)
        showToast(`User ${user.email} suspended.`)
      }
      fetchUsers()
    } catch (err) {
      showToast(err.message || `Failed to ${actionName} user`, true)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteUser = async (user) => {
    if (!confirm(`⚠️ DANGER: Completely delete user ${user.email} and all their connected websites/keys? This cannot be undone.`)) return
    try {
      setActionLoading(true)
      await api.adminDeleteUser(user.id)
      showToast(`User ${user.email} deleted.`)
      if (selectedUser?.id === user.id) setSelectedUser(null)
      fetchUsers()
    } catch (err) {
      showToast(err.message || 'Failed to delete user', true)
    } finally {
      setActionLoading(false)
    }
  }

  const openPlanModal = (user) => {
    setSelectedUser(user)
    setPlanForm({ plan: user.plan || 'pro', durationDays: 30 })
    setModalType('plan')
  }

  const handleSavePlan = async (e) => {
    e.preventDefault()
    if (!selectedUser) return
    try {
      setActionLoading(true)
      await api.adminUpdateUserPlan(selectedUser.id, planForm.plan, Number(planForm.durationDays))
      showToast(`Plan updated to ${planForm.plan.toUpperCase()} for ${selectedUser.email}!`)
      setModalType(null)
      fetchUsers()
    } catch (err) {
      showToast(err.message || 'Failed to update plan', true)
    } finally {
      setActionLoading(false)
    }
  }

  const openRoleModal = (user) => {
    setSelectedUser(user)
    setRoleForm({ role: user.role || 'user' })
    setModalType('role')
  }

  const handleSaveRole = async (e) => {
    e.preventDefault()
    if (!selectedUser) return
    try {
      setActionLoading(true)
      await api.adminUpdateUserRole(selectedUser.id, roleForm.role)
      showToast(`Role updated to ${roleForm.role.toUpperCase()} for ${selectedUser.email}!`)
      setModalType(null)
      fetchUsers()
    } catch (err) {
      showToast(err.message || 'Failed to update role', true)
    } finally {
      setActionLoading(false)
    }
  }

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text)
    showToast(`${label} copied to clipboard!`)
  }

  return (
    <div className="admin-users-page" style={{ padding: '4px 0 40px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: toastMessage.isError ? '#ef4444' : '#10b981',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          zIndex: 9999,
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'slideIn 0.2s ease-out'
        }}>
          <i className={`fas ${toastMessage.isError ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
          {toastMessage.text}
        </div>
      )}

      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fas fa-users-gear" style={{ color: '#3b82f6' }}></i>
            User Management & Support Center
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0' }}>
            Manage platform accounts, resolve login lockouts, manually verify emails, and grant plan upgrades.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={fetchUsers}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <i className={`fas fa-arrows-rotate ${loading ? 'fa-spin' : ''}`}></i>
          Refresh Users
        </button>
      </div>

      {/* Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div className="stat-card" style={{ padding: '16px 20px', background: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '13px' }}>
            <span>Total Registered</span>
            <i className="fas fa-users" style={{ color: '#3b82f6' }}></i>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#f8fafc', marginTop: '6px' }}>
            {metrics.total_users}
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px 20px', background: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '13px' }}>
            <span>Verified Accounts</span>
            <i className="fas fa-envelope-circle-check" style={{ color: '#10b981' }}></i>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981', marginTop: '6px' }}>
            {metrics.verified_users}
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px 20px', background: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '13px' }}>
            <span>Pro / Paid Users</span>
            <i className="fas fa-crown" style={{ color: '#f59e0b' }}></i>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#f59e0b', marginTop: '6px' }}>
            {metrics.pro_users}
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px 20px', background: '#0f172a', border: metrics.locked_users > 0 ? '1px solid #ef4444' : '1px solid #1e293b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '13px' }}>
            <span>Locked Out Accounts</span>
            <i className="fas fa-lock" style={{ color: '#ef4444' }}></i>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: metrics.locked_users > 0 ? '#ef4444' : '#94a3b8', marginTop: '6px' }}>
            {metrics.locked_users}
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px 20px', background: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '13px' }}>
            <span>Suspended</span>
            <i className="fas fa-user-slash" style={{ color: '#64748b' }}></i>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#cbd5e1', marginTop: '6px' }}>
            {metrics.suspended_users}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={{
        background: '#0f172a',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid #1e293b',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'All Users', icon: 'fa-users' },
            { key: 'active', label: 'Active', icon: 'fa-check' },
            { key: 'unverified', label: 'Unverified Email', icon: 'fa-envelope-open' },
            { key: 'pro', label: 'Pro / Enterprise', icon: 'fa-crown' },
            { key: 'suspended', label: 'Suspended', icon: 'fa-ban' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                border: filterTab === tab.key ? '1px solid #3b82f6' : '1px solid #1e293b',
                background: filterTab === tab.key ? 'rgba(59, 130, 246, 0.15)' : '#1e293b',
                color: filterTab === tab.key ? '#60a5fa' : '#94a3b8',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className={`fas ${tab.icon}`}></i>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '260px', flex: '1', maxWidth: '400px' }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }}></i>
          <input
            type="text"
            placeholder="Search by email, name, username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '8px',
              border: '1px solid #1e293b',
              background: '#070b14',
              color: '#f8fafc',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Users Table */}
      <div style={{
        background: '#0f172a',
        borderRadius: '12px',
        border: '1px solid #1e293b',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '14px 18px', fontWeight: '700' }}>User Profile</th>
                <th style={{ padding: '14px 18px', fontWeight: '700' }}>Role</th>
                <th style={{ padding: '14px 18px', fontWeight: '700' }}>Account Status</th>
                <th style={{ padding: '14px 18px', fontWeight: '700' }}>Subscription Plan</th>
                <th style={{ padding: '14px 18px', fontWeight: '700' }}>Websites</th>
                <th style={{ padding: '14px 18px', fontWeight: '700' }}>Registered / Last Active</th>
                <th style={{ padding: '14px 18px', fontWeight: '700', textAlign: 'right' }}>Quick Actions & Fixes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginRight: '10px' }}></i>
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                    No users matching criteria found.
                  </td>
                </tr>
              ) : (
                users.map(u => {
                  const isSuspended = u.status === 'suspended' || u.is_active === false
                  const isPro = ['pro', 'premium', 'go', 'enterprise'].includes(u.plan?.toLowerCase())
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid #1e293b', transition: 'background 0.15s' }}>
                      {/* User Profile */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: isPro ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            fontSize: '14px'
                          }}>
                            {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: '#f8fafc' }}>
                              {u.name || u.full_name || u.username || 'User'}
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{u.email}</span>
                              <i
                                className="fas fa-copy"
                                style={{ cursor: 'pointer', color: '#64748b' }}
                                title="Copy Email"
                                onClick={() => copyToClipboard(u.email, 'Email')}
                              ></i>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          padding: '3px 9px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          background: u.role === 'super_admin' ? 'rgba(239, 68, 68, 0.15)' : u.role === 'admin' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                          color: u.role === 'super_admin' ? '#f87171' : u.role === 'admin' ? '#a78bfa' : '#94a3b8',
                          border: u.role === 'super_admin' ? '1px solid rgba(239, 68, 68, 0.3)' : 'none'
                        }}>
                          {u.role || 'user'}
                        </span>
                      </td>

                      {/* Account Status */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className={`status-dot ${isSuspended ? 'red' : 'green'}`}></span>
                            <span style={{ color: isSuspended ? '#ef4444' : '#10b981', fontWeight: '600' }}>
                              {isSuspended ? 'Suspended' : 'Active'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {u.email_verified ? (
                              <span style={{ fontSize: '10px', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                <i className="fas fa-check"></i> Email Verified
                              </span>
                            ) : (
                              <span style={{ fontSize: '10px', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                <i className="fas fa-clock"></i> Unverified
                              </span>
                            )}
                            {u.is_locked && (
                              <span style={{ fontSize: '10px', color: '#ef4444', background: 'rgba(239,68,68,0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                <i className="fas fa-lock"></i> Locked Out
                              </span>
                            )}
                            {u.mfa_enabled && (
                              <span style={{ fontSize: '10px', color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                <i className="fas fa-shield"></i> 2FA
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Subscription Plan */}
                      <td style={{ padding: '14px 18px' }}>
                        <div>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            background: isPro ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                            color: isPro ? '#fbbf24' : '#60a5fa',
                            border: isPro ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(59, 130, 246, 0.2)'
                          }}>
                            {u.plan || 'Free'}
                          </span>
                          {u.plan_expires && (
                            <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
                              Exp: {u.plan_expires}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Websites */}
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ fontWeight: '700', color: '#f8fafc' }}>
                          {u.websites_count || 0}
                        </span>
                        <span style={{ color: '#64748b', fontSize: '12px' }}> sites</span>
                      </td>

                      {/* Timestamps */}
                      <td style={{ padding: '14px 18px', color: '#94a3b8', fontSize: '12px' }}>
                        <div>Joined: {u.created_at ? u.created_at.slice(0, 10) : '—'}</div>
                        <div style={{ color: '#64748b', fontSize: '11px' }}>
                          Active: {u.last_login ? u.last_login.slice(0, 16) : 'Never'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {/* Quick Issue Fix: Unlock Account */}
                          {u.is_locked && (
                            <button
                              onClick={() => handleUnlock(u)}
                              disabled={actionLoading}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                background: '#ef4444',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                              title="Instantly clear brute force lockout"
                            >
                              <i className="fas fa-lock-open"></i> Unlock
                            </button>
                          )}

                          {/* Quick Issue Fix: Verify Email */}
                          {!u.email_verified && (
                            <button
                              onClick={() => handleVerifyEmail(u)}
                              disabled={actionLoading}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                background: '#10b981',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                              title="Force verify email if activation link was lost"
                            >
                              <i className="fas fa-envelope-circle-check"></i> Verify Email
                            </button>
                          )}

                          {/* Plan Modal Trigger */}
                          <button
                            onClick={() => openPlanModal(u)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              background: '#1e293b',
                              color: '#fbbf24',
                              border: '1px solid #334155',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                            title="Upgrade or change subscription plan"
                          >
                            <i className="fas fa-crown"></i> Plan
                          </button>

                          {/* Role Modal Trigger */}
                          <button
                            onClick={() => openRoleModal(u)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              background: '#1e293b',
                              color: '#94a3b8',
                              border: '1px solid #334155',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                            title="Change user role"
                          >
                            <i className="fas fa-user-shield"></i> Role
                          </button>

                          {/* Reset API Key */}
                          <button
                            onClick={() => handleResetApiKey(u)}
                            disabled={actionLoading}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              background: '#1e293b',
                              color: '#60a5fa',
                              border: '1px solid #334155',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                            title="Regenerate API key"
                          >
                            <i className="fas fa-key"></i>
                          </button>

                          {/* Reset MFA */}
                          {u.mfa_enabled && (
                            <button
                              onClick={() => handleResetMFA(u)}
                              disabled={actionLoading}
                              style={{
                                padding: '5px 8px',
                                borderRadius: '6px',
                                background: '#1e293b',
                                color: '#f87171',
                                border: '1px solid #334155',
                                fontSize: '11px',
                                cursor: 'pointer'
                              }}
                              title="Reset 2FA"
                            >
                              <i className="fas fa-shield-slash"></i>
                            </button>
                          )}

                          {/* Force Logout */}
                          <button
                            onClick={() => handleForceLogout(u)}
                            disabled={actionLoading}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              background: '#1e293b',
                              color: '#f59e0b',
                              border: '1px solid #334155',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                            title="Kill active sessions"
                          >
                            <i className="fas fa-right-from-bracket"></i>
                          </button>

                          {/* Suspend / Unsuspend */}
                          <button
                            onClick={() => handleToggleSuspend(u)}
                            disabled={actionLoading}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              background: '#1e293b',
                              color: isSuspended ? '#10b981' : '#ef4444',
                              border: '1px solid #334155',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                            title={isSuspended ? 'Activate User' : 'Suspend User'}
                          >
                            <i className={`fas ${isSuspended ? 'fa-user-check' : 'fa-user-slash'}`}></i>
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={actionLoading}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              background: 'rgba(239,68,68,0.1)',
                              color: '#ef4444',
                              border: '1px solid rgba(239,68,68,0.3)',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                            title="Delete user permanently"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Management Modal */}
      {modalType === 'plan' && selectedUser && (
        <div className="modal" style={{ display: 'flex' }} onClick={() => setModalType(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <span className="close" onClick={() => setModalType(null)}>&times;</span>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-crown" style={{ color: '#fbbf24' }}></i>
              Manage Subscription Plan
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
              Set plan tier and access duration for <strong>{selectedUser.email}</strong>.
            </p>

            <form onSubmit={handleSavePlan}>
              <div className="form-group">
                <label>Select Plan Tier</label>
                <select
                  value={planForm.plan}
                  onChange={(e) => setPlanForm({ ...planForm, plan: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc' }}
                >
                  <option value="free">Starter Free ($0)</option>
                  <option value="go">Developer Go ($9/mo - 5 Websites)</option>
                  <option value="pro">Enterprise Pro ($29/mo - 25 Websites & 5.2M ML)</option>
                  <option value="enterprise">Dedicated Enterprise ($99/mo - Unlimited)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Access Validity</label>
                <select
                  value={planForm.durationDays}
                  onChange={(e) => setPlanForm({ ...planForm, durationDays: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc' }}
                >
                  <option value="30">30 Days (1 Month)</option>
                  <option value="90">90 Days (3 Months)</option>
                  <option value="180">180 Days (6 Months)</option>
                  <option value="365">365 Days (1 Year)</option>
                  <option value="3650">10 Years (Lifetime)</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={actionLoading}
                style={{ width: '100%', marginTop: '10px' }}
              >
                {actionLoading ? 'Saving...' : 'Apply Plan Update'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Role Management Modal */}
      {modalType === 'role' && selectedUser && (
        <div className="modal" style={{ display: 'flex' }} onClick={() => setModalType(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <span className="close" onClick={() => setModalType(null)}>&times;</span>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-user-shield" style={{ color: '#3b82f6' }}></i>
              Change Account Role
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
              Adjust platform permissions for <strong>{selectedUser.email}</strong>.
            </p>

            <form onSubmit={handleSaveRole}>
              <div className="form-group">
                <label>User Role</label>
                <select
                  value={roleForm.role}
                  onChange={(e) => setRoleForm({ role: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc' }}
                >
                  <option value="user">Standard User (Dashboard & API Access)</option>
                  <option value="admin">Platform Admin (WAF & Logs)</option>
                  <option value="super_admin">Super Admin (Full Root Control)</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={actionLoading}
                style={{ width: '100%', marginTop: '10px' }}
              >
                {actionLoading ? 'Updating Role...' : 'Save Role'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
