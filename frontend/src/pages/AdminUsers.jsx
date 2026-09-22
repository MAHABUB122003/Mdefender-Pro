import { useState, useEffect, useCallback } from 'react'
import api from '../api/api'
import copyToClipboardUtil from '../utils/clipboard'

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
  const [modalType, setModalType] = useState(null) // 'plan', 'role', null
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
      const res = await api.adminGetAllUsers({ search, status: filterTab })
      if (res?.data) {
        setUsers(res.data.users || [])
        if (res.data.metrics) setMetrics(res.data.metrics)
      } else if (res?.users) {
        setUsers(res.users)
      }
    } catch (err) {
      console.error(err)
      showToast('Failed to load users list', true)
    } finally {
      setLoading(false)
    }
  }, [search, filterTab])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // ================= ACTION HANDLERS =================

  const handleUnlock = async (user) => {
    try {
      setActionLoading(true)
      await api.adminUnlockUser(user.id)
      showToast(`Account ${user.email} unlocked successfully!`)
      fetchUsers()
    } catch (err) {
      showToast(err.message || 'Failed to unlock user', true)
    } finally {
      setActionLoading(false)
    }
  }

  const handleVerifyEmail = async (user) => {
    try {
      setActionLoading(true)
      await api.adminVerifyUserEmail(user.id)
      showToast(`Email for ${user.email} marked verified!`)
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
        await copyToClipboardUtil(newKey)
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
    if (!confirm(`WARNING: Completely delete user ${user.email} and all their connected websites/keys? This action cannot be undone.`)) return
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

  const copyToClipboard = async (text, label) => {
    const ok = await copyToClipboardUtil(text)
    if (ok) {
      showToast(`${label} copied to clipboard!`)
    }
  }

  return (
    <>
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
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          zIndex: 9999,
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <i className={`fas ${toastMessage.isError ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
          {toastMessage.text}
        </div>
      )}

      {/* Page Header */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '19px'
          }}>
            <i className="fas fa-users-gear"></i>
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              User Management & Support Center
            </h1>
            <p style={{ color: '#64748b', fontSize: '12.5px', margin: '3px 0 0' }}>
              Manage platform accounts, unlock brute-force logins, force-verify emails, and manage plan tiers.
            </p>
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={fetchUsers}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12.5px',
            padding: '8px 16px'
          }}
        >
          <i className={`fas fa-arrows-rotate ${loading ? 'fa-spin' : ''}`}></i>
          Refresh Users
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon-wrap blue"><i className="fas fa-users"></i></div>
            <span className="stat-trend up"><i className="fas fa-arrow-up"></i> total</span>
          </div>
          <div className="stat-number">{metrics.total_users}</div>
          <div className="stat-label">Total Registered Users</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon-wrap green"><i className="fas fa-envelope-circle-check"></i></div>
            <span className="stat-trend up"><i className="fas fa-check"></i> verified</span>
          </div>
          <div className="stat-number">{metrics.verified_users}</div>
          <div className="stat-label">Verified Accounts</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon-wrap purple"><i className="fas fa-crown"></i></div>
            <span className="stat-trend up"><i className="fas fa-star"></i> pro</span>
          </div>
          <div className="stat-number">{metrics.pro_users}</div>
          <div className="stat-label">Pro / Paid Subscribers</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon-wrap red"><i className="fas fa-lock"></i></div>
            <span className={`stat-trend ${metrics.locked_users > 0 ? 'down' : 'up'}`}>
              <i className="fas fa-shield"></i> {metrics.locked_users > 0 ? 'action needed' : 'clean'}
            </span>
          </div>
          <div className="stat-number" style={{ color: metrics.locked_users > 0 ? '#dc2626' : '#0f172a' }}>
            {metrics.locked_users}
          </div>
          <div className="stat-label">Locked Out Accounts</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={{
        background: 'white',
        padding: '14px 18px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '14px',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'All Users', icon: 'fa-users' },
            { key: 'active', label: 'Active', icon: 'fa-check' },
            { key: 'unverified', label: 'Unverified Email', icon: 'fa-envelope-open' },
            { key: 'pro', label: 'Pro Subscribers', icon: 'fa-crown' },
            { key: 'suspended', label: 'Suspended', icon: 'fa-ban' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: '600',
                border: filterTab === tab.key ? '1px solid #2563eb' : '1px solid #e2e8f0',
                background: filterTab === tab.key ? '#eff6ff' : '#ffffff',
                color: filterTab === tab.key ? '#2563eb' : '#64748b',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s'
              }}
            >
              <i className={`fas ${tab.icon}`}></i>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '260px', flex: '1', maxWidth: '380px' }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }}></i>
          <input
            type="text"
            placeholder="Search email, name, username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Users Table */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 18px', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase' }}>User Profile</th>
                <th style={{ padding: '12px 18px', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase' }}>Role</th>
                <th style={{ padding: '12px 18px', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '12px 18px', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase' }}>Plan Tier</th>
                <th style={{ padding: '12px 18px', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase' }}>Websites</th>
                <th style={{ padding: '12px 18px', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase' }}>Registered / Active</th>
                <th style={{ padding: '12px 18px', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', textAlign: 'right' }}>Actions & Fixes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginRight: '10px', color: '#2563eb' }}></i>
                    Loading users list...
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
                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                      {/* User Profile */}
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: isPro ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #2563eb, #3b82f6)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            fontSize: '13px'
                          }}>
                            {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', color: '#0f172a' }}>
                              {u.name || u.full_name || u.username || 'User'}
                            </div>
                            <div style={{ color: '#64748b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{u.email}</span>
                              <i
                                className="fas fa-copy"
                                style={{ cursor: 'pointer', color: '#94a3b8' }}
                                title="Copy Email"
                                onClick={() => copyToClipboard(u.email, 'Email')}
                              ></i>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td style={{ padding: '12px 18px' }}>
                        <span className={`badge ${u.role === 'super_admin' ? 'danger' : u.role === 'admin' ? 'info' : 'warning'}`}>
                          {u.role || 'user'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className={`status-dot ${isSuspended ? 'red' : 'green'}`}></span>
                            <span style={{ color: isSuspended ? '#dc2626' : '#059669', fontWeight: '600', fontSize: '12px' }}>
                              {isSuspended ? 'Suspended' : 'Active'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {u.email_verified ? (
                              <span style={{ fontSize: '10.5px', color: '#059669', background: '#ecfdf5', padding: '1px 6px', borderRadius: '4px', fontWeight: '500' }}>
                                Verified
                              </span>
                            ) : (
                              <span style={{ fontSize: '10.5px', color: '#d97706', background: '#fffbeb', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
                                Unverified
                              </span>
                            )}
                            {u.is_locked && (
                              <span style={{ fontSize: '10.5px', color: '#dc2626', background: '#fef2f2', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                Locked Out
                              </span>
                            )}
                            {u.mfa_enabled && (
                              <span style={{ fontSize: '10.5px', color: '#2563eb', background: '#eff6ff', padding: '1px 6px', borderRadius: '4px', fontWeight: '500' }}>
                                2FA
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td style={{ padding: '12px 18px' }}>
                        <div>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            background: isPro ? '#fffbeb' : '#eff6ff',
                            color: isPro ? '#d97706' : '#2563eb',
                            border: isPro ? '1px solid #fde68a' : '1px solid #bfdbfe'
                          }}>
                            {u.plan || 'Free'}
                          </span>
                          {u.plan_expires && (
                            <div style={{ color: '#64748b', fontSize: '11px', marginTop: '3px' }}>
                              Exp: {u.plan_expires}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Websites */}
                      <td style={{ padding: '12px 18px' }}>
                        <strong style={{ color: '#0f172a' }}>{u.websites_count || 0}</strong>
                        <span style={{ color: '#64748b', fontSize: '12px' }}> sites</span>
                      </td>

                      {/* Registered / Active */}
                      <td style={{ padding: '12px 18px', color: '#64748b', fontSize: '12px' }}>
                        <div>{u.created_at ? u.created_at.slice(0, 10) : '—'}</div>
                        <div style={{ color: '#94a3b8', fontSize: '11px' }}>
                          {u.last_login ? u.last_login.slice(0, 16) : 'Never'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {/* 1-Click Fix: Unlock Account */}
                          {u.is_locked && (
                            <button
                              onClick={() => handleUnlock(u)}
                              disabled={actionLoading}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                background: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                              title="Unlock account immediately"
                            >
                              <i className="fas fa-lock-open"></i> Unlock
                            </button>
                          )}

                          {/* 1-Click Fix: Verify Email */}
                          {!u.email_verified && (
                            <button
                              onClick={() => handleVerifyEmail(u)}
                              disabled={actionLoading}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                background: '#ecfdf5',
                                color: '#059669',
                                border: '1px solid #a7f3d0',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                              title="Force verify email"
                            >
                              <i className="fas fa-check"></i> Verify Email
                            </button>
                          )}

                          {/* Plan Trigger */}
                          <button
                            onClick={() => openPlanModal(u)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: '#fffbeb',
                              color: '#d97706',
                              border: '1px solid #fde68a',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                            title="Assign or upgrade plan"
                          >
                            <i className="fas fa-crown"></i> Plan
                          </button>

                          {/* Role Trigger */}
                          <button
                            onClick={() => openRoleModal(u)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: '#f8fafc',
                              color: '#475569',
                              border: '1px solid #e2e8f0',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                            title="Change role"
                          >
                            <i className="fas fa-user-shield"></i> Role
                          </button>

                          {/* Reset API Key */}
                          <button
                            onClick={() => handleResetApiKey(u)}
                            disabled={actionLoading}
                            style={{
                              padding: '4px 7px',
                              borderRadius: '6px',
                              background: '#f8fafc',
                              color: '#2563eb',
                              border: '1px solid #e2e8f0',
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
                                padding: '4px 7px',
                                borderRadius: '6px',
                                background: '#f8fafc',
                                color: '#ef4444',
                                border: '1px solid #e2e8f0',
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
                              padding: '4px 7px',
                              borderRadius: '6px',
                              background: '#f8fafc',
                              color: '#f59e0b',
                              border: '1px solid #e2e8f0',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                            title="Terminate sessions"
                          >
                            <i className="fas fa-right-from-bracket"></i>
                          </button>

                          {/* Suspend / Activate */}
                          <button
                            onClick={() => handleToggleSuspend(u)}
                            disabled={actionLoading}
                            style={{
                              padding: '4px 7px',
                              borderRadius: '6px',
                              background: '#f8fafc',
                              color: isSuspended ? '#059669' : '#dc2626',
                              border: '1px solid #e2e8f0',
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
                              padding: '4px 7px',
                              borderRadius: '6px',
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                            title="Delete user"
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', background: 'white' }}>
            <span className="close" onClick={() => setModalType(null)}>&times;</span>
            <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#0f172a', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-crown" style={{ color: '#d97706' }}></i>
              Manage Subscription Plan
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>
              Set plan tier and access duration for <strong>{selectedUser.email}</strong>.
            </p>

            <form onSubmit={handleSavePlan}>
              <div className="form-group">
                <label style={{ color: '#334155', fontWeight: '600', fontSize: '13px' }}>Select Plan Tier</label>
                <select
                  value={planForm.plan}
                  onChange={(e) => setPlanForm({ ...planForm, plan: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                >
                  <option value="free">Starter Free ($0)</option>
                  <option value="go">Developer Go ($9/mo)</option>
                  <option value="pro">Enterprise Pro ($29/mo)</option>
                  <option value="enterprise">Dedicated Enterprise ($99/mo)</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ color: '#334155', fontWeight: '600', fontSize: '13px' }}>Access Validity Duration</label>
                <select
                  value={planForm.durationDays}
                  onChange={(e) => setPlanForm({ ...planForm, durationDays: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
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
                style={{ width: '100%', marginTop: '12px', padding: '10px' }}
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', background: 'white' }}>
            <span className="close" onClick={() => setModalType(null)}>&times;</span>
            <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#0f172a', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-user-shield" style={{ color: '#2563eb' }}></i>
              Change Account Role
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>
              Adjust platform permissions for <strong>{selectedUser.email}</strong>.
            </p>

            <form onSubmit={handleSaveRole}>
              <div className="form-group">
                <label style={{ color: '#334155', fontWeight: '600', fontSize: '13px' }}>User Role</label>
                <select
                  value={roleForm.role}
                  onChange={(e) => setRoleForm({ role: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                >
                  <option value="user">Standard User (Client Dashboard & API Access)</option>
                  <option value="admin">Platform Admin (WAF & Threat Logs)</option>
                  <option value="super_admin">Super Admin (Full Root System Control)</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={actionLoading}
                style={{ width: '100%', marginTop: '12px', padding: '10px' }}
              >
                {actionLoading ? 'Updating Role...' : 'Save Role'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
