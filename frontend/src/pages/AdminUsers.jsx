import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Users,
  UserPlus,
  RefreshCw,
  Search,
  Filter,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Globe,
  Key,
  Lock,
  Unlock,
  Mail,
  Zap,
  MoreVertical,
  X,
  ExternalLink,
  Gift,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  LogOut,
  ChevronRight,
  Clock,
  Laptop,
  CreditCard,
  SlidersHorizontal,
  CheckCircle,
  XCircle,
  Sparkles,
  Building2,
  ShoppingBag,
  User,
  Compass,
  Share2
} from 'lucide-react'
import api from '../api/api'
import adminStore from '../utils/adminStore'
import copyToClipboardUtil from '../utils/clipboard'

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
  const [filterTab, setFilterTab] = useState('all') // 'all', 'pro', 'free', 'active', 'unverified', 'locked_suspended'
  const [selectedTenant, setSelectedTenant] = useState(null)
  const [modalType, setModalType] = useState(null) // 'create', 'gift', 'bulk_gift', 'password', null
  const [selectedUserIds, setSelectedUserIds] = useState(new Set())
  const [actionLoading, setActionLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)
  const [copiedKey, setCopiedKey] = useState(null)

  // Forms
  const [createForm, setCreateForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    plan: 'pro',
    role: 'user',
    duration_days: 30,
    is_gift: false,
    gift_note: ''
  })

  const [giftForm, setGiftForm] = useState({
    plan: 'pro',
    preset: '30', // '30', '90', '365', 'lifetime', 'custom'
    duration_days: 30,
    limit_preset: '1', // '1', '5', '10', '25', '50', 'unlimited', 'custom'
    custom_limit: 1,
    gift_note: ''
  })

  const [passwordForm, setPasswordForm] = useState({ new_password: '' })

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const copyToClipboard = async (text, label) => {
    const ok = await copyToClipboardUtil(text)
    if (ok) {
      setCopiedKey(label)
      showToast(`${label} copied to clipboard!`)
      setTimeout(() => setCopiedKey(null), 2000)
    }
  }

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.adminGetAllUsers({ search: search.trim() })
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
  }, [search])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Sync selectedTenant with live user state
  useEffect(() => {
    if (selectedTenant) {
      const refreshed = users.find(u => (u.id || u._id) === (selectedTenant.id || selectedTenant._id))
      if (refreshed) setSelectedTenant(refreshed)
    }
  }, [users])

  // Close drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (modalType) setModalType(null)
        else if (selectedTenant) setSelectedTenant(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedTenant, modalType])

  // ==================== TENANT ACTIONS ====================
  const handleCreateUser = async (e) => {
    e.preventDefault()
    if (!createForm.name || !createForm.email || !createForm.password) {
      showToast('Name, email, and password are required!', true)
      return
    }
    setActionLoading(true)
    try {
      await api.adminCreateUser(createForm)
      showToast(`Tenant ${createForm.name} (${createForm.email}) created successfully!`)
      setModalType(null)
      setCreateForm({ name: '', username: '', email: '', password: '', plan: 'pro', role: 'user', duration_days: 30, is_gift: false, gift_note: '' })
      fetchUsers()
    } catch (err) {
      showToast(err.message || 'Failed to create user account', true)
    } finally {
      setActionLoading(false)
    }
  }

  const handleGiftPlanSubmit = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const duration = giftForm.preset === 'lifetime'
        ? 36500
        : giftForm.preset === 'custom'
          ? Math.max(1, Number(giftForm.duration_days) || 30)
          : Number(giftForm.preset)

      const limit = giftForm.limit_preset === 'unlimited'
        ? -1
        : giftForm.limit_preset === 'custom'
          ? Math.max(1, Number(giftForm.custom_limit) || 1)
          : Number(giftForm.limit_preset)

      if (modalType === 'bulk_gift') {
        const uids = Array.from(selectedUserIds)
        if (uids.length === 0) return
        await api.adminBulkUserAction({
          action: 'gift_plan',
          user_ids: uids,
          plan: giftForm.plan,
          duration_days: duration,
          is_lifetime: giftForm.preset === 'lifetime',
          website_limit: limit,
          gift_note: giftForm.gift_note || `Bulk Gifted Pro ($4/site) by Super Admin`
        })
        showToast(`Pro Plan (${limit === -1 ? 'Unlimited' : limit + ' sites'}) gifted to ${uids.length} tenants!`)
        setSelectedUserIds(new Set())
      } else {
        if (!selectedTenant) return
        const payload = {
          user_id: selectedTenant.id || selectedTenant._id,
          plan: giftForm.plan,
          duration_days: duration,
          is_lifetime: giftForm.preset === 'lifetime',
          website_limit: limit,
          gift_note: giftForm.gift_note || `Gifted Pro ($4/site) by Super Admin`
        }
        await api.adminGiftPlan(payload)
        showToast(`Pro Plan (${limit === -1 ? 'Unlimited' : limit + ' sites'}) gifted to ${selectedTenant.email}!`)
      }
      setModalType(null)
      fetchUsers()
    } catch (err) {
      showToast(err.message || 'Failed to gift plan', true)
    } finally {
      setActionLoading(false)
    }
  }

  const handleBulkAction = async (action) => {
    const count = selectedUserIds.size
    if (count === 0) return

    let confirmMsg = ''
    if (action === 'delete') {
      confirmMsg = `WARNING: Are you sure you want to PERMANENTLY delete ${count} selected tenant account(s) and all their connected sites? This cannot be undone!`
    } else if (action === 'suspend') {
      confirmMsg = `Suspend ${count} selected tenant account(s)?`
    } else if (action === 'restore') {
      confirmMsg = `Restore and unblock ${count} selected tenant account(s)?`
    }

    if (!window.confirm(confirmMsg)) return

    setActionLoading(true)
    try {
      const res = await api.adminBulkUserAction({
        action,
        user_ids: Array.from(selectedUserIds)
      })
      const affected = res?.data?.affected_count ?? count
      showToast(`Bulk ${action} completed on ${affected} tenant(s)!`)
      setSelectedUserIds(new Set())
      if (selectedTenant && selectedUserIds.has(selectedTenant.id || selectedTenant._id)) {
        setSelectedTenant(null)
      }
      fetchUsers()
    } catch (err) {
      showToast(err.message || `Failed to perform bulk ${action}`, true)
    } finally {
      setActionLoading(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!selectedTenant || !passwordForm.new_password) return
    if (passwordForm.new_password.length < 6) {
      showToast('Password must be at least 6 characters', true)
      return
    }
    setActionLoading(true)
    try {
      await api.adminChangeUserPassword(selectedTenant.id || selectedTenant._id, passwordForm.new_password)
      showToast(`Password updated for ${selectedTenant.email}!`)
      setModalType(null)
      setPasswordForm({ new_password: '' })
    } catch (err) {
      showToast(err.message || 'Failed to change password', true)
    } finally {
      setActionLoading(false)
    }
  }

  const handleImpersonate = async (tenant) => {
    const tid = tenant.id || tenant._id
    try {
      setActionLoading(true)
      const res = await api.adminImpersonateUser(tid)
      const data = res?.data || res || {}
      const token = data.token || data.session_token
      if (token) {
        showToast(`Support session initialized for ${tenant.email}! Opening view...`)
        const userUrl = `/user/dashboard?impersonate_token=${encodeURIComponent(token)}&user=${encodeURIComponent(tenant.email)}`
        window.open(userUrl, '_blank')
      } else {
        showToast('Support session created successfully!')
      }
    } catch (err) {
      showToast(err.message || 'Support impersonation failed', true)
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnlock = async (tenant) => {
    const tid = tenant.id || tenant._id
    setActionLoading(true)
    try {
      await api.adminUnlockUser(tid)
      showToast(`Account for ${tenant.email} unlocked!`)
      fetchUsers()
    } catch (err) {
      showToast(err.message || 'Failed to unlock user', true)
    } finally {
      setActionLoading(false)
    }
  }

  const handleVerifyEmail = async (tenant) => {
    const tid = tenant.id || tenant._id
    setActionLoading(true)
    try {
      await api.adminVerifyUserEmail(tid)
      showToast(`Email for ${tenant.email} marked verified!`)
      fetchUsers()
    } catch (err) {
      showToast(err.message || 'Failed to verify email', true)
    } finally {
      setActionLoading(false)
    }
  }

  const handleResetApiKey = async (tenant) => {
    const tid = tenant.id || tenant._id
    if (!confirm(`Regenerate API Key for ${tenant.email}? Connected WordPress integrations must be updated with the new key.`)) return
    setActionLoading(true)
    try {
      const res = await api.adminResetUserApiKey(tid)
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

  const handleResetMFA = async (tenant) => {
    const tid = tenant.id || tenant._id
    if (!confirm(`Disable Two-Factor Authentication (2FA) for ${tenant.email}?`)) return
    setActionLoading(true)
    try {
      await api.adminResetUserMFA(tid)
      showToast(`2FA disabled for ${tenant.email}.`)
      fetchUsers()
    } catch (err) {
      showToast(err.message || 'Failed to reset 2FA', true)
    } finally {
      setActionLoading(false)
    }
  }

  const handleForceLogout = async (tenant) => {
    const tid = tenant.id || tenant._id
    if (!confirm(`Terminate all active sessions for ${tenant.email}?`)) return
    setActionLoading(true)
    try {
      await api.adminForceLogoutUser(tid)
      showToast(`All active sessions terminated for ${tenant.email}.`)
      fetchUsers()
    } catch (err) {
      showToast(err.message || 'Failed to force logout', true)
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleSuspend = async (tenant) => {
    const tid = tenant.id || tenant._id
    const isSuspended = tenant.status === 'suspended' || tenant.is_active === false
    const actionName = isSuspended ? 'restore' : 'suspend'
    if (!confirm(`${actionName.toUpperCase()} account for ${tenant.email}?`)) return
    setActionLoading(true)
    try {
      if (isSuspended) {
        await api.adminRestoreUser(tid)
        showToast(`Tenant ${tenant.email} restored.`)
      } else {
        await api.adminSuspendUser(tid)
        showToast(`Tenant ${tenant.email} suspended.`)
      }
      fetchUsers()
    } catch (err) {
      showToast(err.message || `Failed to ${actionName} user`, true)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteUser = async (tenant) => {
    const tid = tenant.id || tenant._id
    if (!confirm(`WARNING: Permanently delete tenant ${tenant.email} and all connected WordPress site keys? This action cannot be undone.`)) return
    setActionLoading(true)
    try {
      await api.adminDeleteUser(tid)
      showToast(`Tenant ${tenant.email} deleted.`)
      if ((selectedTenant?.id || selectedTenant?._id) === tid) setSelectedTenant(null)
      fetchUsers()
    } catch (err) {
      showToast(err.message || 'Failed to delete user', true)
    } finally {
      setActionLoading(false)
    }
  }

  // ==================== REAL DATA METRICS & FILTERING ====================
  const isProPlan = (plan) => {
    const p = String(plan || '').toLowerCase()
    return p === 'pro' || p === 'enterprise' || p === 'premium'
  }

  const getPersonaBadge = (orgType) => {
    const t = (orgType || '').toLowerCase()
    if (t === 'owner') {
      return {
        label: 'Store / Site Owner',
        icon: ShoppingBag,
        color: '#059669',
        bg: '#ECFDF5',
        border: '#A7F3D0'
      }
    }
    if (t === 'agency') {
      return {
        label: 'Digital Agency',
        icon: Building2,
        color: '#2563EB',
        bg: '#EFF6FF',
        border: '#BFDBFE'
      }
    }
    if (t === 'freelance') {
      return {
        label: 'Freelance Webmaster',
        icon: User,
        color: '#7C3AED',
        bg: '#F5F3FF',
        border: '#DDD6FE'
      }
    }
    if (t === 'enterprise') {
      return {
        label: 'Enterprise SecOps',
        icon: ShieldCheck,
        color: '#D97706',
        bg: '#FFFBEB',
        border: '#FDE68A'
      }
    }
    return {
      label: 'Pending Onboarding',
      icon: User,
      color: '#64748B',
      bg: '#F1F5F9',
      border: '#E2E8F0'
    }
  }

  const liveMetrics = useMemo(() => {
    const total = users.length
    const pro = users.filter(u => isProPlan(u.plan)).length
    const free = users.filter(u => !isProPlan(u.plan)).length
    const verified = users.filter(u => u.email_verified).length
    const lockedSuspended = users.filter(u => u.is_locked || u.status === 'suspended' || u.is_active === false).length
    const owners = users.filter(u => u.organization_type === 'owner').length
    const agencies = users.filter(u => u.organization_type === 'agency').length
    const freelancers = users.filter(u => u.organization_type === 'freelance').length
    return {
      total,
      pro,
      free,
      verified,
      lockedSuspended,
      owners,
      agencies,
      freelancers
    }
  }, [users])

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Search match
      if (search) {
        const q = search.toLowerCase()
        const matchName = (u.name || '').toLowerCase().includes(q)
        const matchEmail = (u.email || '').toLowerCase().includes(q)
        const matchId = String(u.id || u._id || '').toLowerCase().includes(q)
        const matchPersona = (u.organization_type || '').toLowerCase().includes(q)
        const matchRef = (u.referral_source || '').toLowerCase().includes(q)
        const matchSite = Array.isArray(u.websites) && u.websites.some(w => {
          const dom = typeof w === 'string' ? w : (w.domain || w.url || '')
          return dom.toLowerCase().includes(q)
        })
        if (!matchName && !matchEmail && !matchId && !matchPersona && !matchRef && !matchSite) return false
      }

      // Tab filter
      if (filterTab === 'pro') return isProPlan(u.plan)
      if (filterTab === 'free') return !isProPlan(u.plan)
      if (filterTab === 'owner') return u.organization_type === 'owner'
      if (filterTab === 'agency') return u.organization_type === 'agency'
      if (filterTab === 'freelance') return u.organization_type === 'freelance'
      if (filterTab === 'active') return u.is_active !== false && u.status !== 'suspended'
      if (filterTab === 'unverified') return !u.email_verified
      if (filterTab === 'locked_suspended') return u.is_locked || u.status === 'suspended' || u.is_active === false
      return true
    })
  }, [users, search, filterTab])

  const allFilteredSelected = useMemo(() => {
    return filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.has(u.id || u._id))
  }, [filteredUsers, selectedUserIds])

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedUserIds(new Set())
    } else {
      const allIds = new Set(filteredUsers.map(u => u.id || u._id))
      setSelectedUserIds(allIds)
    }
  }

  const toggleSelectUser = (id, e) => {
    e.stopPropagation()
    setSelectedUserIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          background: toastMessage.isError ? '#DC2626' : '#0F172A',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
          fontSize: '13px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {toastMessage.isError ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} color="#34D399" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #EFEFEF',
        padding: '18px 24px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: '#EFF6FF',
            color: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Users size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>
                Tenants & Fleet Accounts
              </h1>
              <span style={{
                fontSize: '11px',
                fontWeight: '600',
                padding: '2px 8px',
                borderRadius: '9999px',
                background: '#EFF6FF',
                color: '#2563EB',
                border: '1px solid #DBEAFE'
              }}>
                100k+ Accounts Engine
              </span>
            </div>
            <p style={{ margin: '3px 0 0', color: '#64748B', fontSize: '13px' }}>
              Real-time tenant identity explorer, $4/site subscription management, and one-click support interventions.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setModalType('create')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)'
            }}
          >
            <UserPlus size={15} />
            Create Tenant
          </button>

          <button
            type="button"
            onClick={fetchUsers}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: '#FFFFFF',
              border: '1px solid #EFEFEF',
              color: '#334155',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* 5 KPI Metric Strip (Aligned with $4/site Model) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}>
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #EFEFEF',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
        }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total Tenants
          </span>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', marginTop: '6px', fontFamily: 'monospace' }}>
            {liveMetrics.total}
          </div>
          <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
            Registered Accounts
          </span>
        </div>

        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #EFEFEF',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
        }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Pro Subscribers
          </span>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#2563EB', marginTop: '6px', fontFamily: 'monospace' }}>
            {liveMetrics.pro}
          </div>
          <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
            $4/Site Active Fleet
          </span>
        </div>

        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #EFEFEF',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
        }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Free Tier Accounts
          </span>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', marginTop: '6px', fontFamily: 'monospace' }}>
            {liveMetrics.free}
          </div>
          <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
            Starter Plan
          </span>
        </div>

        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #EFEFEF',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
        }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Verified Tenants
          </span>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669', marginTop: '6px', fontFamily: 'monospace' }}>
            {liveMetrics.verified}
          </div>
          <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
            Email Confirmed
          </span>
        </div>

        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #EFEFEF',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
        }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Locked / Suspended
          </span>
          <div style={{ fontSize: '24px', fontWeight: '700', color: liveMetrics.lockedSuspended > 0 ? '#DC2626' : '#64748B', marginTop: '6px', fontFamily: 'monospace' }}>
            {liveMetrics.lockedSuspended}
          </div>
          <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
            Needs Intervention
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #EFEFEF',
        padding: '14px 18px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
      }}>
        {/* Crisp Filter Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: '#F8F9FA',
          padding: '4px',
          borderRadius: '9px',
          border: '1px solid #EFEFEF',
          overflowX: 'auto'
        }}>
          {[
            { id: 'all', label: `All Tenants (${liveMetrics.total})` },
            { id: 'owner', label: `Site Owners (${liveMetrics.owners})` },
            { id: 'agency', label: `Agencies (${liveMetrics.agencies})` },
            { id: 'freelance', label: `Freelancers (${liveMetrics.freelancers})` },
            { id: 'pro', label: `Pro $4/Site (${liveMetrics.pro})` },
            { id: 'free', label: `Free Tier (${liveMetrics.free})` },
            { id: 'verified', label: `Verified (${liveMetrics.verified})` },
            { id: 'locked_suspended', label: `Needs Action (${liveMetrics.lockedSuspended})` },
          ].map(tab => {
            const active = filterTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '7px',
                  fontSize: '12px',
                  fontWeight: active ? '700' : '500',
                  color: active ? '#0F172A' : '#64748B',
                  background: active ? '#FFFFFF' : 'transparent',
                  border: active ? '1px solid #E5E7EB' : '1px solid transparent',
                  boxShadow: active ? '0 1px 2px rgba(0, 0, 0, 0.04)' : 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.14s ease'
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Search Input */}
        <div style={{
          position: 'relative',
          width: '280px',
          maxWidth: '100%'
        }}>
          <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          <input
            type="text"
            placeholder="Search email, name, ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px 7px 32px',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              background: '#FFFFFF',
              fontSize: '12.5px',
              color: '#0F172A',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '8px',
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '2px'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Tenant Table */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #EFEFEF',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F8F9FA', borderBottom: '1px solid #EFEFEF', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '12px 14px', width: '38px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    style={{ width: '15px', height: '15px', accentColor: '#2563EB', cursor: 'pointer' }}
                    title={allFilteredSelected ? 'Deselect all' : 'Select all tenants'}
                  />
                </th>
                <th style={{ padding: '12px 18px', textAlign: 'left' }}>Tenant Identity & Persona</th>
                <th style={{ padding: '12px 18px', textAlign: 'left' }}>Acquisition Channel</th>
                <th style={{ padding: '12px 18px', textAlign: 'left' }}>Subscription</th>
                <th style={{ padding: '12px 18px', textAlign: 'left' }}>Protected Fleets</th>
                <th style={{ padding: '12px 18px', textAlign: 'left' }}>Account Health</th>
                <th style={{ padding: '12px 18px', textAlign: 'left' }}>Last Activity</th>
                <th style={{ padding: '12px 18px', textAlign: 'right' }}>Support Console</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px', color: '#2563EB' }} />
                    Loading tenant directory...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                    No tenants found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const uid = u.id || u._id
                  const isSelected = selectedTenant && (selectedTenant.id || selectedTenant._id) === uid
                  const isChecked = selectedUserIds.has(uid)
                  const siteCount = Array.isArray(u.websites) ? u.websites.length : (u.website_count || u.websites_count || 0)
                  const isSuspended = u.status === 'suspended' || u.is_active === false
                  const isPro = isProPlan(u.plan)
                  const persona = getPersonaBadge(u.organization_type)
                  const PersonaIcon = persona.icon

                  return (
                    <tr
                      key={uid}
                      onClick={() => setSelectedTenant(u)}
                      style={{
                        borderBottom: '1px solid #F1F2F4',
                        background: isChecked ? '#F5F3FF' : isSelected ? '#EFF6FF' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.12s ease'
                      }}
                      onMouseEnter={e => { if (!isSelected && !isChecked) e.currentTarget.style.background = '#FBFBFB' }}
                      onMouseLeave={e => { if (!isSelected && !isChecked) e.currentTarget.style.background = 'transparent' }}
                    >
                      {/* Selection Checkbox */}
                      <td style={{ padding: '13px 14px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => toggleSelectUser(uid, e)}
                          style={{ width: '15px', height: '15px', accentColor: '#7C3AED', cursor: 'pointer' }}
                        />
                      </td>

                      {/* Identity & Persona */}
                      <td style={{ padding: '13px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: isPro ? '#EFF6FF' : '#F1F5F9',
                            border: isPro ? '1px solid #DBEAFE' : '1px solid #E2E8F0',
                            color: isPro ? '#2563EB' : '#475569',
                            fontSize: '12.5px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {(u.name || u.email || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{u.name || 'Tenant User'}</span>
                              {u.role === 'super_admin' && (
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: '#F5F3FF',
                                  color: '#7C3AED',
                                  border: '1px solid #DDD6FE'
                                }}>
                                  Admin
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace', marginTop: '1px' }}>
                              {u.email}
                            </div>
                            <div style={{ marginTop: '4px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '1px 7px',
                                borderRadius: '9999px',
                                fontSize: '10.5px',
                                fontWeight: '600',
                                background: persona.bg,
                                color: persona.color,
                                border: `1px solid ${persona.border}`
                              }}>
                                <PersonaIcon size={10} strokeWidth={2.4} />
                                {persona.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Acquisition Channel */}
                      <td style={{ padding: '13px 18px' }}>
                        {u.referral_source ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 9px',
                            borderRadius: '6px',
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            color: '#334155',
                            fontSize: '11.5px',
                            fontWeight: '600'
                          }}>
                            <Compass size={12} color="#059669" />
                            {u.referral_source}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '11.5px' }}>
                            Direct / Organic
                          </span>
                        )}
                      </td>

                      {/* Subscription Plan ($4/site model) */}
                      <td style={{ padding: '13px 18px' }}>
                        {isPro ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 9px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: '700',
                            background: '#EFF6FF',
                            color: '#1D4ED8',
                            border: '1px solid #BFDBFE'
                          }}>
                            <Sparkles size={11} color="#2563EB" />
                            PRO ($4/MO)
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 9px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: '600',
                            background: '#F1F5F9',
                            color: '#475569',
                            border: '1px solid #E2E8F0'
                          }}>
                            FREE TIER
                          </span>
                        )}
                      </td>

                      {/* Connected Fleets */}
                      <td style={{ padding: '13px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: siteCount > 0 ? '#0F172A' : '#94A3B8',
                            fontWeight: '600',
                            fontSize: '12px'
                          }}>
                            <Globe size={14} color={siteCount > 0 ? '#10B981' : '#94A3B8'} />
                            <span>
                              {siteCount} {u.website_limit && u.website_limit > 0 ? `/ ${u.website_limit}` : ''} {siteCount === 1 && (!u.website_limit || u.website_limit === 1) ? 'Site' : 'Sites'}
                            </span>
                            {u.website_limit === -1 && (
                              <span style={{ fontSize: '10px', color: '#7C3AED', fontWeight: '700', padding: '0 4px', background: '#F5F3FF', borderRadius: '3px', border: '1px solid #DDD6FE' }}>Unlimited</span>
                            )}
                          </span>
                          {Array.isArray(u.websites) && u.websites.length > 0 && (
                            <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                              {u.websites[0].domain}
                              {u.websites.length > 1 ? ` (+${u.websites.length - 1} more)` : ''}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Account Health */}
                      <td style={{ padding: '13px 18px' }}>
                        {isSuspended ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: '600',
                            background: '#FEF2F2',
                            color: '#DC2626',
                            border: '1px solid #FECACA'
                          }}>
                            <XCircle size={11} /> Suspended
                          </span>
                        ) : u.is_locked ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: '600',
                            background: '#FFFBEB',
                            color: '#D97706',
                            border: '1px solid #FDE68A'
                          }}>
                            <Lock size={11} /> Locked Out
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: '600',
                            background: '#ECFDF5',
                            color: '#059669',
                            border: '1px solid #A7F3D0'
                          }}>
                            <CheckCircle size={11} /> Active
                          </span>
                        )}
                      </td>

                      {/* Last Activity */}
                      <td style={{ padding: '13px 18px', color: '#64748B', fontSize: '12px' }}>
                        {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Active Recently'}
                      </td>

                      {/* Quick Console Actions */}
                      <td style={{ padding: '13px 18px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleImpersonate(u)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              background: '#EFF6FF',
                              border: '1px solid #DBEAFE',
                              color: '#2563EB',
                              fontSize: '11.5px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Open secure 30-min tenant session"
                          >
                            <Zap size={12} />
                            Impersonate
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedTenant(u)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              background: '#FFFFFF',
                              border: '1px solid #EFEFEF',
                              color: '#334155',
                              fontSize: '11.5px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            Inspect <ChevronRight size={12} />
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

      {/* SLIDE-OVER TENANT DOSSIER DRAWER (WITH PROPER BACKDROP) */}
      {selectedTenant && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'flex-end',
          boxSizing: 'border-box'
        }}>
          {/* Backdrop overlay */}
          <div
            onClick={() => setSelectedTenant(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.35)',
              backdropFilter: 'blur(2px)',
              cursor: 'pointer'
            }}
          />

          {/* Drawer Sheet */}
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '520px',
            height: '100vh',
            background: '#FFFFFF',
            borderLeft: '1px solid #EFEFEF',
            boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1001,
            boxSizing: 'border-box'
          }}>
            {/* Drawer Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #EFEFEF',
              background: '#FBFBFB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: isProPlan(selectedTenant.plan) ? '#2563EB' : '#475569',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                }}>
                  {(selectedTenant.name || selectedTenant.email || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>
                    {selectedTenant.name || 'Tenant Dossier'}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace', marginTop: '2px' }}>
                    {selectedTenant.email}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedTenant(null)}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #EFEFEF',
                  borderRadius: '7px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                  cursor: 'pointer'
                }}
                title="Close Drawer (ESC)"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '22px'
            }}>
              {/* 1. Quick Support Impersonation Bar */}
              <div style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#1E3A8A' }}>
                    Support Impersonation Console
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#2563EB', marginTop: '2px' }}>
                    Generate a temporary 30-min admin session to inspect client view.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleImpersonate(selectedTenant)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    flexShrink: 0
                  }}
                >
                  <Zap size={14} />
                  Impersonate
                </button>
              </div>

              {/* 2. Tenant Demographics & Onboarding Intelligence */}
              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: '8px' }}>
                  Tenant Persona & Discovery Intelligence
                </span>
                <div style={{
                  background: '#FBFBFB',
                  border: '1px solid #EFEFEF',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B' }}>Organization Persona:</span>
                    {(() => {
                      const pb = getPersonaBadge(selectedTenant.organization_type)
                      const PbIcon = pb.icon
                      return (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: '700',
                          background: pb.bg,
                          color: pb.color,
                          border: `1px solid ${pb.border}`
                        }}>
                          <PbIcon size={12} strokeWidth={2.4} />
                          {pb.label}
                        </span>
                      )
                    })()}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B' }}>Target Fleet Size:</span>
                    <span style={{ fontWeight: '600', color: '#0F172A' }}>
                      {selectedTenant.fleet_size || '1 - 3 Websites'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B' }}>Acquisition Source:</span>
                    <span style={{
                      fontWeight: '600',
                      color: '#0F172A',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <Compass size={13} color="#2563EB" />
                      {selectedTenant.referral_source || 'Direct Search / Organic'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B' }}>Onboarding Status:</span>
                    <span style={{
                      fontWeight: '700',
                      color: selectedTenant.onboarding_completed ? '#059669' : '#D97706',
                      fontSize: '11px',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      background: selectedTenant.onboarding_completed ? '#ECFDF5' : '#FFFBEB',
                      border: selectedTenant.onboarding_completed ? '1px solid #A7F3D0' : '1px solid #FDE68A'
                    }}>
                      {selectedTenant.onboarding_completed ? 'ONBOARDING COMPLETED' : 'PENDING PROFILE SETUP'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Account Vitals & Plan Status */}
              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: '8px' }}>
                  Subscription & Vitals ($4/Site Standard)
                </span>
                <div style={{
                  background: '#FBFBFB',
                  border: '1px solid #EFEFEF',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B' }}>Active Plan:</span>
                    {isProPlan(selectedTenant.plan) ? (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: '700',
                        background: '#EFF6FF',
                        color: '#1D4ED8',
                        border: '1px solid #BFDBFE'
                      }}>
                        PRO ($4.00/SITE / MO)
                      </span>
                    ) : (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: '#F1F5F9',
                        color: '#475569',
                        border: '1px solid #E2E8F0'
                      }}>
                        FREE STARTER
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B' }}>Tenant ID:</span>
                    <span style={{ fontFamily: 'monospace', color: '#0F172A', fontWeight: '600' }}>
                      {selectedTenant.id || selectedTenant._id}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B' }}>Email Verification:</span>
                    <span style={{
                      fontWeight: '600',
                      color: selectedTenant.email_verified ? '#059669' : '#D97706'
                    }}>
                      {selectedTenant.email_verified ? 'Verified' : 'Pending Verification'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B' }}>Client API Key:</span>
                    <button
                      onClick={() => copyToClipboard(selectedTenant.api_key || 'No Key', 'API Key')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563EB',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {copiedKey === 'API Key' ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                      <span>Copy Secret Key</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Connected WordPress Fleets */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Connected WordPress Fleets ({Array.isArray(selectedTenant.websites) ? selectedTenant.websites.length : (selectedTenant.website_count || 0)})
                  </span>
                  <a href="/admin/clients" style={{ fontSize: '11.5px', color: '#2563EB', textDecoration: 'none', fontWeight: '600' }}>
                    Open Fleet Explorer →
                  </a>
                </div>

                <div style={{
                  border: '1px solid #EFEFEF',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  background: '#FFFFFF',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {Array.isArray(selectedTenant.websites) && selectedTenant.websites.length > 0 ? (
                    selectedTenant.websites.map((w, idx) => {
                      const domainName = typeof w === 'string' ? w : (w.domain || w.url || 'website')
                      const wafMode = typeof w === 'object' ? (w.waf_mode || 'protect') : 'protect'
                      const threats = typeof w === 'object' ? (w.threats_blocked || 0) : 0

                      return (
                        <div key={idx} style={{
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: idx < selectedTenant.websites.length - 1 ? '1px solid #F1F2F4' : 'none',
                          gap: '10px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <Globe size={15} color="#10B981" style={{ flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontFamily: 'monospace', fontSize: '12.5px', fontWeight: '700', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {domainName}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748B' }}>
                                Threats Blocked: <strong style={{ color: '#EF4444' }}>{threats}</strong>
                              </div>
                            </div>
                          </div>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            fontSize: '10px',
                            fontWeight: '700',
                            background: wafMode === 'protect' ? '#ECFDF5' : '#FFFBEB',
                            color: wafMode === 'protect' ? '#059669' : '#D97706',
                            border: wafMode === 'protect' ? '1px solid #A7F3D0' : '1px solid #FDE68A',
                            flexShrink: 0,
                            textTransform: 'uppercase'
                          }}>
                            {wafMode === 'protect' ? 'WAF PROTECT' : wafMode.toUpperCase()}
                          </span>
                        </div>
                      )
                    })
                  ) : (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '12.5px' }}>
                      <Globe size={28} color="#CBD5E1" style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontWeight: '600', color: '#64748B' }}>No WordPress Sites Linked</div>
                      <div style={{ fontSize: '11px', marginTop: '3px' }}>Tenant has not added their site keys yet.</div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Administrative Interventions */}
              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: '8px' }}>
                  Account & Security Interventions
                </span>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setGiftForm({
                        plan: 'pro',
                        preset: '30',
                        duration_days: 30,
                        limit_preset: String(selectedTenant?.website_limit || 1),
                        custom_limit: selectedTenant?.website_limit || 1,
                        gift_note: ''
                      })
                      setModalType('gift')
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #EFEFEF',
                      background: '#FFFFFF',
                      color: '#0F172A',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      textAlign: 'left'
                    }}
                  >
                    <Gift size={15} color="#7C3AED" />
                    <span>Gift Pro Plan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalType('password')}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #EFEFEF',
                      background: '#FFFFFF',
                      color: '#0F172A',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      textAlign: 'left'
                    }}
                  >
                    <Key size={15} color="#2563EB" />
                    <span>Reset Password</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUnlock(selectedTenant)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #EFEFEF',
                      background: '#FFFFFF',
                      color: '#0F172A',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      textAlign: 'left'
                    }}
                  >
                    <Unlock size={15} color="#059669" />
                    <span>Unlock Account</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleVerifyEmail(selectedTenant)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #EFEFEF',
                      background: '#FFFFFF',
                      color: '#0F172A',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      textAlign: 'left'
                    }}
                  >
                    <Mail size={15} color="#4F46E5" />
                    <span>Verify Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleResetApiKey(selectedTenant)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #EFEFEF',
                      background: '#FFFFFF',
                      color: '#0F172A',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      textAlign: 'left'
                    }}
                  >
                    <RefreshCw size={15} color="#64748B" />
                    <span>Rotate API Key</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleResetMFA(selectedTenant)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #EFEFEF',
                      background: '#FFFFFF',
                      color: '#0F172A',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      textAlign: 'left'
                    }}
                  >
                    <Shield size={15} color="#D97706" />
                    <span>Reset 2FA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleForceLogout(selectedTenant)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #EFEFEF',
                      background: '#FFFFFF',
                      color: '#0F172A',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      textAlign: 'left'
                    }}
                  >
                    <LogOut size={15} color="#64748B" />
                    <span>Force Logout</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleSuspend(selectedTenant)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: selectedTenant.status === 'suspended' ? '1px solid #A7F3D0' : '1px solid #FECACA',
                      background: selectedTenant.status === 'suspended' ? '#ECFDF5' : '#FEF2F2',
                      color: selectedTenant.status === 'suspended' ? '#059669' : '#DC2626',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      textAlign: 'left'
                    }}
                  >
                    <AlertTriangle size={15} />
                    <span>{selectedTenant.status === 'suspended' ? 'Restore Account' : 'Suspend Account'}</span>
                  </button>
                </div>
              </div>

              {/* 5. Danger Zone */}
              <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #EFEFEF' }}>
                <button
                  type="button"
                  onClick={() => handleDeleteUser(selectedTenant)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Trash2 size={15} />
                  Delete Tenant Account Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE TENANT ACCOUNT */}
      {modalType === 'create' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1050,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(2px)',
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #EFEFEF',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            width: '100%',
            maxWidth: '460px',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #EFEFEF',
              background: '#FBFBFB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={17} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>
                  Create New Tenant Account
                </h3>
              </div>
              <button
                onClick={() => setModalType(null)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12.5px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '5px' }}>Full Name</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '5px' }}>Email Address</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="user@example.com"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '5px' }}>Password</label>
                <input
                  type="password"
                  required
                  value={createForm.password}
                  onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="••••••••••••"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '5px' }}>Subscription Plan</label>
                  <select
                    value={createForm.plan}
                    onChange={e => setCreateForm({ ...createForm, plan: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #CBD5E1', fontSize: '12.5px', background: '#FFFFFF', boxSizing: 'border-box' }}
                  >
                    <option value="pro">Pro ($4/Month per Site)</option>
                    <option value="free">Free Starter Tier</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '5px' }}>Account Role</label>
                  <select
                    value={createForm.role}
                    onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #CBD5E1', fontSize: '12.5px', background: '#FFFFFF', boxSizing: 'border-box' }}
                  >
                    <option value="user">Tenant User</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid #EFEFEF' }}>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  style={{ padding: '8px 16px', borderRadius: '7px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#334155', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ padding: '8px 16px', borderRadius: '7px', background: '#2563EB', color: '#FFFFFF', border: 'none', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}
                >
                  {actionLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: GIFT PRO PLAN (SINGLE OR BULK) */}
      {(modalType === 'gift' || modalType === 'bulk_gift') && (selectedTenant || modalType === 'bulk_gift') && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1050,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(2px)',
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #EFEFEF',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #EFEFEF',
              background: '#FBFBFB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Gift size={18} color="#7C3AED" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>
                  {modalType === 'bulk_gift' ? 'Bulk Gift Pro Subscription' : 'Gift Pro Subscription'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalType(null)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleGiftPlanSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12.5px' }}>
              <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <span style={{ color: '#64748B', fontSize: '11.5px', display: 'block' }}>Target Recipient:</span>
                <strong style={{ color: '#0F172A', fontSize: '13px' }}>
                  {modalType === 'bulk_gift'
                    ? `${selectedUserIds.size} Selected Tenant Accounts`
                    : `${selectedTenant?.name || 'Tenant'} (${selectedTenant?.email})`}
                </strong>
              </div>

              {/* Target Plan */}
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Target Plan Tier</label>
                <select
                  value={giftForm.plan}
                  onChange={e => setGiftForm({ ...giftForm, plan: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #CBD5E1', fontSize: '12.5px', background: '#FFFFFF', boxSizing: 'border-box' }}
                >
                  <option value="pro">Pro ($4/Month per Site Model)</option>
                  <option value="free">Revert / Downgrade to Free Tier</option>
                </select>
              </div>

              {/* Duration Presets */}
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Subscription Duration
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '6px', marginBottom: giftForm.preset === 'custom' ? '8px' : '0' }}>
                  {[
                    { id: '30', label: '30 Days' },
                    { id: '90', label: '90 Days' },
                    { id: '365', label: '1 Year' },
                    { id: 'lifetime', label: 'Lifetime' },
                    { id: 'custom', label: 'Custom' },
                  ].map(p => {
                    const active = giftForm.preset === p.id
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => setGiftForm({ ...giftForm, preset: p.id })}
                        style={{
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: active ? '1px solid #7C3AED' : '1px solid #E2E8F0',
                          background: active ? '#F5F3FF' : '#FFFFFF',
                          color: active ? '#7C3AED' : '#334155',
                          fontSize: '11.5px',
                          fontWeight: active ? '700' : '500',
                          cursor: 'pointer',
                          transition: 'all 0.12s ease'
                        }}
                      >
                        {p.label}
                      </button>
                    )
                  })}
                </div>
                {giftForm.preset === 'custom' && (
                  <div style={{ marginTop: '8px' }}>
                    <input
                      type="number"
                      min="1"
                      placeholder="Enter number of days"
                      value={giftForm.duration_days}
                      onChange={e => setGiftForm({ ...giftForm, duration_days: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                )}
              </div>

              {/* Website Limit Quota ($4/site model) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontWeight: '600', color: '#334155' }}>
                    Allowed Protected Websites Quota
                  </label>
                  <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: '600' }}>$4/site billing rule</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '6px', marginBottom: giftForm.limit_preset === 'custom' ? '8px' : '0' }}>
                  {[
                    { id: '1', label: '1 Site' },
                    { id: '5', label: '5 Sites' },
                    { id: '10', label: '10 Sites' },
                    { id: '25', label: '25 Sites' },
                    { id: '50', label: '50 Sites' },
                    { id: 'unlimited', label: 'Unlimited' },
                    { id: 'custom', label: 'Custom' },
                  ].map(q => {
                    const active = giftForm.limit_preset === q.id
                    return (
                      <button
                        type="button"
                        key={q.id}
                        onClick={() => setGiftForm({ ...giftForm, limit_preset: q.id })}
                        style={{
                          padding: '7px 8px',
                          borderRadius: '6px',
                          border: active ? '1px solid #2563EB' : '1px solid #E2E8F0',
                          background: active ? '#EFF6FF' : '#FFFFFF',
                          color: active ? '#2563EB' : '#334155',
                          fontSize: '11.5px',
                          fontWeight: active ? '700' : '500',
                          cursor: 'pointer',
                          transition: 'all 0.12s ease'
                        }}
                      >
                        {q.label}
                      </button>
                    )
                  })}
                </div>
                {giftForm.limit_preset === 'custom' && (
                  <div style={{ marginTop: '8px' }}>
                    <input
                      type="number"
                      min="1"
                      placeholder="Enter max websites quota (e.g. 100)"
                      value={giftForm.custom_limit}
                      onChange={e => setGiftForm({ ...giftForm, custom_limit: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                )}
              </div>

              {/* Gift Note */}
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '5px' }}>Admin Audit Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. VIP Partner grant, Promotional campaign, Early adopter"
                  value={giftForm.gift_note}
                  onChange={e => setGiftForm({ ...giftForm, gift_note: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid #EFEFEF' }}>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  style={{ padding: '8px 16px', borderRadius: '7px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#334155', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ padding: '8px 18px', borderRadius: '7px', background: '#7C3AED', color: '#FFFFFF', border: 'none', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Gift size={14} />
                  <span>
                    {actionLoading ? 'Granting...' : modalType === 'bulk_gift' ? `Grant to ${selectedUserIds.size} Tenants` : 'Grant Subscription'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RESET PASSWORD */}
      {modalType === 'password' && selectedTenant && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1050,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(2px)',
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #EFEFEF',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            width: '100%',
            maxWidth: '440px',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #EFEFEF',
              background: '#FBFBFB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={17} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>
                  Reset Tenant Password
                </h3>
              </div>
              <button
                onClick={() => setModalType(null)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleChangePassword} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12.5px' }}>
              <p style={{ margin: 0, color: '#475569' }}>
                Setting new credentials for: <strong style={{ color: '#0F172A' }}>{selectedTenant.email}</strong>
              </p>

              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '5px' }}>New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordForm.new_password}
                  onChange={e => setPasswordForm({ new_password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid #EFEFEF' }}>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  style={{ padding: '8px 16px', borderRadius: '7px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#334155', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ padding: '8px 16px', borderRadius: '7px', background: '#2563EB', color: '#FFFFFF', border: 'none', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}
                >
                  {actionLoading ? 'Updating...' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING BULK ACTIONS TOOLBAR */}
      {selectedUserIds.size > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 900,
          background: '#0F172A',
          color: '#FFFFFF',
          padding: '10px 18px',
          borderRadius: '12px',
          boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          border: '1px solid #334155',
          maxWidth: '92vw',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              background: '#2563EB',
              color: '#FFFFFF',
              borderRadius: '999px',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: '700'
            }}>
              {selectedUserIds.size}
            </span>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>
              {selectedUserIds.size === 1 ? 'Tenant selected' : 'Tenants selected'}
            </span>
          </div>

          <div style={{ height: '18px', width: '1px', background: '#334155' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setGiftForm({
                  plan: 'pro',
                  preset: '30',
                  duration_days: 30,
                  limit_preset: '1',
                  custom_limit: 1,
                  gift_note: ''
                })
                setModalType('bulk_gift')
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: '#7C3AED',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <Gift size={13} />
              <span>Gift Pro Plan</span>
            </button>

            <button
              type="button"
              onClick={() => handleBulkAction('suspend')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: '#1E293B',
                color: '#F8FAFC',
                border: '1px solid #334155',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <Lock size={13} />
              <span>Suspend</span>
            </button>

            <button
              type="button"
              onClick={() => handleBulkAction('restore')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: '#1E293B',
                color: '#F8FAFC',
                border: '1px solid #334155',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <Unlock size={13} />
              <span>Restore</span>
            </button>

            <button
              type="button"
              onClick={() => handleBulkAction('delete')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: '#DC2626',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedUserIds(new Set())}
              style={{
                padding: '6px 8px',
                background: 'transparent',
                color: '#94A3B8',
                border: 'none',
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Deselect All
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
