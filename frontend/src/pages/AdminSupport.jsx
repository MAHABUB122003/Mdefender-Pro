import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  LifeBuoy,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Send,
  Trash2,
  RotateCw,
  Globe,
  Activity,
  ChevronRight,
  User,
  MessageSquare,
  Shield,
  Layers,
  Check,
  X,
  ExternalLink,
  Inbox
} from 'lucide-react'
import api from '../api/api'

const STATUS_FILTERS = [
  { id: 'all', label: 'All Inquiries' },
  { id: 'open', label: 'Unread / Open' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'waiting_user', label: 'Waiting User' },
  { id: 'resolved', label: 'Resolved / Closed' }
]

export default function AdminSupport() {
  const [tickets, setTickets] = useState([])
  const [metrics, setMetrics] = useState({ open: 0, in_progress: 0, waiting_user: 0, resolved: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedTicketId, setSelectedTicketId] = useState(null)
  const [activeTicket, setActiveTicket] = useState(null)
  const [ticketLoading, setTicketLoading] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Reply form state
  const [replyText, setReplyText] = useState('')
  const [staffName, setStaffName] = useState('Mahabubur Rahman')
  const [replyStatus, setReplyStatus] = useState('waiting_user')
  const [submittingReply, setSubmittingReply] = useState(false)

  // Remote site inspector state
  const [inspectorData, setInspectorData] = useState(null)
  const [inspecting, setInspecting] = useState(false)

  // Fetch Tickets
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.getAdminSupportTickets({
        status: statusFilter,
        search: searchQuery.trim()
      })
      if (res && res.tickets) {
        setTickets(res.tickets)
        if (res.metrics) setMetrics(res.metrics)
        setSelectedTicketId(prev => {
          if (prev && res.tickets.some(t => t.ticket_id === prev)) return prev
          return res.tickets.length > 0 ? res.tickets[0].ticket_id : null
        })
      }
    } catch (err) {
      console.error('Failed to load tickets:', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchQuery])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  // Fetch Single Ticket Thread
  useEffect(() => {
    if (!selectedTicketId) {
      setActiveTicket(null)
      return
    }
    let isCurrent = true
    setTicketLoading(true)
    api.getAdminSupportTicketDetails(selectedTicketId)
      .then(res => {
        if (isCurrent && res && res.ticket) {
          setActiveTicket(res.ticket)
          setInspectorData(null) // reset inspector
        }
      })
      .catch(err => console.error('Failed to load ticket:', err))
      .finally(() => {
        if (isCurrent) setTicketLoading(false)
      })
    return () => { isCurrent = false }
  }, [selectedTicketId])

  // Admin Reply
  const handleSendReply = async (e) => {
    e.preventDefault()
    if (!replyText.trim() || !selectedTicketId) return
    try {
      setSubmittingReply(true)
      const res = await api.replyAdminSupportTicket(selectedTicketId, {
        message: replyText.trim(),
        status: replyStatus,
        staff_name: staffName.trim() || 'Technical Support'
      })
      if (res && res.ticket) {
        setActiveTicket(res.ticket)
        setReplyText('')
        fetchTickets()
      }
    } catch (err) {
      console.error('Failed to reply:', err)
    } finally {
      setSubmittingReply(false)
    }
  }

  // Update Status
  const handleStatusChange = async (newStatus) => {
    if (!selectedTicketId) return
    try {
      const res = await api.updateAdminTicketStatus(selectedTicketId, { status: newStatus })
      if (res && res.ticket) {
        setActiveTicket(res.ticket)
        fetchTickets()
      }
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  // Delete Ticket
  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm(`Permanently purge ticket ${ticketId}? This action cannot be undone.`)) return
    try {
      await api.deleteAdminTicket(ticketId)
      setSelectedTicketId(null)
      setActiveTicket(null)
      fetchTickets()
    } catch (err) {
      console.error('Failed to delete ticket:', err)
    }
  }

  // Live Origin Inspect
  const handleInspectOrigin = async (domain) => {
    if (!domain) return
    try {
      setInspecting(true)
      const res = await api.getAdminRemoteDiagnostics(domain)
      if (res && res.diagnostics) {
        setInspectorData(res.diagnostics)
      }
    } catch (err) {
      console.error('Inspect failed:', err)
    } finally {
      setInspecting(false)
    }
  }

  return (
    <div
      style={{
        padding: '24px 28px 60px',
        maxWidth: '100%',
        boxSizing: 'border-box',
        color: '#0F172A',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      }}
    >
      {/* 1. TOP HEADER & METRIC CARDS (Matches Admin Dashboard / AdminUsers White Theme) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
            Support & Incident Command Center
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748B' }}>
            Real-time customer issue triage, origin diagnostics, and automated resolution dispatch.
          </p>
        </div>

        {/* Live Counters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} />
            <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#64748B' }}>Open / Unread:</span>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#DC2626' }}>{metrics.open}</span>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6' }} />
            <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#64748B' }}>In Progress:</span>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#2563EB' }}>{metrics.in_progress}</span>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
            <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#64748B' }}>Resolved:</span>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#059669' }}>{metrics.resolved}</span>
          </div>

          <button
            onClick={fetchTickets}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '10px',
              padding: '9px 14px',
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              fontWeight: '600'
            }}
          >
            <RotateCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* 2. FILTER & SEARCH BAR */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}
      >
        {/* Status Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {STATUS_FILTERS.map(tab => {
            const active = statusFilter === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: active ? '700' : '500',
                  color: active ? '#FFFFFF' : '#475569',
                  background: active ? '#0F172A' : 'transparent',
                  border: active ? '1px solid #0F172A' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease'
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search email, ticket ID, or issue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#0F172A',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* 3. MAIN SPLIT CONSOLE (White Enterprise High-Density Look) */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '14px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '400px 1fr',
          minHeight: '660px'
        }}
      >
        {/* Left Column: Ticket Feed */}
        <div style={{ borderRight: '1px solid #E2E8F0', background: '#FAFBFD', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Customer Inquiries ({tickets.length})
            </span>
            <span style={{ fontSize: '11.5px', color: '#64748B' }}>Sorted by latest activity</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {tickets.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94A3B8' }}>
                <Inbox size={36} color="#CBD5E1" style={{ margin: '0 auto 10px' }} />
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#64748B' }}>No Inquiries Found</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>There are no tickets matching this filter.</div>
              </div>
            ) : (
              tickets.map(t => {
                const isSelected = t.ticket_id === selectedTicketId
                const isUnread = t.status === 'open' || t.status === 'in_progress'

                return (
                  <div
                    key={t.ticket_id}
                    onClick={() => setSelectedTicketId(t.ticket_id)}
                    style={{
                      padding: '16px 18px',
                      borderBottom: '1px solid #E2E8F0',
                      background: isSelected ? '#EFF6FF' : '#FFFFFF',
                      borderLeft: isSelected ? '4px solid #2563EB' : '4px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.12s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* New Unread Pulse Indicator */}
                        {isUnread && (
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} title="Needs Action" />
                        )}
                        <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#0F172A', fontFamily: 'monospace' }}>
                          #{t.ticket_id}
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: t.status === 'open' ? '#FEF2F2' : (t.status === 'waiting_user' ? '#FFFBEB' : '#ECFDF5'),
                          color: t.status === 'open' ? '#DC2626' : (t.status === 'waiting_user' ? '#D97706' : '#059669'),
                          border: t.status === 'open' ? '1px solid #FECACA' : (t.status === 'waiting_user' ? '1px solid #FDE68A' : '1px solid #A7F3D0'),
                          textTransform: 'capitalize'
                        }}
                      >
                        {t.status === 'waiting_user' ? 'Waiting User' : t.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '13.5px', fontWeight: '700', color: isSelected ? '#1D4ED8' : '#0F172A', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.subject}
                    </div>

                    <div style={{ fontSize: '12px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.45', marginBottom: '8px' }}>
                      {t.latest_message?.snippet || 'No preview available'}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: '#94A3B8' }}>
                      <span style={{ fontWeight: '500', color: '#475569' }}>{t.user_email}</span>
                      <span>{t.updated_at ? new Date(t.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Full Thread & Resolution Dispatcher */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FFFFFF' }}>
          {ticketLoading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
              <RotateCw size={24} className="animate-spin" style={{ color: '#2563EB' }} />
            </div>
          ) : !activeTicket ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
              <LifeBuoy size={44} color="#CBD5E1" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>Select a Customer Inquiry</div>
              <div style={{ fontSize: '13px', marginTop: '4px' }}>Click any ticket from the left panel to inspect and resolve.</div>
            </div>
          ) : (
            <>
              {/* Ticket Top Action Bar */}
              <div
                style={{
                  padding: '18px 24px',
                  borderBottom: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', fontFamily: 'monospace' }}>
                      #{activeTicket.ticket_id}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>
                      {activeTicket.subject}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#64748B', marginTop: '4px' }}>
                    <span>Customer: <strong style={{ color: '#0F172A' }}>{activeTicket.user_email}</strong></span>
                    {activeTicket.target_domain && (
                      <>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#2563EB', fontWeight: '600' }}>
                          <Globe size={13} /> {activeTicket.target_domain}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions & Origin Inspect Trigger */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {activeTicket.target_domain && (
                    <button
                      onClick={() => handleInspectOrigin(activeTicket.target_domain)}
                      disabled={inspecting}
                      style={{
                        background: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        borderRadius: '6px',
                        padding: '7px 14px',
                        color: '#1D4ED8',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Activity size={14} className={inspecting ? 'animate-spin' : ''} />
                      {inspecting ? 'Probing...' : 'Inspect Live Site'}
                    </button>
                  )}

                  <select
                    value={activeTicket.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      padding: '7px 12px',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      color: '#0F172A',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_user">Waiting User</option>
                    <option value="resolved">Resolved (90d Retention)</option>
                    <option value="closed">Closed</option>
                  </select>

                  <button
                    onClick={() => handleDeleteTicket(activeTicket.ticket_id)}
                    style={{
                      background: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: '6px',
                      padding: '7px 10px',
                      color: '#DC2626',
                      cursor: 'pointer'
                    }}
                    title="Purge Ticket"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Inspector Live Snapshot Card */}
              {inspectorData && (
                <div style={{ margin: '16px 24px 0', padding: '16px 20px', borderRadius: '10px', background: '#F0FDF4', border: '1px solid #86EFAC' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '800', color: '#166534' }}>
                      <Activity size={16} /> Live Diagnostics for {inspectorData.domain}
                    </div>
                    <button onClick={() => setInspectorData(null)} style={{ background: 'transparent', border: 'none', color: '#166534', cursor: 'pointer', fontSize: '12px' }}>
                      Close
                    </button>
                  </div>
                  {inspectorData.found ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '12.5px' }}>
                      <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: '6px', border: '1px solid #BBF7D0' }}>
                        <span style={{ color: '#64748B' }}>WAF Shield:</span> <strong style={{ color: '#059669', textTransform: 'uppercase' }}>{inspectorData.waf_mode}</strong>
                      </div>
                      <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: '6px', border: '1px solid #BBF7D0' }}>
                        <span style={{ color: '#64748B' }}>Origin Status:</span> <strong style={{ color: '#2563EB' }}>{inspectorData.status}</strong>
                      </div>
                      <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: '6px', border: '1px solid #BBF7D0' }}>
                        <span style={{ color: '#64748B' }}>Health Score:</span> <strong style={{ color: '#059669' }}>{inspectorData.health_score}%</strong>
                      </div>
                      <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: '6px', border: '1px solid #BBF7D0' }}>
                        <span style={{ color: '#64748B' }}>WordPress Core:</span> <strong style={{ color: '#0F172A' }}>v{inspectorData.wp_version}</strong>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#DC2626', fontSize: '13px' }}>{inspectorData.message}</div>
                  )}
                </div>
              )}

              {/* Conversation Messages Thread */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                  background: '#F8FAFC'
                }}
              >
                {activeTicket.messages?.map((msg, idx) => {
                  const isStaff = msg.sender_type === 'admin'
                  return (
                    <div
                      key={msg.msg_id || idx}
                      style={{
                        background: '#FFFFFF',
                        border: isStaff ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                        borderRadius: '10px',
                        padding: '18px 22px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: isStaff ? '#2563EB' : '#F1F5F9',
                              color: isStaff ? '#FFFFFF' : '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: '700'
                            }}
                          >
                            {isStaff ? 'S' : <User size={16} />}
                          </div>
                          <div>
                            <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0F172A' }}>
                              {isStaff ? 'MDefender Support Specialist (Admin)' : activeTicket.user_email}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#94A3B8' }}>
                              {msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '13.5px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {msg.message}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Reply Box */}
              <form
                onSubmit={handleSendReply}
                style={{
                  padding: '18px 24px',
                  borderTop: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                {/* Auto Professional Formatting Preview Pill */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', color: '#64748B' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                    <span>Auto-Wrapper: <strong>Hello {activeTicket.user_email?.split('@')[0]}...</strong> & <strong>Best regards...</strong> will be added automatically</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Responding Specialist:</span>
                    <input
                      type="text"
                      value={staffName}
                      onChange={(e) => setStaffName(e.target.value)}
                      placeholder="e.g. Mahabubur Rahman"
                      style={{
                        padding: '4px 8px',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#0F172A',
                        outline: 'none',
                        width: '150px'
                      }}
                    />
                  </div>
                </div>

                <textarea
                  rows={4}
                  placeholder="Just write the main solution or investigation findings here (e.g. I have checked your website and resolved the WAF false positive rule...)"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: '#FFFFFF',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    color: '#0F172A',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    lineHeight: '1.5'
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#64748B' }}>
                    <span>After reply, update status:</span>
                    <select
                      value={replyStatus}
                      onChange={(e) => setReplyStatus(e.target.value)}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '12.5px',
                        fontWeight: '600',
                        color: '#0F172A',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="waiting_user">Waiting User</option>
                      <option value="resolved">Resolved / Closed (Start 90d Retention)</option>
                      <option value="in_progress">In Progress</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReply || !replyText.trim()}
                    style={{
                      background: '#0F172A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 24px',
                      fontSize: '13.5px',
                      fontWeight: '700',
                      cursor: submittingReply || !replyText.trim() ? 'not-allowed' : 'pointer',
                      opacity: submittingReply || !replyText.trim() ? 0.6 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)'
                    }}
                  >
                    {submittingReply ? <RotateCw size={14} className="animate-spin" /> : <Send size={14} />} Dispatch Professional Resolution
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
