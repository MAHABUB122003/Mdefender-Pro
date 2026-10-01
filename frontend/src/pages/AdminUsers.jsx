import { useState, useEffect, useCallback } from 'react'
import api from '../api/api'
import copyToClipboardUtil from '../utils/clipboard'
import adminStore from '../utils/adminStore'

export default function AdminUsers() {
  const cachedUsersData = adminStore.get('users_data')
  const initialUsers = cachedUsersData?.users || (Array.isArray(cachedUsersData) ? cachedUsersData : [])
  const initialMetrics = cachedUsersData?.metrics || {
    total_users: initialUsers.length,
    verified_users: 0,
    pro_users: 0,
    locked_users: 0,
    suspended_users: 0,
  }

  const [users, setUsers] = useState(initialUsers)
  const [metrics, setMetrics] = useState(initialMetrics)
  const [loading, setLoading] = useState(!cachedUsersData)
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState('all') // all, active, pro, unverified, locked, suspended
  const [selectedUser, setSelectedUser] = useState(null)
  const [modalType, setModalType] = useState(null) // 'create', 'gift', 'plan', 'role', 'password', null
  const [actionLoading, setActionLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  // Create User Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    plan: 'free',
    role: 'user',
    duration_days: 30,
    is_gift: false,
    gift_note: ''
  })

  // Gift Plan Form State
  const [giftForm, setGiftForm] = useState({
    plan: 'pro',
    duration_days: 30,
    is_lifetime: false,
    gift_note: ''
  })

  // Change Password Form State
  const [passwordForm, setPasswordForm] = useState({
    new_password: ''
  })

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
      const res = await api.adminGetAllUsers({ search, status: filterTab })
      if (res?.data) {
        setUsers(res.data.users || [])
        if (res.data.metrics) setMetrics(res.data.metrics)
        adminStore.set('users_data', res.data)
      } else if (res?.users) {
        setUsers(res.users)
        adminStore.set('users_data', res)
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

  const handleCreateUserSubmit = async (e) => {
    e.preventDefault()
    if (!createForm.name || !createForm.email || !createForm.password) {
      showToast('Name, email, and password are required!', true)
      return
    }

    try {
      setActionLoading(true)
      const res = await api.adminCreateUser(createForm)
      showToast(`User ${createForm.name} (${createForm.email}) created successfully!`)
      setModalType(null)
      setCreateForm({
        name: '',
        username: '',
        email: '',
        password: '',
        plan: 'free',
        role: 'user',
        duration_days: 30,
        is_gift: false,
        gift_note: ''
      })
      fetchUsers()
    } catch (err) {
      showToast(err.message || 'Failed to create user account', true)
    } finally {
      setActionLoading(false)
    }
  }

  const handleGiftPlanSubmit = async (e) => {
    e.preventDefault()
    if (!selectedUser) return
    try {
      setActionLoading(true)
      const payload = {
        user_id: selectedUser.id,
        plan: giftForm.plan,
        duration_days: giftForm.is_lifetime ? 36500 : Number(giftForm.duration_days),
        is_lifetime: giftForm.is_lifetime,
        gift_note: giftForm.gift_note || `Gifted ${giftForm.plan.toUpperCase()} subscription by Admin`
      }
      await api.adminGiftPlan(payload)
      showToast(`Gifted ${giftForm.plan.toUpperCase()} plan to ${selectedUser.email} successfully!`)
      setModalType(null)
      fetchUsers()
    } catch (err) {
      showToast(err.message || 'Failed to gift subscription', true)
    } finally {
      setActionLoading(false)
    }
  }

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault()
    if (!selectedUser || !passwordForm.new_password) return
    if (passwordForm.new_password.length < 6) {
      showToast('Password must be at least 6 characters', true)
      return
    }
    try {
      setActionLoading(true)
      await api.adminChangeUserPassword(selectedUser.id, passwordForm.new_password)
      showToast(`Password updated for ${selectedUser.email}!`)
      setModalType(null)
      setPasswordForm({ new_password: '' })
    } catch (err) {
      showToast(err.message || 'Failed to change password', true)
    } finally {
      setActionLoading(false)
    }
  }

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

  const openGiftModal = (user) => {
    setSelectedUser(user)
    setGiftForm({
      plan: user.plan && user.plan !== 'free' ? user.plan : 'pro',
      duration_days: 30,
      is_lifetime: false,
      gift_note: `Gift subscription provided by Admin for ${user.email}`
    })
    setModalType('gift')
  }

  const openPlanModal = (user) => {
    setSelectedUser(user)
    setPlanForm({ plan: user.plan || 'pro', durationDays: 30 })
    setModalType('plan')
  }

  const openPasswordModal = (user) => {
    setSelectedUser(user)
    setPasswordForm({ new_password: '' })
    setModalType('password')
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

  const getPlanBadge = (plan) => {
    const p = (plan || 'free').toLowerCase()
    if (p === 'enterprise') return <span className="badge" style={{ background: '#7c3aed', color: '#fff' }}>Enterprise</span>
    if (p === 'pro' || p === 'premium') return <span className="badge" style={{ background: '#6366f1', color: '#fff' }}>Enterprise Pro</span>
    if (p === 'go') return <span className="badge" style={{ background: '#3b82f6', color: '#fff' }}>Developer Go</span>
    return <span className="badge" style={{ background: '#e2e8f0', color: '#475569' }}>Starter Free</span>
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
          padding: '14px 22px',
          borderRadius: '10px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
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
        padding: '18px 24px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px'
          }}>
            <i className="fas fa-users-gear"></i>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
              User Accounts & Subscription Management
            </h1>
            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Create accounts, gift Pro/Enterprise subscriptions, manage customer access & quotas.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={() => setModalType('create')}
            style={{
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: 'white',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
            }}
          >
            <i className="fas fa-user-plus"></i> Create User Account
          </button>
          <button
            className="btn btn-secondary"
            onClick={fetchUsers}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fas fa-rotate"></i> Refresh
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div style={{ background: 'white', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Total Registered Users</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '6px 0 2px' }}>{metrics.total_users || users.length}</div>
          <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}><i className="fas fa-circle-check"></i> Platform wide</div>
        </div>

        <div style={{ background: 'white', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Paid / Gifted Subscriptions</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#6366f1', margin: '6px 0 2px' }}>
            {users.filter(u => u.plan && u.plan !== 'free').length}
          </div>
          <div style={{ fontSize: '12px', color: '#6366f1', fontWeight: '600' }}><i className="fas fa-gift"></i> Go / Pro / Enterprise</div>
        </div>

        <div style={{ background: 'white', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Active Accounts</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981', margin: '6px 0 2px' }}>
            {users.filter(u => u.status === 'active' && u.is_active !== false).length}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Operational status</div>
        </div>

        <div style={{ background: 'white', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Suspended / Locked</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#ef4444', margin: '6px 0 2px' }}>
            {users.filter(u => u.status === 'suspended' || u.is_active === false || u.is_locked).length}
          </div>
          <div style={{ fontSize: '12px', color: '#ef4444' }}>Requires review</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '14px 20px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Users' },
            { id: 'active', label: 'Active' },
            { id: 'pro', label: 'Pro / Paid' },
            { id: 'unverified', label: 'Unverified' },
            { id: 'suspended', label: 'Suspended' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                border: filterTab === tab.id ? '1px solid #2563eb' : '1px solid #e2e8f0',
                background: filterTab === tab.id ? '#eff6ff' : '#f8fafc',
                color: filterTab === tab.id ? '#2563eb' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', minWidth: '280px' }}>
          <input
            type="text"
            placeholder="Search by name, email, username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              width: '100%',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Users Table Card */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                <th style={{ padding: '14px 18px' }}>User Details</th>
                <th style={{ padding: '14px 18px' }}>Subscription Tier</th>
                <th style={{ padding: '14px 18px' }}>Status</th>
                <th style={{ padding: '14px 18px' }}>Websites</th>
                <th style={{ padding: '14px 18px' }}>API Key</th>
                <th style={{ padding: '14px 18px' }}>Joined Date</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                    <i className="fas fa-users" style={{ fontSize: '32px', color: '#cbd5e1', marginBottom: '12px' }}></i>
                    <div>No users found matching your search.</div>
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>
                        {u.name || u.full_name || 'User'}
                        {u.role === 'super_admin' && (
                          <span style={{ marginLeft: '6px', fontSize: '10px', background: '#fee2e2', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>
                            ADMIN
                          </span>
                        )}
                        {u.is_gift && (
                          <span style={{ marginLeft: '6px', fontSize: '10px', background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px', fontWeight: '800', display: 'inline-flex', alignItems: 'center' }}>
                            <i className="fas fa-gift" style={{ marginRight: '4px' }}></i> GIFTED
                          </span>
                        )}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>{u.email}</div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {getPlanBadge(u.plan)}
                        {u.plan_expires && u.plan !== 'free' && (
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            (Exp: {u.plan_expires})
                          </span>
                        )}
                      </div>
                      {u.gift_note && (
                        <div style={{ fontSize: '11px', color: '#d97706', marginTop: '3px' }}>
                          <i className="fas fa-circle-info"></i> {u.gift_note}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      {u.status === 'suspended' || u.is_active === false ? (
                        <span style={{ background: '#fee2e2', color: '#ef4444', padding: '4px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '11px' }}>
                          SUSPENDED
                        </span>
                      ) : u.is_locked ? (
                        <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '11px' }}>
                          LOCKED
                        </span>
                      ) : (
                        <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '11px' }}>
                          ACTIVE
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '14px 18px', fontWeight: '600', color: '#334155' }}>
                      <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
                        <i className="fas fa-globe" style={{ color: '#2563eb', marginRight: '4px' }}></i>
                        {u.websites_count || 0}
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      {u.api_key ? (
                        <button
                          onClick={() => copyToClipboard(u.api_key, 'API Key')}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#334155'
                          }}
                        >
                          <span>{u.api_key.slice(0, 10)}...</span>
                          <i className="fas fa-copy" style={{ color: '#64748b' }}></i>
                        </button>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>None</span>
                      )}
                    </td>

                    <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '12px' }}>
                      {u.created_at || 'N/A'}
                    </td>

                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {/* Gift Subscription Button */}
                        <button
                          onClick={() => openGiftModal(u)}
                          title="Gift Subscription"
                          style={{
                            background: '#fef3c7',
                            border: '1px solid #fde68a',
                            color: '#b45309',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '700'
                          }}
                        >
                          <i className="fas fa-gift"></i> Gift
                        </button>

                        {/* Reset Password Button */}
                        <button
                          onClick={() => openPasswordModal(u)}
                          title="Change User Password"
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1d4ed8',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          <i className="fas fa-key"></i>
                        </button>

                        {/* Edit Plan Button */}
                        <button
                          onClick={() => openPlanModal(u)}
                          title="Change Plan Tier"
                          style={{
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            color: '#334155',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          <i className="fas fa-sliders"></i>
                        </button>

                        {/* Unlock Button if locked */}
                        {u.is_locked && (
                          <button
                            onClick={() => handleUnlock(u)}
                            title="Unlock Account"
                            style={{
                              background: '#ecfdf5',
                              border: '1px solid #a7f3d0',
                              color: '#059669',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            <i className="fas fa-lock-open"></i>
                          </button>
                        )}

                        {/* Suspend / Restore Toggle */}
                        <button
                          onClick={() => handleToggleSuspend(u)}
                          title={u.status === 'suspended' || u.is_active === false ? 'Activate User' : 'Suspend User'}
                          style={{
                            background: u.status === 'suspended' || u.is_active === false ? '#dcfce7' : '#fee2e2',
                            border: u.status === 'suspended' || u.is_active === false ? '1px solid #86efac' : '1px solid #fca5a5',
                            color: u.status === 'suspended' || u.is_active === false ? '#15803d' : '#b91c1c',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          <i className={`fas ${u.status === 'suspended' || u.is_active === false ? 'fa-user-check' : 'fa-user-slash'}`}></i>
                        </button>

                        {/* Delete User */}
                        <button
                          onClick={() => handleDeleteUser(u)}
                          title="Delete User"
                          style={{
                            background: '#fff1f2',
                            border: '1px solid #fecdd3',
                            color: '#e11d48',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL: CREATE USER ================= */}
      {modalType === 'create' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                <i className="fas fa-user-plus" style={{ color: '#2563eb', marginRight: '8px' }}></i>
                Create New User Account
              </h2>
              <button
                onClick={() => setModalType(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mahabub Rahman"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                    Username (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. mahabub25"
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                  Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Set initial login password (min 6 chars)"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                    Initial Plan Tier
                  </label>
                  <select
                    value={createForm.plan}
                    onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    <option value="free">Starter Free ($0)</option>
                    <option value="go">Developer Go ($9/mo)</option>
                    <option value="pro">Enterprise Pro ($29/mo)</option>
                    <option value="enterprise">Dedicated Enterprise ($99/mo)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                    Role Access
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    <option value="user">Standard User</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>

              {createForm.plan !== 'free' && (
                <div style={{ marginBottom: '14px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                    Duration (Days)
                  </label>
                  <select
                    value={createForm.duration_days}
                    onChange={(e) => setCreateForm({ ...createForm, duration_days: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="30">1 Month (30 Days)</option>
                    <option value="90">3 Months (90 Days)</option>
                    <option value="365">1 Year (365 Days)</option>
                    <option value="36500">Permanent Lifetime</option>
                  </select>
                </div>
              )}

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                  Admin Notes / Gift Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. VIP client account created directly"
                  value={createForm.gift_note}
                  onChange={(e) => setCreateForm({ ...createForm, gift_note: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                >
                  {actionLoading ? 'Creating Account...' : 'Create Account Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: GIFT SUBSCRIPTION ================= */}
      {modalType === 'gift' && selectedUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                <i className="fas fa-gift" style={{ color: '#d97706', marginRight: '8px' }}></i>
                Gift Premium Subscription
              </h2>
              <button
                onClick={() => setModalType(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
              <div style={{ color: '#64748b' }}>Recipient:</div>
              <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>{selectedUser.name} ({selectedUser.email})</div>
              <div style={{ color: '#64748b', marginTop: '4px' }}>Current Plan: <strong>{(selectedUser.plan || 'free').toUpperCase()}</strong></div>
            </div>

            <form onSubmit={handleGiftPlanSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                  Select Plan to Gift
                </label>
                <select
                  value={giftForm.plan}
                  onChange={(e) => setGiftForm({ ...giftForm, plan: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                >
                  <option value="pro">Enterprise Pro (Recommended - 2M+ Signatures & DDoS)</option>
                  <option value="go">Developer Go (5.48M ML Core)</option>
                  <option value="enterprise">Dedicated Enterprise (Ultimate Quota)</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                  Gift Duration Preset
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  {[
                    { days: 30, label: '1 Month Free' },
                    { days: 90, label: '3 Months Free' },
                    { days: 365, label: '1 Year Free' },
                    { days: 36500, label: 'Lifetime VIP Free', lifetime: true },
                  ].map(p => (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => setGiftForm({ ...giftForm, duration_days: p.days, is_lifetime: !!p.lifetime })}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        border: (p.lifetime && giftForm.is_lifetime) || (!giftForm.is_lifetime && giftForm.duration_days === p.days) ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        background: (p.lifetime && giftForm.is_lifetime) || (!giftForm.is_lifetime && giftForm.duration_days === p.days) ? '#eff6ff' : '#f8fafc',
                        color: (p.lifetime && giftForm.is_lifetime) || (!giftForm.is_lifetime && giftForm.duration_days === p.days) ? '#2563eb' : '#334155',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                  Gift Note / Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g. Complimentary access for partnership"
                  value={giftForm.gift_note}
                  onChange={(e) => setGiftForm({ ...giftForm, gift_note: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #d97706, #b45309)', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                >
                  {actionLoading ? 'Granting Gift...' : 'Grant Gift Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHANGE PASSWORD ================= */}
      {modalType === 'password' && selectedUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '420px',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                <i className="fas fa-key" style={{ color: '#2563eb', marginRight: '8px' }}></i>
                Set Custom Password
              </h2>
              <button
                onClick={() => setModalType(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', marginTop: 0 }}>
              Directly update the login password for <strong>{selectedUser.email}</strong>.
            </p>

            <form onSubmit={handleChangePasswordSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password (min 6 chars)"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ new_password: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                >
                  {actionLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT PLAN ================= */}
      {modalType === 'plan' && selectedUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '420px',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                Edit Plan for {selectedUser.name}
              </h2>
              <button
                onClick={() => setModalType(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSavePlan}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                  Plan Tier
                </label>
                <select
                  value={planForm.plan}
                  onChange={(e) => setPlanForm({ ...planForm, plan: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                >
                  <option value="free">Starter Free</option>
                  <option value="go">Developer Go ($9/mo)</option>
                  <option value="pro">Enterprise Pro ($29/mo)</option>
                  <option value="enterprise">Dedicated Enterprise ($99/mo)</option>
                </select>
              </div>

              {planForm.plan !== 'free' && (
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                    Duration (Days from today)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    value={planForm.durationDays}
                    onChange={(e) => setPlanForm({ ...planForm, durationDays: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
