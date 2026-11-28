import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  ShieldCheck,
  Sliders,
  Megaphone,
  KeyRound,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Activity,
  Lock,
  UserCheck,
  UserX,
  RotateCw,
  Save
} from 'lucide-react'
import api from '../api/api'
import userStore from '../utils/userStore'

const FALLBACK_PERM_CATALOG = [
  { key: 'support.tickets', label: 'Support Desk & Tickets', description: 'View customer tickets, reply, and update ticket status.' },
  { key: 'support.inspector', label: 'Remote Inspector', description: 'Diagnose customer WordPress sites, sync status, and plugin health.' },
  { key: 'users.view', label: 'View Customers & Sites', description: 'Browse customer profiles, subscription status, and connected websites.' },
  { key: 'users.troubleshoot', label: 'Account Troubleshooting', description: 'Unlock brute-force lockouts, verify emails, reset MFA, and force logout.' },
  { key: 'users.impersonate', label: 'Dashboard Impersonation', description: "Open a temporary read/debug session inside a customer's dashboard (audited)." },
  { key: 'users.billing', label: 'Plan & Quota Adjustments', description: 'Gift plans, extend trials, and adjust website quota for customers.' },
  { key: 'security.blacklist.unblock', label: 'Unblock False-Positive IPs', description: 'Remove mistakenly blocked IPs from customer or fleet blacklists.' }
]

const FALLBACK_ROLE_DEFAULTS = {
  support_lead: ['support.tickets', 'support.inspector', 'users.view', 'users.troubleshoot', 'users.impersonate', 'users.billing', 'security.blacklist.unblock'],
  support_agent: ['support.tickets', 'support.inspector', 'users.view', 'users.troubleshoot', 'security.blacklist.unblock']
}

