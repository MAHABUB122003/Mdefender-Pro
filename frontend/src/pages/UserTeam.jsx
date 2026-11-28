import { useState, useMemo, useEffect } from 'react'
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Globe,
  Key,
  Trash2,
  Check,
  AlertTriangle,
  Mail,
  Lock,
  Clock,
  Sparkles,
  Layers,
  ChevronDown,
  X,
  Search,
  Sliders,
  ExternalLink,
  RotateCw,
  Send,
  Eye,
  FileText,
  Activity,
  CheckCircle2,
  UserCheck,
  RefreshCw
} from 'lucide-react'
import api from '../api/api'
import userStore from '../utils/userStore'

export const TEAM_ROLES = [
  {
    id: 'owner',
    title: 'Workspace Owner (Full Access)',
    badge: 'FULL ACCESS',
    color: '#10201E',
    bg: '#FAFBF9',
    border: '#D9E1DC',
    desc: 'Unrestricted control over billing, subscription plans, adding/removing websites, team members, and all security controls.',
    permissions: ['Billing & Subscriptions', 'Add & Remove Websites', 'WAF & Malware Scanner', 'WP Updates & Backups', 'Manage Team & Roles', 'API Master Keys']
  },
  {
    id: 'secops',
    title: 'Security Manager',
    badge: 'SECURITY LEAD',
    color: '#15803D',
    bg: '#F0FDF4',
    border: '#DCFCE7',
    desc: 'Manages Edge WAF, IP/Country blocking, Malware Scanner, Security Hardening, Bot Shield, 2FA, and Post-Hack recovery.',
    permissions: ['WAF & Rate Limits', 'IP & Country Blocking', 'Malware Scanner & Hardening', 'Bot Shield & Login Gateway', 'Post-Hack Recovery']
  },
  {
    id: 'devops',
    title: 'WordPress Developer',
    badge: 'WP MANAGEMENT',
    color: '#0284C7',
    bg: '#F0F9FF',
    border: '#BAE6FD',
    desc: 'Manages WordPress plugins, themes, core updates, Safe Updates, cloud backups, database optimization, and uptime/performance.',
    permissions: ['Plugins, Themes & Core', 'Safe Updates & Rollbacks', 'Cloud Backups & Restore', 'Database Optimizer', 'Uptime & Broken Links']
  },
  {
    id: 'auditor',
    title: 'Read-Only Viewer',
    badge: 'READ-ONLY',
    color: '#475569',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    desc: 'Read-only visibility into live traffic, security reports, monitoring, and audit logs. Cannot modify any site or rule.',
    permissions: ['View Live Traffic & Logs', 'Download Security Reports', 'View Monitoring & Uptime', 'View Activity & Audit Trail']
  }
]

