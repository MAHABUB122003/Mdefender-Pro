import { useState, useEffect, useCallback, useRef } from 'react'
import {
  LifeBuoy,
  Plus,
  RotateCw,
  Send,
  Trash2,
  Globe,
  Check,
  X,
  AlertTriangle,
  Headphones,
  Paperclip,
  ArrowLeft,
  ChevronRight,
  Clock,
  ShieldAlert,
  Mail,
  User,
  Inbox
} from 'lucide-react'
import api from '../api/api'
import userStore from '../utils/userStore'

export default function UserSupport() {
  // Navigation View: 'list' | 'create' | 'thread'
  const [currentView, setCurrentView] = useState('list')
  
  const [tickets, setTickets] = useState([])
  const [userWebsites, setUserWebsites] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTicketId, setSelectedTicketId] = useState(null)
  const [activeTicket, setActiveTicket] = useState(null)
  const [ticketLoading, setTicketLoading] = useState(false)

  // Current user info for "Ticket Creator" card
  const currentUser = userStore.get('profile') || {}
  const userName = currentUser.full_name || currentUser.name || 'Account Owner'
  const userEmail = currentUser.email || 'user@example.com'

  // New Ticket Form State (Matches user reference image 1)
  const [department, setDepartment] = useState('Technical Support')
  const [selectedProduct, setSelectedProduct] = useState('None')
  const [priority, setPriority] = useState('Medium')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [attachmentName, setAttachmentName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  // Reply State
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)

  // Toast feedback
  const [toast, setToast] = useState(null)
  const messagesEndRef = useRef(null)

  const showToast = (text, isError = false) => {
    setToast({ text, isError })
    setTimeout(() => setToast(null), 3500)
  }

  // Load user websites
  useEffect(() => {
    const fetchSites = async () => {
      try {
        if (typeof api.getUserWebsites === 'function') {
          const res = await api.getUserWebsites()
          const sites = res?.websites || (Array.isArray(res) ? res : [])
          if (Array.isArray(sites)) {
            setUserWebsites(sites)
          }
        }
      } catch (e) {
        console.warn('Failed to load user websites:', e)
      }
    }
    fetchSites()
  }, [])

  // Fetch Tickets
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.getUserSupportTickets()
      if (res && res.tickets) {
        setTickets(res.tickets)
      }
    } catch (err) {
      console.error('Failed to load tickets:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  // Fetch Active Ticket Details
  const openTicketThread = (ticketId) => {
    setSelectedTicketId(ticketId)
    setCurrentView('thread')
    setTicketLoading(true)
    api.getUserSupportTicketDetails(ticketId)
      .then(res => {
        if (res && res.ticket) {
          setActiveTicket(res.ticket)
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
          }, 100)
        }
      })
      .catch(err => {
        console.error('Failed to load ticket details:', err)
        showToast('Failed to load ticket thread', true)
      })
      .finally(() => setTicketLoading(false))
  }

  // Submit New Ticket
  const handleCreateTicket = async (e) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) {
      showToast('Subject and message are required', true)
      return
    }

    try {
      setSubmitting(true)
      const res = await api.createUserSupportTicket({
        subject: subject.trim(),
        target_domain: selectedProduct === 'None' ? '' : selectedProduct,
        message: message.trim(),
        category: department === 'Technical Support' ? 'waf_false_positive' : 'general_inquiry',
        priority: priority.toLowerCase(),
        attachments: attachmentName ? [{ name: attachmentName, type: 'file' }] : [],
        user_name: userName
      })

      if (res && res.ticket) {
        showToast('Ticket submitted successfully!')
        setSubject('')
        setMessage('')
        setAttachmentName('')
        fetchTickets()
        openTicketThread(res.ticket.ticket_id)
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit ticket', true)
    } finally {
      setSubmitting(false)
    }
  }

  // Reply
  const handleSendReply = async (e) => {
    e.preventDefault()
    if (!replyText.trim() || !selectedTicketId) return

    try {
      setReplying(true)
      const res = await api.replyUserSupportTicket(selectedTicketId, {
        message: replyText.trim()
      })

      if (res && res.ticket) {
        setActiveTicket(res.ticket)
        setReplyText('')
        showToast('Reply dispatched!')
        fetchTickets()
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
    } catch (err) {
      showToast(err.message || 'Failed to send reply', true)
    } finally {
      setReplying(false)
    }
  }

  // Purge
  const handlePurgeTicket = async (ticketId) => {
    if (!window.confirm('Permanently delete this resolved ticket?')) return
    try {
      await api.deleteUserSupportTicket(ticketId)
      showToast('Ticket purged successfully.')
      setCurrentView('list')
      setSelectedTicketId(null)
      setActiveTicket(null)
      fetchTickets()
    } catch (err) {
      showToast(err.message || 'Cannot delete an active ticket.', true)
    }
  }

  return (
    <div
      style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '24px 20px 80px',
        color: '#1e293b',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      }}
    >
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: toast.isError ? '#ef4444' : '#1e293b',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
            zIndex: 9999,
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13.5px'
          }}
        >
          {toast.isError ? <AlertTriangle size={16} /> : <Check size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: TICKETS LIST (Matches Image 3)                                    */}
      {/* ========================================================================= */}
      {currentView === 'list' && (
        <div>
          {/* Header Action Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                Support Tickets
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748b' }}>
                View your active and previous inquiries or open a new ticket with our technical team.
              </p>
            </div>

            <button
              onClick={() => setCurrentView('create')}
              style={{
                background: '#6366f1',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '13.5px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(99, 102, 241, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              <Plus size={16} /> Open New Ticket
            </button>
          </div>

          {/* Ticket Cards List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <RotateCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: '#6366f1' }} />
              <div>Loading your support tickets...</div>
            </div>
          ) : tickets.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '60px 20px',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              <Inbox size={42} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>No Support Tickets Found</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
                You have not opened any inquiries yet. Click "Open New Ticket" to get started.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {tickets.map(t => {
                const isClosed = ['resolved', 'closed'].includes(t.status)
                return (
                  <div
                    key={t.ticket_id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '18px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      transition: 'border-color 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                          {t.subject}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', fontFamily: 'monospace' }}>
                          #{t.ticket_id}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '3px 9px',
                            borderRadius: '12px',
                            background: isClosed ? '#1e293b' : '#3b82f6',
                            color: '#ffffff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ffffff' }} />
                          {isClosed ? 'Closed' : (t.status === 'waiting_user' ? 'Replied' : 'Open')}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#64748b', marginTop: '6px' }}>
                        <span>Technical Support</span>
                        <span>•</span>
                        <span>{t.created_at ? new Date(t.created_at).toLocaleString() : ''}</span>
                        <span>•</span>
                        <span style={{ textTransform: 'capitalize' }}>Priority: {t.priority}</span>
                        {t.target_domain && (
                          <>
                            <span>•</span>
                            <span style={{ color: '#6366f1' }}>{t.target_domain}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isClosed && (
                        <button
                          onClick={() => handlePurgeTicket(t.ticket_id)}
                          style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            color: '#dc2626',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                          title="Delete this closed ticket from history"
                        >
                          <Trash2 size={13} /> Delete History
                        </button>
                      )}
                      <button
                        onClick={() => openTicketThread(t.ticket_id)}
                        style={{
                          background: 'transparent',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '6px 14px',
                          color: '#475569',
                          fontSize: '12.5px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        View Ticket <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: OPEN NEW TICKET (Matches Image 1 Exact Layout)                    */}
      {/* ========================================================================= */}
      {currentView === 'create' && (
        <div>
          <button
            onClick={() => setCurrentView('list')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '18px'
            }}
          >
            <ArrowLeft size={15} /> Back to All Tickets
          </button>

          <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Top 4-Card Selector Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              
              {/* 1. Ticket Creator */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>Ticket Creator</label>
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    minHeight: '62px',
                    boxSizing: 'border-box'
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: '#e2e8f0',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <User size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>{userName}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{userEmail}</div>
                  </div>
                </div>
              </div>

              {/* 2. Ticket Department */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>Ticket Department</label>
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    minHeight: '62px',
                    boxSizing: 'border-box'
                  }}
                >
                  <Mail size={18} color="#8b5cf6" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>Technical Support</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>Handles WAF, hosting, DNS, DDoS, malware and origin issues.</div>
                  </div>
                </div>
              </div>

              {/* 3. Related Product (Connected Sites) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>Related Product / Site</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '18px 16px',
                    fontSize: '13.5px',
                    color: '#0f172a',
                    fontWeight: '600',
                    outline: 'none',
                    minHeight: '62px',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                >
                  <option value="None">None</option>
                  {userWebsites.map((s, idx) => {
                    const dom = s.domain || s.target_url || `Site #${idx + 1}`
                    return <option key={s._id || idx} value={dom}>{dom}</option>
                  })}
                </select>
              </div>

              {/* 4. Priority */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '18px 16px',
                    fontSize: '13.5px',
                    color: '#0f172a',
                    fontWeight: '600',
                    outline: 'none',
                    minHeight: '62px',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Ticket Details Section */}
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '14px' }}>
                Ticket Details
              </h2>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Subject */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', display: 'block', marginBottom: '6px' }}>
                    Subject <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter ticket subject..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '13.5px',
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Message Textarea */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', display: 'block', marginBottom: '6px' }}>
                    Message <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    rows={8}
                    placeholder="Describe your issue in as much detail as possible..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '13.5px',
                      color: '#0f172a',
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit'
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                    lines: {message.split('\n').length} words: {message.trim() ? message.trim().split(/\s+/).length : 0}
                  </div>
                </div>

                {/* Attachment Bar */}
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setAttachmentName(e.target.files[0].name)
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      color: '#475569',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Paperclip size={15} />
                    <span>{attachmentName ? `Selected: ${attachmentName}` : 'Add attachments...'}</span>
                  </button>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '6px' }}>
                    Allowed File Extensions: .jpg, .gif, .jpeg, .png, .txt, .pdf (Max file size: 1024MB)
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentView('list')}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '10px 20px',
                      color: '#475569',
                      fontSize: '13.5px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      background: '#6366f1',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 24px',
                      color: '#ffffff',
                      fontSize: '13.5px',
                      fontWeight: '700',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      opacity: submitting ? 0.7 : 1
                    }}
                  >
                    {submitting ? 'Submitting...' : 'Submit Ticket'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: TICKET THREAD & CONVERSATION (Matches Image 2 Card Layout)        */}
      {/* ========================================================================= */}
      {currentView === 'thread' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <button
              onClick={() => { setCurrentView('list'); setSelectedTicketId(null); setActiveTicket(null); }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ArrowLeft size={15} /> Back to All Tickets
            </button>

            {activeTicket && ['resolved', 'closed'].includes(activeTicket.status) && (
              <button
                onClick={() => handlePurgeTicket(activeTicket.ticket_id)}
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  color: '#dc2626',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={13} /> Clean Ticket
              </button>
            )}
          </div>

          {ticketLoading || !activeTicket ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <RotateCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: '#6366f1' }} />
              <div>Loading conversation thread...</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Ticket Subject Header */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '18px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                      {activeTicket.subject}
                    </span>
                    <span style={{ fontSize: '13.5px', color: '#64748b', fontFamily: 'monospace' }}>
                      #{activeTicket.ticket_id}
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px' }}>
                    Status: <strong style={{ color: activeTicket.status === 'resolved' ? '#059669' : '#3b82f6', textTransform: 'capitalize' }}>{activeTicket.status}</strong>
                    {activeTicket.target_domain && (
                      <> • Domain: <strong style={{ color: '#6366f1' }}>{activeTicket.target_domain}</strong></>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Cards (Matches Image 2 exactly: Individual card for each message) */}
              {activeTicket.messages?.map((msg, idx) => {
                const isStaff = msg.sender_type === 'admin'
                return (
                  <div
                    key={msg.msg_id || idx}
                    style={{
                      background: isStaff ? '#ffffff' : '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '24px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                  >
                    {/* Message Sender Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: isStaff ? '#6366f1' : '#e2e8f0',
                          color: isStaff ? '#ffffff' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '14px'
                        }}
                      >
                        {isStaff ? (msg.sender_name ? msg.sender_name.charAt(0).toUpperCase() : 'S') : <User size={18} />}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                          {isStaff ? (msg.sender_name || 'MDefender Support Specialist') : (msg.sender_name || userName)}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}
                        </div>
                      </div>
                    </div>

                    {/* Message Body */}
                    <div
                      style={{
                        fontSize: '14px',
                        color: '#334155',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}
                    >
                      {msg.message}
                    </div>
                  </div>
                )
              })}

              <div ref={messagesEndRef} />

              {/* Reply Box */}
              <form
                onSubmit={handleSendReply}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <textarea
                  rows={4}
                  placeholder="Type your response to the support specialist..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '13.5px',
                    color: '#0f172a',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    disabled={replying || !replyText.trim()}
                    style={{
                      background: '#6366f1',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 22px',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: replying || !replyText.trim() ? 'not-allowed' : 'pointer',
                      opacity: replying || !replyText.trim() ? 0.6 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {replying ? <RotateCw size={14} className="animate-spin" /> : <Send size={14} />} Reply
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