export default function Settings() {
  const adminProfile = userStore.get('admin_profile') || userStore.get('profile') || {}
  const perms = Array.isArray(adminProfile.permissions) ? adminProfile.permissions : []
  const isOwner = Boolean(
    adminProfile.role === 'super_admin' ||
    adminProfile.role === 'admin' ||
    adminProfile.is_owner ||
    perms.includes('*')
  )

  const [activeTab, setActiveTab] = useState(isOwner ? 'team' : 'account')
  const [toast, setToast] = useState(null)

  // Tab 1: Team & Support RBAC
  const [teamLoading, setTeamLoading] = useState(false)
  const [members, setMembers] = useState([])
  const [permCatalog, setPermCatalog] = useState(FALLBACK_PERM_CATALOG)
  const [roleDefaults, setRoleDefaults] = useState(FALLBACK_ROLE_DEFAULTS)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newMember, setNewMember] = useState({ name: '', email: '', password: '', role: 'support_agent', permissions: [] })
  const [editingMember, setEditingMember] = useState(null)
  const [savingTeam, setSavingTeam] = useState(false)

  // Tab 2: Platform & Baseline Rate Limit + Feature Flags
  const [platform, setPlatform] = useState({
    platform_name: 'MDefender',
    support_email: '',
    allow_public_signup: true,
    default_trial_days: 14,
    default_rate_limit_rpm: 120,
    maintenance_mode: false
  })
  const [flags, setFlags] = useState({})
  const [savingPlatform, setSavingPlatform] = useState(false)

  // Tab 3: Broadcast & System Health + Test Email
  const [notices, setNotices] = useState([])
  const [noticeForm, setNoticeForm] = useState({ title: '', message: '', severity: 'info' })
  const [sendingNotice, setSendingNotice] = useState(false)
  const [health, setHealth] = useState(null)
  const [testEmailAddr, setTestEmailAddr] = useState(adminProfile.email || '')
  const [sendingTestEmail, setSendingTestEmail] = useState(false)

  // Tab 4: My Account & Security
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm_password: '' })
  const [changingPw, setChangingPw] = useState(false)

  const showToast = (text, isError = false) => {
    setToast({ text, isError })
    setTimeout(() => setToast(null), 4000)
  }

  const loadOwnerData = useCallback(async () => {
    if (!isOwner) return
    setTeamLoading(true)
    try {
      const [teamRes, platRes, flagsRes, noticesRes, healthRes] = await Promise.allSettled([
        api.adminGetTeam(),
        api.adminGetPlatformSettings(),
        api.adminGetFlags(),
        api.adminGetBroadcastNotices(),
        api.adminGetSystemHealth()
      ])
      if (teamRes.status === 'fulfilled' && teamRes.value) {
        const d = teamRes.value.data || teamRes.value
        setMembers(d.members || [])
        setPermCatalog(d.permission_catalog || [])
        setRoleDefaults(d.role_defaults || {})
      }
      if (platRes.status === 'fulfilled' && platRes.value) {
        const d = platRes.value.data || platRes.value
        setPlatform(prev => ({ ...prev, ...d }))
      }
      if (flagsRes.status === 'fulfilled' && flagsRes.value) {
        const d = flagsRes.value.data || flagsRes.value
        setFlags(d.flags || {})
      }
      if (noticesRes.status === 'fulfilled' && noticesRes.value) {
        const d = noticesRes.value.data || noticesRes.value
        setNotices(d.notices || [])
      }
      if (healthRes.status === 'fulfilled' && healthRes.value) {
        const d = healthRes.value.data || healthRes.value
        setHealth(d)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setTeamLoading(false)
    }
  }, [isOwner])

  useEffect(() => {
    loadOwnerData()
  }, [loadOwnerData])

  const handleOpenAddModal = () => {
    const defPerms = roleDefaults.support_agent || ['support.tickets', 'support.inspector', 'users.view', 'users.troubleshoot', 'security.blacklist.unblock']
    setNewMember({ name: '', email: '', password: '', role: 'support_agent', permissions: [...defPerms] })
    setShowAddModal(true)
  }

  const handleCreateMember = async (e) => {
    e.preventDefault()
    setSavingTeam(true)
    try {
      const res = await api.adminCreateTeamMember(newMember)
      showToast(res.message || 'Support member created')
      setShowAddModal(false)
      loadOwnerData()
    } catch (err) {
      showToast(err.message || 'Failed to create team member', true)
    } finally {
      setSavingTeam(false)
    }
  }

  const handleSavePermissions = async () => {
    if (!editingMember) return
    setSavingTeam(true)
    try {
      await api.adminUpdateTeamPermissions(editingMember.id, {
        role: editingMember.role,
        permissions: editingMember.permissions
      })
      showToast(`Permissions updated for ${editingMember.email}`)
      setEditingMember(null)
      loadOwnerData()
    } catch (err) {
      showToast(err.message || 'Failed to update permissions', true)
    } finally {
      setSavingTeam(false)
    }
  }

  const handleToggleMemberStatus = async (m) => {
    try {
      const res = await api.adminToggleTeamStatus(m.id)
      showToast(res.message || `Updated status for ${m.email}`)
      loadOwnerData()
    } catch (err) {
      showToast(err.message || 'Failed to toggle status', true)
    }
  }

  const handleSavePlatform = async (e) => {
    e.preventDefault()
    setSavingPlatform(true)
    try {
      await api.adminUpdatePlatformSettings(platform)
      showToast('Platform settings & default baseline saved')
    } catch (err) {
      showToast(err.message || 'Failed to save platform settings', true)
    } finally {
      setSavingPlatform(false)
    }
  }

  const handleToggleFlag = async (name, currentVal) => {
    try {
      await api.adminUpdateFlag({ name, enabled: !currentVal })
      setFlags(prev => ({ ...prev, [name]: !currentVal }))
      showToast(`Feature "${name}" ${!currentVal ? 'enabled' : 'disabled'}`)
    } catch (err) {
      showToast(err.message || 'Failed to update feature flag', true)
    }
  }

  const handleSendNotice = async (e) => {
    e.preventDefault()
    if (!noticeForm.title.trim() || !noticeForm.message.trim()) return
    setSendingNotice(true)
    try {
      await api.adminCreateBroadcastNotice(noticeForm)
      showToast('Broadcast notice published to all user dashboards')
      setNoticeForm({ title: '', message: '', severity: 'info' })
      loadOwnerData()
    } catch (err) {
      showToast(err.message || 'Failed to publish notice', true)
    } finally {
      setSendingNotice(false)
    }
  }

  const handleSendTestEmail = async (e) => {
    e.preventDefault()
    setSendingTestEmail(true)
    try {
      const res = await api.adminSendTestEmail(testEmailAddr)
      showToast(res.message || 'Test email sent successfully')
    } catch (err) {
      showToast(err.message || 'Failed to send test email', true)
    } finally {
      setSendingTestEmail(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (pwForm.new_password !== pwForm.confirm_password) {
      showToast('New passwords do not match', true)
      return
    }
    setChangingPw(true)
    try {
      const res = await api.changeAdminPassword({
        old_password: pwForm.old_password,
        new_password: pwForm.new_password
      })
      if (res.status === 'success') {
        setPwForm({ old_password: '', new_password: '', confirm_password: '' })
        showToast('Password updated successfully!')
      } else {
        showToast(res.message || 'Failed to change password', true)
      }
    } catch (err) {
      showToast(err.message || 'Failed to change password', true)
    } finally {
      setChangingPw(false)
    }
  }

  const tabs = [
    ...(isOwner ? [
      { id: 'team', label: 'Team & Support RBAC', icon: Users },
      { id: 'platform', label: 'Platform & Default Baseline', icon: Sliders },
      { id: 'comms', label: 'Broadcast & System Health', icon: Megaphone }
    ] : []),
    { id: 'account', label: 'My Account & Security', icon: KeyRound }
  ]

  return (
    <div style={{ padding: '4px 0 32px' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '24px', zIndex: 9999,
          padding: '12px 18px', borderRadius: '10px',
          background: toast.isError ? '#FEF2F2' : '#ECFDF5',
          border: `1px solid ${toast.isError ? '#FECACA' : '#A7F3D0'}`,
          color: toast.isError ? '#DC2626' : '#059669',
          fontWeight: 700, fontSize: '13px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {toast.isError ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: '800', color: '#0F172A' }}>
            System Settings &amp; Access Control
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
            {isOwner
              ? 'Manage Support Team permissions, global SaaS defaults, platform notices, and account security.'
              : 'Manage your Support Team account password and view your assigned permissions.'}
          </p>
        </div>
        <span style={{
          fontSize: '11.5px', fontWeight: '800', padding: '5px 12px', borderRadius: '9999px',
          background: isOwner ? '#EFF6FF' : '#F0FDF4',
          color: isOwner ? '#1D4ED8' : '#15803D',
          border: `1px solid ${isOwner ? '#BFDBFE' : '#BBF7D0'}`
        }}>
          {isOwner ? 'Owner (Full Control)' : `Role: ${adminProfile.role || 'Support'}`}
        </span>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '18px', borderBottom: '1px solid #D9E1DC', flexWrap: 'wrap' }}>
        {tabs.map(t => {
          const Icon = t.icon
          const active = activeTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '10px 16px',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                background: active ? '#FFFFFF' : 'transparent',
                color: active ? '#2563EB' : '#64748B',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                borderBottom: active ? '2.5px solid #2563EB' : '2.5px solid transparent',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px'
              }}
            >
              <Icon size={15} />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* ==================== TAB 1: TEAM & SUPPORT RBAC ==================== */}
      {activeTab === 'team' && isOwner && (
        <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #D9E1DC', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #D9E1DC', background: '#FBFCFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>Owner &amp; Support Team Members</h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                Support members log in at <code>/admin/login</code> and only see tools you grant them. Pricing, Settings, Rules &amp; User Deletion stay locked to Owner.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddModal}
              style={{ padding: '8px 14px', borderRadius: '8px', background: '#2563EB', color: '#FFFFFF', border: 'none', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={15} />
              <span>Add Support Member</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '720px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #D9E1DC', color: '#475569', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 18px' }}>Member</th>
                  <th style={{ padding: '12px 16px' }}>Role</th>
                  <th style={{ padding: '12px 16px' }}>Granted Permissions</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teamLoading && members.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>Loading team members...</td></tr>
                ) : members.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>No team accounts found.</td></tr>
                ) : members.map(m => {
                  const isRowOwner = m.role === 'super_admin' || m.role === 'admin'
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid #ECEFEF' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: '700', color: '#0F172A' }}>{m.name || 'Administrator'}</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>{m.email}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontSize: '11.5px', fontWeight: '700', padding: '3px 9px', borderRadius: '9999px',
                          background: isRowOwner ? '#EFF6FF' : '#F1F5F9',
                          color: isRowOwner ? '#1D4ED8' : '#334155',
                          border: `1px solid ${isRowOwner ? '#BFDBFE' : '#CBD5E1'}`
                        }}>
                          {isRowOwner ? 'Owner (super_admin)' : m.role}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {isRowOwner ? (
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#059669' }}>All Permissions (*)</span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {(m.permissions || []).map(p => (
                              <span key={p} style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '6px', background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#475569' }}>
                                {p}
                              </span>
                            ))}
                            {(!m.permissions || m.permissions.length === 0) && <span style={{ fontSize: '12px', color: '#94A3B8' }}>None</span>}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontSize: '11.5px', fontWeight: '700', padding: '3px 8px', borderRadius: '9999px',
                          background: m.status === 'suspended' ? '#FEF2F2' : '#ECFDF5',
                          color: m.status === 'suspended' ? '#DC2626' : '#059669'
                        }}>
                          {m.status === 'suspended' ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        {isRowOwner ? (
                          <span style={{ fontSize: '11.5px', color: '#94A3B8', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Lock size={12} /> Protected
                          </span>
                        ) : (
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setEditingMember({ ...m, permissions: [...(m.permissions || [])] })}
                              style={{ padding: '5px 10px', borderRadius: '6px', background: '#FFFFFF', border: '1px solid #CBD5E1', fontSize: '11.5px', fontWeight: '600', color: '#0F172A', cursor: 'pointer' }}
                            >
                              Edit Access
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleMemberStatus(m)}
                              style={{ padding: '5px 10px', borderRadius: '6px', background: '#FFFFFF', border: '1px solid #FECACA', fontSize: '11.5px', fontWeight: '600', color: m.status === 'suspended' ? '#059669' : '#DC2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              {m.status === 'suspended' ? <UserCheck size={12} /> : <UserX size={12} />}
                              <span>{m.status === 'suspended' ? 'Activate' : 'Suspend'}</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: PLATFORM & DEFAULT BASELINE ==================== */}
      {activeTab === 'platform' && isOwner && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #D9E1DC', padding: '20px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>Platform &amp; Default Rate-Limit Baseline</h3>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748B' }}>
              Global defaults applied automatically to new signups and any website without a custom rate limit.
            </p>
            <form onSubmit={handleSavePlatform} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>Platform Name</label>
                <input type="text" value={platform.platform_name} onChange={e => setPlatform({ ...platform, platform_name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>Support Contact Email</label>
                <input type="email" value={platform.support_email} onChange={e => setPlatform({ ...platform, support_email: e.target.value })} placeholder="support@yourdomain.com"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>Default Trial (Days)</label>
                  <input type="number" min="1" max="90" value={platform.default_trial_days} onChange={e => setPlatform({ ...platform, default_trial_days: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>Default Baseline Rate Limit (RPM)</label>
                  <input type="number" min="10" max="10000" value={platform.default_rate_limit_rpm} onChange={e => setPlatform({ ...platform, default_rate_limit_rpm: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}>
                <input type="checkbox" checked={platform.allow_public_signup} onChange={e => setPlatform({ ...platform, allow_public_signup: e.target.checked })} />
                <span>Allow Public Customer Registration</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: '#DC2626', cursor: 'pointer' }}>
                <input type="checkbox" checked={platform.maintenance_mode} onChange={e => setPlatform({ ...platform, maintenance_mode: e.target.checked })} />
                <span>Enable Maintenance Mode (Shows notice to tenants)</span>
              </label>
              <button type="submit" disabled={savingPlatform} style={{ padding: '9px 16px', borderRadius: '8px', background: '#2563EB', color: '#FFFFFF', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start' }}>
                <Save size={14} />
                <span>{savingPlatform ? 'Saving...' : 'Save Platform Defaults'}</span>
              </button>
            </form>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #D9E1DC', padding: '20px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>Live Feature Flags</h3>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748B' }}>
              Toggle platform capabilities in real time without restarting backend services.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.keys(flags).length === 0 ? (
                <div style={{ fontSize: '13px', color: '#94A3B8', padding: '20px 0' }}>No feature flags registered.</div>
              ) : Object.entries(flags).map(([name, enabled]) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', fontFamily: 'monospace' }}>{name}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleFlag(name, Boolean(enabled))}
                    style={{
                      padding: '4px 12px', borderRadius: '9999px', fontSize: '11.5px', fontWeight: '700', border: 'none', cursor: 'pointer',
                      background: enabled ? '#DCFCE7' : '#E2E8F0',
                      color: enabled ? '#15803D' : '#475569'
                    }}
                  >
                    {enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: BROADCAST & SYSTEM HEALTH ==================== */}
      {activeTab === 'comms' && isOwner && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #D9E1DC', padding: '20px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>Broadcast Notice to All Tenants</h3>
            <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#64748B' }}>
              Display an urgent announcement banner across all customer dashboards.
            </p>
            <form onSubmit={handleSendNotice} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" required placeholder="Notice Title (e.g. Scheduled Maintenance)" value={noticeForm.title} onChange={e => setNoticeForm({ ...noticeForm, title: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }} />
              <textarea required rows="3" placeholder="Message for customers..." value={noticeForm.message} onChange={e => setNoticeForm({ ...noticeForm, message: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }} />
              <select value={noticeForm.severity} onChange={e => setNoticeForm({ ...noticeForm, severity: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#FFFFFF' }}>
                <option value="info">Info (Blue)</option>
                <option value="warning">Warning (Amber)</option>
                <option value="critical">Critical (Red)</option>
              </select>
              <button type="submit" disabled={sendingNotice} style={{ padding: '9px 16px', borderRadius: '8px', background: '#2563EB', color: '#FFFFFF', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer', alignSelf: 'flex-start' }}>
                {sendingNotice ? 'Publishing...' : 'Publish Broadcast'}
              </button>
            </form>
            {notices.length > 0 && (
              <div style={{ marginTop: '16px', borderTop: '1px solid #E2E8F0', paddingTop: '12px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#64748B', marginBottom: '8px' }}>ACTIVE NOTICES ({notices.length})</div>
                {notices.slice(0, 3).map((n, i) => (
                  <div key={i} style={{ fontSize: '12px', padding: '8px 10px', borderRadius: '6px', background: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '6px' }}>
                    <div style={{ fontWeight: '700', color: '#0F172A' }}>{n.title}</div>
                    <div style={{ color: '#475569' }}>{n.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #D9E1DC', padding: '20px' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={16} color="#2563EB" /> SMTP Health Check (from VPS .env)
              </h3>
              <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64748B' }}>
                SMTP credentials stay safely in <code>backend/.env</code>. Send a test email to verify delivery.
              </p>
              <form onSubmit={handleSendTestEmail} style={{ display: 'flex', gap: '8px' }}>
                <input type="email" required value={testEmailAddr} onChange={e => setTestEmailAddr(e.target.value)} placeholder="admin@yourdomain.com"
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }} />
                <button type="submit" disabled={sendingTestEmail} style={{ padding: '8px 14px', borderRadius: '6px', background: '#0F172A', color: '#FFFFFF', border: 'none', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer' }}>
                  {sendingTestEmail ? 'Sending...' : 'Send Test'}
                </button>
              </form>
            </div>

            <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #D9E1DC', padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={16} color="#059669" /> System Health
              </h3>
              {health?.checks ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.entries(health.checks).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '6px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '12.5px' }}>
                      <span style={{ fontWeight: '600', color: '#334155' }}>{v.label || k}</span>
                      <span style={{ fontWeight: '700', color: v.ok ? '#059669' : '#DC2626' }}>{v.ok ? 'Healthy' : 'Issue'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '12.5px', color: '#94A3B8' }}>Loading system diagnostics...</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: MY ACCOUNT & SECURITY ==================== */}
      {activeTab === 'account' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px', maxWidth: '860px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #D9E1DC', padding: '20px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>Change Password</h3>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748B' }}>
              Signed in as <b>{adminProfile.email || 'Admin'}</b>
            </p>
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>Current Password</label>
                <input type="password" required value={pwForm.old_password} onChange={e => setPwForm({ ...pwForm, old_password: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>New Password</label>
                <input type="password" required minLength={6} value={pwForm.new_password} onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>Confirm New Password</label>
                <input type="password" required value={pwForm.confirm_password} onChange={e => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <button type="submit" disabled={changingPw} style={{ padding: '9px 16px', borderRadius: '8px', background: '#2563EB', color: '#FFFFFF', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer', alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <RotateCw size={13} className={changingPw ? 'animate-spin' : ''} />
                <span>{changingPw ? 'Updating...' : 'Update Password'}</span>
              </button>
            </form>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #D9E1DC', padding: '20px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} color="#059669" /> My Active Permissions
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#64748B' }}>
              Access scope assigned to your account.
            </p>
            {isOwner ? (
              <div style={{ padding: '12px', borderRadius: '8px', background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', fontSize: '13px', fontWeight: '700' }}>
                Owner (super_admin) — Full Unrestricted Access (*)
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {perms.map(p => (
                  <span key={p} style={{ fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '9999px', background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD SUPPORT MEMBER ==================== */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '22px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>Add Support Team Member</h3>
            <form onSubmit={handleCreateMember} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" required placeholder="Full Name" value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }} />
              <input type="email" required placeholder="Email Address" value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }} />
              <input type="password" required minLength={6} placeholder="Temporary Password (min 6 chars)" value={newMember.password} onChange={e => setNewMember({ ...newMember, password: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }} />
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Support Role</label>
                <select
                  value={newMember.role}
                  onChange={e => {
                    const r = e.target.value
                    setNewMember({ ...newMember, role: r, permissions: [...(roleDefaults[r] || newMember.permissions)] })
                  }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#FFFFFF' }}
                >
                  <option value="support_agent">Support Agent (Standard)</option>
                  <option value="support_lead">Support Lead (Senior)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Granular Permissions</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {permCatalog.map(p => {
                    const checked = newMember.permissions.includes(p.key)
                    return (
                      <label key={p.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px', padding: '6px 8px', borderRadius: '6px', background: '#F8FAFC', border: '1px solid #E2E8F0', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = checked ? newMember.permissions.filter(x => x !== p.key) : [...newMember.permissions, p.key]
                            setNewMember({ ...newMember, permissions: next })
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: '700', color: '#0F172A' }}>{p.label}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{p.description}</div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontWeight: '600', fontSize: '12.5px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={savingTeam} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer' }}>
                  {savingTeam ? 'Creating...' : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: EDIT SUPPORT PERMISSIONS ==================== */}
      {editingMember && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '22px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>Edit Support Access</h3>
            <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#64748B' }}>{editingMember.email}</p>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Role</label>
              <select
                value={editingMember.role}
                onChange={e => setEditingMember({ ...editingMember, role: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#FFFFFF' }}
              >
                <option value="support_agent">Support Agent (Standard)</option>
                <option value="support_lead">Support Lead (Senior)</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              {permCatalog.map(p => {
                const checked = (editingMember.permissions || []).includes(p.key)
                return (
                  <label key={p.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px', padding: '6px 8px', borderRadius: '6px', background: '#F8FAFC', border: '1px solid #E2E8F0', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = checked ? editingMember.permissions.filter(x => x !== p.key) : [...editingMember.permissions, p.key]
                        setEditingMember({ ...editingMember, permissions: next })
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: '700', color: '#0F172A' }}>{p.label}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{p.description}</div>
                    </div>
                  </label>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setEditingMember(null)} style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontWeight: '600', fontSize: '12.5px', cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={handleSavePermissions} disabled={savingTeam} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer' }}>
                {savingTeam ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