function ScopePicker({ websites, value, onChange }) {
  const isAll = !value || value === 'all' || value.startsWith('Global')
  const selectedList = isAll ? [] : value.split(',').map(s => s.trim()).filter(Boolean)

  const toggleSite = (domain) => {
    const next = selectedList.includes(domain)
      ? selectedList.filter(d => d !== domain)
      : [...selectedList, domain]
    onChange(next.length === 0 ? 'all' : next.join(', '))
  }

  return (
    <div style={{ border: '1px solid #D9E1DC', borderRadius: '10px', padding: '10px 12px', background: '#FAFBF9' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', fontWeight: '700', color: '#10201E' }}>
        <input
          type="checkbox"
          checked={isAll}
          onChange={() => onChange(isAll && websites[0] ? (websites[0].domain || websites[0].name || 'all') : 'all')}
          style={{ accentColor: '#10201E', width: '15px', height: '15px' }}
        />
        <span>Global Workspace (All Connected Sites)</span>
      </label>
      {websites.length > 0 && (
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #E2E8F0', maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {websites.map((w, idx) => {
            const d = w.domain || w.name || `Site #${idx + 1}`
            const checked = !isAll && selectedList.includes(d)
            return (
              <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSite(d)}
                  style={{ accentColor: '#15803D', width: '14px', height: '14px' }}
                />
                <span>{d}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function UserTeam() {
  const cachedDashboard = userStore.get('dashboard') || userStore.get('websites')
  const rawWebsites = useMemo(() => cachedDashboard?.websites || [], [cachedDashboard])

  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('members') // 'members' | 'invites' | 'matrix' | 'audit'
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const [members, setMembers] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [seatLimit, setSeatLimit] = useState(1)

  // Modals & Forms
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [submittingInvite, setSubmittingInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    roleId: 'secops',
    scope: 'all',
    require2fa: true
  })
  const [editingMember, setEditingMember] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)

  const showToast = (text, type = 'success') => {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 4000)
  }

  // Load real team and audit logs from MongoDB API
  const loadTeamData = async () => {
    try {
      const [membersRes, auditRes] = await Promise.all([
        api.getTeamMembers().catch(() => null),
        api.getTeamAuditLogs().catch(() => null)
      ])

      if (membersRes?.data) {
        setMembers(membersRes.data.members || [])
        setPendingInvites(membersRes.data.pending_invites || [])
        setSeatLimit(membersRes.data.seats_total || 1)
      }
      if (auditRes?.data?.logs) {
        setAuditLogs(auditRes.data.logs)
      }
    } catch (err) {
      console.error('Failed to load team data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTeamData()
  }, [])

  // Quota & Seats
  const usedSeats = members.length
  const seatPercent = Math.min(100, Math.round((usedSeats / Math.max(1, seatLimit)) * 100))

  const handleInviteSubmit = async (e) => {
    e.preventDefault()
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      showToast('Please provide a valid name and business email.', 'error')
      return
    }

    setSubmittingInvite(true)
    try {
      const res = await api.inviteTeamMember({
        name: inviteForm.name.trim(),
        email: inviteForm.email.trim(),
        role_id: inviteForm.roleId,
        scope: inviteForm.scope,
        require_2fa: inviteForm.require2fa
      })
      await loadTeamData()
      setShowInviteModal(false)
      setActiveTab('invites')
      setInviteForm({
        name: '',
        email: '',
        roleId: 'secops',
        scope: 'all',
        require2fa: true
      })
      showToast(res.message || `Invitation created for ${inviteForm.email}!`)
    } catch (err) {
      showToast(err.message || 'Failed to dispatch team member invitation.', 'error')
    } finally {
      setSubmittingInvite(false)
    }
  }

  const handleDeleteMember = async (id, name) => {
    if (!confirm(`Are you sure you want to revoke enterprise access for ${name}?`)) return
    try {
      await api.deleteTeamMember(id)
      await loadTeamData()
      showToast(`Access revoked for ${name}.`)
    } catch (err) {
      showToast(err.message || 'Failed to revoke member access.', 'error')
    }
  }

  const handleUpdateMemberSubmit = async (e) => {
    e.preventDefault()
    if (!editingMember) return
    setSavingEdit(true)
    try {
      await api.updateTeamMember(editingMember.id, {
        role_id: editingMember.roleId,
        scope: editingMember.scope,
        require_2fa: editingMember.twoFactor
      })
      await loadTeamData()
      showToast(`Updated role & scope for ${editingMember.name}.`)
      setEditingMember(null)
    } catch (err) {
      showToast(err.message || 'Failed to update member permissions.', 'error')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleToggleSuspendMember = async (m) => {
    const isSusp = m.status === 'suspended'
    const actionLabel = isSusp ? 'reactivate' : 'suspend'
    if (!confirm(`Are you sure you want to ${actionLabel} ${m.name}?`)) return
    try {
      const res = await api.toggleSuspendTeamMember(m.id)
      await loadTeamData()
      showToast(res?.message || `${m.name} ${isSusp ? 'reactivated' : 'suspended'}.`)
    } catch (err) {
      showToast(err.message || `Failed to ${actionLabel} member.`, 'error')
    }
  }

  const handleRevokeInvite = async (id, email) => {
    try {
      await api.revokeTeamInvite(id)
      await loadTeamData()
      showToast(`Invitation for ${email} cancelled.`)
    } catch (err) {
      showToast(err.message || 'Failed to revoke invitation.', 'error')
    }
  }

  const handleResendInvite = async (inv) => {
    try {
      const res = await api.resendTeamInvite(inv.id)
      showToast(res?.message || `Invitation refreshed for ${inv.email}!`)
    } catch (err) {
      showToast(err.message || 'Failed to refresh invitation.', 'error')
    }
  }

  const handleCopyInviteLink = async (inv) => {
    if (!inv.inviteUrl) return
    try {
      await navigator.clipboard.writeText(inv.inviteUrl)
      showToast(`Invite link copied for ${inv.email}!`)
    } catch {
      showToast(inv.inviteUrl)
    }
  }

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchSearch = !searchQuery.trim() ||
        (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.scope || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchRole = roleFilter === 'all' || m.roleId === roleFilter
      return matchSearch && matchRole
    })
  }, [members, searchQuery, roleFilter])

  return (
    <div style={{ maxWidth: '1720px', margin: '0 auto', padding: '4px 0 40px' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          background: toastMsg.type === 'error' ? '#DC2626' : '#10201E',
          color: '#FFFFFF', padding: '12px 20px', borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(16, 32, 30, 0.25)', zIndex: 9999,
          fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px',
          fontSize: '13px'
        }}>
          {toastMsg.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} style={{ color: '#15803D' }} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Executive Clean Header */}
      <div style={{
        background: '#FFFFFF', border: '1px solid #D9E1DC',
        borderRadius: '16px', padding: '24px 28px', marginBottom: '20px',
        boxShadow: '0 4px 20px -2px rgba(16, 32, 30, 0.05)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: '#FAFBF9', border: '1.5px solid #D9E1DC',
            color: '#10201E', display: 'flex', alignItems: 'center',
            justifyContent: 'center', boxShadow: '0 2px 8px rgba(16, 32, 30, 0.06)',
            flexShrink: 0
          }}>
            <Users size={26} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#10201E', margin: 0, letterSpacing: '-0.3px' }}>
                Team &amp; Role-Based Access Control
              </h1>
              <span style={{
                background: '#F0FDF4', color: '#15803D', border: '1px solid #DCFCE7',
                padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
                fontWeight: '700', letterSpacing: '0.5px'
              }}>
                ENTERPRISE RBAC
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#60716B', margin: '4px 0 0', maxWidth: '680px', lineHeight: '1.5' }}>
              Delegate granular access to SecOps leads, DevOps engineers, and compliance auditors. Control who can modify WAF rules, manage Anycast DNS records, or view sensitive security telemetry.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          style={{
            padding: '10px 22px', borderRadius: '9px', border: 'none',
            background: '#0B2522', border: '1px solid #0B2522', color: '#FFFFFF', fontSize: '13px',
            fontWeight: '700', cursor: 'pointer', display: 'inline-flex',
            alignItems: 'center', gap: '8px', boxShadow: '0 2px 10px rgba(16, 32, 30, 0.18)',
            transition: 'all 0.15s ease'
          }}
        >
          <UserPlus size={15} strokeWidth={2.4} />
          <span>Invite Team Member</span>
        </button>
      </div>

      {/* Seat Entitlement & Security Posture Bar */}
      <div style={{
        background: '#FFFFFF', border: '1px solid #D9E1DC',
        borderRadius: '14px', padding: '16px 22px', marginBottom: '22px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '16px', boxShadow: '0 2px 8px rgba(16, 32, 30, 0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '280px' }}>
          <div style={{
            padding: '7px 14px', borderRadius: '9px', background: '#FAFBF9',
            border: '1.5px solid #D9E1DC', color: '#10201E', fontSize: '13px',
            fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <ShieldCheck size={16} style={{ color: '#15803D' }} />
            <span>Seats: {usedSeats} / {seatLimit} Used</span>
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#10201E', marginBottom: '4px' }}>
              Enterprise Multi-User License
            </div>
            <div style={{ width: '160px', height: '6px', borderRadius: '3px', background: '#E2E8F0', overflow: 'hidden' }}>
              <div style={{ width: `${seatPercent}%`, height: '100%', background: '#15803D', borderRadius: '3px' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '20px', background: '#FAFBF9', border: '1px solid #D9E1DC', color: '#475569', fontWeight: '600' }}>
            <span style={{ color: '#15803D', marginRight: '6px', fontWeight: '800' }}>🔒</span>
            Mandatory 2FA Guard Active
          </span>
          <span style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '20px', background: '#FAFBF9', border: '1px solid #D9E1DC', color: '#475569', fontWeight: '600' }}>
            <span style={{ color: '#0284C7', marginRight: '6px', fontWeight: '800' }}>🛡️</span>
            Granular Domain Isolation
          </span>
          <span style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '20px', background: '#FAFBF9', border: '1px solid #D9E1DC', color: '#475569', fontWeight: '600' }}>
            <span style={{ color: '#D97706', marginRight: '6px', fontWeight: '800' }}>📝</span>
            Immutable Audit Trail
          </span>
        </div>
      </div>

      {/* Main Tabbed Container */}
      <div style={{
        background: '#FFFFFF', borderRadius: '16px',
        border: '1px solid #D9E1DC', boxShadow: '0 4px 18px rgba(16, 32, 30, 0.03)',
        overflow: 'hidden'
      }}>
        {/* Navigation Tabs Header */}
        <div className="mdf-team-tabs" style={{
          padding: '0 24px', background: '#FAFBF9', borderBottom: '1px solid #D9E1DC',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap'
        }}>
          <div className="mdf-team-tabs-list" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'members', label: `Active Members (${members.length})`, icon: Users },
              { id: 'invites', label: `Pending Invitations (${pendingInvites.length})`, icon: Mail },
              { id: 'matrix', label: 'Roles & Permissions Matrix', icon: Shield },
              { id: 'audit', label: 'Team Audit Trail', icon: FileText }
            ].map(t => {
              const Icon = t.icon
              const isSel = activeTab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`mdf-team-tab-btn ${isSel ? 'active' : ''}`}
                  style={{
                    padding: '14px 16px', background: 'none', border: 'none',
                    borderBottom: isSel ? '2.5px solid #10201E' : '2.5px solid transparent',
                    color: isSel ? '#10201E' : '#64748B', fontWeight: isSel ? '800' : '600',
                    fontSize: '13px', cursor: 'pointer', display: 'inline-flex',
                    alignItems: 'center', gap: '8px', transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={15} style={{ color: isSel ? 'inherit' : '#94A3B8' }} />
                  <span>{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab 1: Active Members */}
        {activeTab === 'members' && (
          <div>
            {/* Filter & Search Bar */}
            <div style={{
              padding: '14px 24px', borderBottom: '1px solid #F1F5F2',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: '12px', background: '#FFFFFF'
            }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Search members by name, email, or domain..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', height: '36px', padding: '0 12px 0 34px',
                    borderRadius: '8px', border: '1px solid #D9E1DC', fontSize: '12px',
                    background: '#FAFBF9', color: '#10201E', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#60716B' }}>Filter Role:</span>
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  style={{
                    height: '36px', padding: '0 12px', borderRadius: '8px',
                    border: '1px solid #D9E1DC', background: '#FFFFFF', color: '#10201E',
                    fontSize: '12px', fontWeight: '600', outline: 'none'
                  }}
                >
                  <option value="all">All Roles</option>
                  <option value="owner">Super Admin (Owner)</option>
                  <option value="secops">Security Operations (SecOps)</option>
                  <option value="devops">DevOps &amp; Infrastructure</option>
                  <option value="auditor">Compliance Auditor</option>
                </select>
              </div>
            </div>

            {/* Members Table: Desktop View */}
            <div className="mdf-team-desktop-table" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#FAFBF9', borderBottom: '1px solid #D9E1DC', color: '#60716B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    <th style={{ padding: '12px 20px' }}>Team Member</th>
                    <th style={{ padding: '12px 16px' }}>Assigned Role</th>
                    <th style={{ padding: '12px 16px' }}>Domain Access Scope</th>
                    <th style={{ padding: '12px 16px' }}>2FA Security</th>
                    <th style={{ padding: '12px 16px' }}>Last Telemetry</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((m, i) => {
                    const roleObj = TEAM_ROLES.find(r => r.id === m.roleId) || TEAM_ROLES[3]
                    return (
                      <tr key={m.id} style={{ borderBottom: i < filteredMembers.length - 1 ? '1px solid #F1F5F2' : 'none' }}>
                        {/* Name & Email */}
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '38px', height: '38px', borderRadius: '10px',
                              background: m.isOwner ? '#10201E' : '#FAFBF9',
                              border: '1.5px solid #D9E1DC',
                              color: m.isOwner ? '#FFFFFF' : '#10201E',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '13px', fontWeight: '800', flexShrink: 0
                            }}>
                              {m.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#10201E' }}>{m.name}</span>
                                {m.isOwner && (
                                  <span style={{
                                    fontSize: '10px', fontWeight: '800', padding: '1px 6px',
                                    borderRadius: '4px', background: '#F0FDF4', color: '#15803D',
                                    border: '1px solid #DCFCE7'
                                  }}>
                                    ACCOUNT OWNER
                                  </span>
                                )}
                                {m.status === 'suspended' && (
                                  <span style={{
                                    fontSize: '10px', fontWeight: '800', padding: '1px 6px',
                                    borderRadius: '4px', background: '#FEF2F2', color: '#DC2626',
                                    border: '1px solid #FECACA'
                                  }}>
                                    SUSPENDED
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '12px', color: '#60716B', marginTop: '2px' }}>{m.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td style={{ padding: '16px 16px' }}>
                          <span style={{
                            padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
                            fontWeight: '800', background: roleObj.bg, color: roleObj.color,
                            border: `1px solid ${roleObj.border}`
                          }}>
                            {roleObj.badge}: {roleObj.title.split('(')[0].trim()}
                          </span>
                        </td>

                        {/* Scope */}
                        <td style={{ padding: '16px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Globe size={13} style={{ color: '#60716B' }} />
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#10201E' }}>
                              {m.scope}
                            </span>
                          </div>
                        </td>

                        {/* 2FA */}
                        <td style={{ padding: '16px 16px' }}>
                          {m.twoFactor ? (
                            <span style={{
                              padding: '3px 8px', borderRadius: '6px', fontSize: '11px',
                              fontWeight: '700', background: '#F0FDF4', color: '#15803D',
                              border: '1px solid #DCFCE7', display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}>
                              <CheckCircle2 size={11} /> 2FA Enforced
                            </span>
                          ) : (
                            <span style={{
                              padding: '3px 8px', borderRadius: '6px', fontSize: '11px',
                              fontWeight: '700', background: '#FFFBEB', color: '#D97706',
                              border: '1px solid #FDE68A', display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}>
                              <Clock size={11} /> Setup Pending
                            </span>
                          )}
                        </td>

                        {/* Last Active */}
                        <td style={{ padding: '16px 16px', fontSize: '12px', color: '#60716B' }}>
                          {m.lastActive}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          {!m.isOwner ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => setEditingMember({
                                  id: m.id,
                                  name: m.name,
                                  email: m.email,
                                  roleId: m.roleId || 'secops',
                                  scope: m.scope && !m.scope.startsWith('Global') ? m.scope : 'all',
                                  twoFactor: Boolean(m.twoFactor)
                                })}
                                style={{
                                  padding: '6px 12px', borderRadius: '7px',
                                  background: '#FFFFFF', border: '1px solid #D9E1DC',
                                  color: '#10201E', fontSize: '11px', fontWeight: '700',
                                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px',
                                  transition: 'all 0.12s ease'
                                }}
                              >
                                <Sliders size={12} />
                                <span>Edit Role</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleSuspendMember(m)}
                                style={{
                                  padding: '6px 12px', borderRadius: '7px',
                                  background: m.status === 'suspended' ? '#F0FDF4' : '#FFFBEB',
                                  border: m.status === 'suspended' ? '1px solid #BBF7D0' : '1px solid #FDE68A',
                                  color: m.status === 'suspended' ? '#15803D' : '#B45309',
                                  fontSize: '11px', fontWeight: '700',
                                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px',
                                  transition: 'all 0.12s ease'
                                }}
                              >
                                <Lock size={12} />
                                <span>{m.status === 'suspended' ? 'Reactivate' : 'Suspend'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMember(m.id, m.name)}
                                style={{
                                  padding: '6px 12px', borderRadius: '7px',
                                  background: '#FFFFFF', border: '1px solid #D9E1DC',
                                  color: '#DC2626', fontSize: '11px', fontWeight: '700',
                                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px',
                                  transition: 'all 0.12s ease'
                                }}
                              >
                                <Trash2 size={12} />
                                <span>Revoke</span>
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600' }}>Master Key</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View: High-density stream cards */}
            <div className="mdf-team-mobile-list" style={{ padding: '12px' }}>
              {filteredMembers.map((m) => {
                const roleObj = TEAM_ROLES.find(r => r.id === m.roleId) || TEAM_ROLES[3]
                return (
                  <div key={m.id} style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)'
                  }}>
                    {/* Top Row: Avatar + Name + Role Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '8px',
                          background: m.isOwner ? '#10201E' : '#FAFBF9',
                          border: '1.5px solid #D9E1DC',
                          color: m.isOwner ? '#FFFFFF' : '#10201E',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '12px', fontWeight: '800', flexShrink: 0
                        }}>
                          {m.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontSize: '13px', color: '#10201E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {m.name}
                            </strong>
                            {m.isOwner && (
                              <span style={{
                                fontSize: '9px', fontWeight: '800', padding: '1px 5px',
                                borderRadius: '4px', background: '#F0FDF4', color: '#15803D',
                                border: '1px solid #DCFCE7', flexShrink: 0
                              }}>
                                OWNER
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#60716B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.email}
                          </div>
                        </div>
                      </div>

                      <span style={{
                        padding: '2px 7px', borderRadius: '4px', fontSize: '10px',
                        fontWeight: '800', background: roleObj.bg, color: roleObj.color,
                        border: `1px solid ${roleObj.border}`, flexShrink: 0
                      }}>
                        {roleObj.badge}
                      </span>
                    </div>

                    {/* Middle Row: Scope + 2FA */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', fontSize: '11px', color: '#60716B', paddingTop: '4px', borderTop: '1px solid #F1F5F9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Globe size={12} color="#60716B" />
                        <span style={{ fontWeight: '600', color: '#10201E' }}>{m.scope}</span>
                      </div>
                      <div>
                        {m.twoFactor ? (
                          <span style={{ color: '#15803D', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle2 size={11} /> 2FA Active
                          </span>
                        ) : (
                          <span style={{ color: '#D97706', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={11} /> 2FA Pending
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Last Active + Action */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', fontSize: '11px' }}>
                      <span style={{ color: '#94A3B8' }}>Active: {m.lastActive}</span>
                      {!m.isOwner && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(m.id, m.name)}
                          style={{
                            padding: '4px 8px', borderRadius: '5px',
                            background: '#FFFFFF', border: '1px solid #FECACA',
                            color: '#DC2626', fontSize: '11px', fontWeight: '700',
                            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px'
                          }}
                        >
                          <Trash2 size={11} />
                          <span>Revoke</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Pending Invitations */}
        {activeTab === 'invites' && (
          <div style={{ padding: '24px' }}>
            {pendingInvites.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#60716B' }}>
                <Mail size={32} style={{ color: '#94A3B8', marginBottom: '8px' }} />
                <div style={{ fontWeight: '700', color: '#10201E' }}>No pending invitations</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>All invited colleagues have accepted their workspace access links.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {pendingInvites.map(inv => (
                  <div key={inv.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '16px 20px', border: '1px solid #D9E1DC', borderRadius: '12px',
                    background: '#FAFBF9', flexWrap: 'wrap', gap: '14px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '800', color: '#10201E' }}>{inv.email}</span>
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', background: '#F0F9FF', color: '#0284C7', border: '1px solid #BAE6FD' }}>
                          {inv.roleTitle}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#60716B', marginTop: '4px' }}>
                        Invited by {inv.invitedBy} • Scope: {inv.scope} • Link expires in {inv.expiresIn}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {inv.inviteUrl && (
                        <button
                          type="button"
                          onClick={() => handleCopyInviteLink(inv)}
                          onMouseEnter={e => { e.currentTarget.style.background = '#E0F2FE' }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#F0F9FF' }}
                          style={{
                            padding: '7px 14px', borderRadius: '8px', border: '1px solid #BAE6FD',
                            background: '#F0F9FF', color: '#0369A1', fontSize: '12px', fontWeight: '700',
                            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Key size={12} />
                          <span>Copy Invite Link</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleResendInvite(inv)}
                        onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.borderColor = '#94A3B8' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#D9E1DC' }}
                        style={{
                          padding: '7px 14px', borderRadius: '8px', border: '1px solid #D9E1DC',
                          background: '#FFFFFF', color: '#10201E', fontSize: '12px', fontWeight: '700',
                          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Send size={12} />
                        <span>Resend Email</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRevokeInvite(inv.id, inv.email)}
                        onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.borderColor = '#F87171' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#FECACA' }}
                        style={{
                          padding: '7px 14px', borderRadius: '8px', border: '1px solid #FECACA',
                          background: '#FFFFFF', color: '#DC2626', fontSize: '12px', fontWeight: '700',
                          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <X size={12} />
                        <span>Revoke</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Roles & Permissions Matrix */}
        {activeTab === 'matrix' && (
          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '18px' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '800', color: '#10201E' }}>
                International SaaS Role-Based Security Matrix
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#60716B' }}>
                MDefender Pro enforces enterprise principle of least privilege (PoLP) across your multi-domain fleet.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              {TEAM_ROLES.map(role => (
                <div key={role.id} style={{
                  border: `1px solid ${role.border}`, borderRadius: '12px',
                  padding: '20px', background: role.bg
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#10201E' }}>
                      {role.title.split('(')[0]}
                    </h4>
                    <span style={{ fontSize: '10px', fontWeight: '800', padding: '2px 7px', borderRadius: '4px', background: '#FFFFFF', color: role.color, border: `1px solid ${role.border}` }}>
                      {role.badge}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.45', margin: '0 0 16px' }}>
                    {role.desc}
                  </p>

                  <div style={{ borderTop: `1px solid ${role.border}`, paddingTop: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#60716B', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.4px' }}>
                      Allowed Operations:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#334155', lineHeight: '1.7' }}>
                      {role.permissions.map((p, idx) => (
                        <li key={idx} style={{ fontWeight: '600' }}>{p}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Audit Trail */}
        {activeTab === 'audit' && (
          <div style={{ padding: '20px 24px' }}>
            {auditLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#60716B' }}>
                <Activity size={32} style={{ color: '#94A3B8', marginBottom: '8px' }} />
                <div style={{ fontWeight: '700', color: '#10201E' }}>No Audit Events Yet</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>Administrative actions and team changes will be securely logged here.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {auditLogs.map(log => (
                  <div key={log.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 18px', border: '1px solid #D9E1DC', borderRadius: '10px',
                    background: '#FAFBF9', flexWrap: 'wrap', gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid #D9E1DC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10201E' }}>
                        <Activity size={14} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#10201E' }}>
                          <strong style={{ color: '#0284C7' }}>{log.user}:</strong> {log.action}
                        </div>
                        <div style={{ fontSize: '11px', color: '#60716B', marginTop: '2px' }}>
                          Logged from client IP: <span style={{ fontFamily: 'monospace' }}>{log.ip}</span>
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', color: '#60716B', fontWeight: '600' }}>{log.timestamp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(16, 32, 30, 0.65)',
          backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '16px', border: '1px solid #D9E1DC',
            width: '100%', maxWidth: '520px', boxShadow: '0 20px 40px rgba(16, 32, 30, 0.25)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid #F1F5F2',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFBF9'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserPlus size={18} style={{ color: '#10201E' }} />
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#10201E', margin: 0 }}>
                  Invite Colleague to Workspace
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                style={{ background: 'none', border: 'none', color: '#60716B', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} style={{ padding: '22px 24px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#10201E', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Henderson"
                  value={inviteForm.name}
                  onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                  required
                  style={{
                    width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px',
                    border: '1px solid #D9E1DC', background: '#FFFFFF', color: '#10201E',
                    fontSize: '13px', boxSizing: 'border-box', outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#10201E', marginBottom: '6px' }}>
                  Corporate Email Address
                </label>
                <input
                  type="email"
                  placeholder="alex.henderson@company.com"
                  value={inviteForm.email}
                  onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                  required
                  style={{
                    width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px',
                    border: '1px solid #D9E1DC', background: '#FFFFFF', color: '#10201E',
                    fontSize: '13px', boxSizing: 'border-box', outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#10201E', marginBottom: '6px' }}>
                  Select RBAC Security Role
                </label>
                <select
                  value={inviteForm.roleId}
                  onChange={e => setInviteForm({ ...inviteForm, roleId: e.target.value })}
                  style={{
                    width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px',
                    border: '1px solid #D9E1DC', background: '#FFFFFF', color: '#10201E',
                    fontSize: '13px', fontWeight: '600', boxSizing: 'border-box', outline: 'none'
                  }}
                >
                  <option value="secops">Security Manager — WAF, Malware Scanner &amp; Hardening</option>
                  <option value="devops">WordPress Developer — Plugins, Themes, Updates &amp; Backups</option>
                  <option value="auditor">Read-Only Viewer — Logs, Reports &amp; Monitoring Only</option>
                </select>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#10201E', marginBottom: '6px' }}>
                  Domain Access Boundary Scope (Select All or Specific Sites)
                </label>
                <ScopePicker
                  websites={rawWebsites}
                  value={inviteForm.scope}
                  onChange={val => setInviteForm({ ...inviteForm, scope: val })}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '22px' }}>
                <input
                  type="checkbox"
                  checked={inviteForm.require2fa}
                  onChange={e => setInviteForm({ ...inviteForm, require2fa: e.target.checked })}
                  style={{ accentColor: '#10201E', width: '15px', height: '15px' }}
                />
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#10201E' }}>
                  Require Two-Factor Authentication (2FA) verification on first sign-in
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  style={{
                    padding: '9px 18px', background: '#FFFFFF', border: '1px solid #D9E1DC',
                    borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: '#475569', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInvite}
                  style={{
                    padding: '9px 20px', background: submittingInvite ? '#64748B' : '#10201E', border: 'none',
                    borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: '#FFFFFF',
                    cursor: submittingInvite ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                    boxShadow: '0 2px 8px rgba(16, 32, 30, 0.2)'
                  }}
                >
                  {submittingInvite ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>{submittingInvite ? 'Dispatching Invitation...' : 'Send Workspace Invitation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team Member Modal */}
      {editingMember && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(16, 32, 30, 0.55)',
          backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '16px', border: '1px solid #D9E1DC',
            width: '100%', maxWidth: '480px', boxShadow: '0 20px 40px rgba(16, 32, 30, 0.25)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid #F1F5F2',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFBF9'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sliders size={18} style={{ color: '#10201E' }} />
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#10201E', margin: 0 }}>
                  Edit Member Role &amp; Scope
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                style={{ background: 'none', border: 'none', color: '#60716B', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateMemberSubmit} style={{ padding: '22px 24px' }}>
              <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '10px', background: '#FAFBF9', border: '1px solid #D9E1DC' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#10201E' }}>{editingMember.name}</div>
                <div style={{ fontSize: '12px', color: '#60716B' }}>{editingMember.email}</div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#10201E', marginBottom: '6px' }}>
                  RBAC Security Role
                </label>
                <select
                  value={editingMember.roleId}
                  onChange={e => setEditingMember({ ...editingMember, roleId: e.target.value })}
                  style={{
                    width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px',
                    border: '1px solid #D9E1DC', background: '#FFFFFF', color: '#10201E',
                    fontSize: '13px', fontWeight: '600', boxSizing: 'border-box', outline: 'none'
                  }}
                >
                  <option value="secops">Security Manager — WAF, Malware Scanner &amp; Hardening</option>
                  <option value="devops">WordPress Developer — Plugins, Themes, Updates &amp; Backups</option>
                  <option value="auditor">Read-Only Viewer — Logs, Reports &amp; Monitoring Only</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#10201E', marginBottom: '6px' }}>
                  Domain Access Boundary Scope (Select All or Specific Sites)
                </label>
                <ScopePicker
                  websites={rawWebsites}
                  value={editingMember.scope}
                  onChange={val => setEditingMember({ ...editingMember, scope: val })}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '22px' }}>
                <input
                  type="checkbox"
                  checked={editingMember.twoFactor}
                  onChange={e => setEditingMember({ ...editingMember, twoFactor: e.target.checked })}
                  style={{ accentColor: '#10201E', width: '15px', height: '15px' }}
                />
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#10201E' }}>
                  Require Two-Factor Authentication (2FA)
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  style={{
                    padding: '9px 18px', background: '#FFFFFF', border: '1px solid #D9E1DC',
                    borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: '#475569', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  style={{
                    padding: '9px 20px', background: savingEdit ? '#64748B' : '#10201E', border: 'none',
                    borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: '#FFFFFF',
                    cursor: savingEdit ? 'not-allowed' : 'pointer'
                  }}
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
