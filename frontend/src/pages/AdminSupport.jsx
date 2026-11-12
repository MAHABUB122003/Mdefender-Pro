import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  ExternalLink,
  Globe2,
  Inbox,
  LifeBuoy,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Tag,
  Trash2,
  UserRound,
  Zap,
} from 'lucide-react';
import api from '../api/api';
import { Badge, Button, EmptyState, PageHeader } from '../components/ui';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'waiting_user', label: 'Waiting on customer' },
  { id: 'resolved', label: 'Resolved' },
];

const STATUS_META = {
  open: { label: 'Open', tone: 'danger' },
  in_progress: { label: 'In progress', tone: 'info' },
  waiting_user: { label: 'Waiting on customer', tone: 'warning' },
  resolved: { label: 'Resolved', tone: 'success' },
  closed: { label: 'Closed', tone: 'neutral' },
};

const PRIORITY_TONE = { urgent: 'danger', high: 'warning', medium: 'neutral', low: 'neutral' };

const CANNED_REPLIES = [
  {
    label: 'Acknowledge',
    text: 'Thanks for reaching out — we have received your request and are investigating. We will update you as soon as we have a finding.',
  },
  {
    label: 'False positive fixed',
    text: 'We reviewed the blocked request and whitelisted the rule for your site. Please retry the action and confirm that it works now.',
  },
  {
    label: 'Need more details',
    text: 'Could you share the exact URL, the time in UTC, and the reference ID shown on the block page? That will let us trace the request precisely.',
  },
  {
    label: 'Resolved',
    text: 'This should be resolved now. I am closing the ticket — reply here if anything changes and we will reopen it.',
  },
];

function fmtTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDay(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function initials(email = '') {
  const name = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export default function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [metrics, setMetrics] = useState({ open: 0, in_progress: 0, waiting_user: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [activeTicket, setActiveTicket] = useState(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [staffName, setStaffName] = useState(() => {
    if (typeof localStorage === 'undefined') return 'MDefender Support';
    return localStorage.getItem('mdf_support_staff') || 'MDefender Support';
  });
  const [replyStatus, setReplyStatus] = useState('waiting_user');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [inspectorData, setInspectorData] = useState(null);
  const [inspecting, setInspecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);
  const [showInboxMobile, setShowInboxMobile] = useState(true);
  const threadRef = useRef(null);
  const composerRef = useRef(null);

  const showToast = (text, isError = false) => {
    setToast({ text, isError });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getAdminSupportTickets({ status: statusFilter, search: searchQuery.trim() });
      if (res && res.tickets) {
        setTickets(res.tickets);
        if (res.metrics) setMetrics(res.metrics);
        setSelectedTicketId((prev) => {
          if (prev && res.tickets.some((t) => t.ticket_id === prev)) return prev;
          return res.tickets.length ? res.tickets[0].ticket_id : null;
        });
      }
    } catch (err) {
      showToast(err.message || 'Could not load tickets', true);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    if (!selectedTicketId) {
      setActiveTicket(null);
      return undefined;
    }
    let current = true;
    setTicketLoading(true);
    api
      .getAdminSupportTicketDetails(selectedTicketId)
      .then((res) => {
        if (current && res?.ticket) {
          setActiveTicket(res.ticket);
          setInspectorData(null);
          setReplyStatus(res.ticket.status === 'open' ? 'in_progress' : 'waiting_user');
        }
      })
      .catch((err) => showToast(err.message || 'Could not load the thread', true))
      .finally(() => current && setTicketLoading(false));
    return () => {
      current = false;
    };
  }, [selectedTicketId]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [activeTicket]);

  const handleSendReply = async (e) => {
    e?.preventDefault();
    if (!replyText.trim() || !selectedTicketId) return;
    try {
      setSubmittingReply(true);
      const res = await api.replyAdminSupportTicket(selectedTicketId, {
        message: replyText.trim(),
        status: replyStatus,
        staff_name: staffName.trim() || 'MDefender Support',
      });
      if (res?.ticket) {
        setActiveTicket(res.ticket);
        setReplyText('');
        fetchTickets();
        showToast('Reply sent');
      }
    } catch (err) {
      showToast(err.message || 'Reply failed', true);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!activeTicket) return;
    try {
      const res = await api.updateAdminTicketStatus(activeTicket.ticket_id, { status: newStatus });
      if (res?.ticket) setActiveTicket(res.ticket);
      else setActiveTicket((t) => ({ ...t, status: newStatus }));
      fetchTickets();
      showToast(`Status changed to ${STATUS_META[newStatus]?.label || newStatus}`);
    } catch (err) {
      showToast(err.message || 'Status update failed', true);
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!ticketId) return;
    if (!window.confirm(`Delete ticket ${ticketId}? This cannot be undone.`)) return;
    try {
      await api.deleteAdminTicket(ticketId);
      setActiveTicket(null);
      setSelectedTicketId(null);
      fetchTickets();
      showToast('Ticket deleted');
    } catch (err) {
      showToast(err.message || 'Delete failed', true);
    }
  };

  const handleInspectOrigin = async (domain) => {
    if (!domain) return;
    setInspecting(true);
    try {
      const res = await api.getAdminRemoteDiagnostics(domain);
      setInspectorData(res?.data || res);
    } catch (err) {
      setInspectorData({ found: false, message: err.message || 'Diagnostics failed' });
    } finally {
      setInspecting(false);
    }
  };

  const copyTicketId = async () => {
    if (!activeTicket) return;
    try {
      await navigator.clipboard.writeText(activeTicket.ticket_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast('Copy failed', true);
    }
  };

  const saveStaff = (value) => {
    setStaffName(value);
    if (typeof localStorage !== 'undefined') localStorage.setItem('mdf_support_staff', value);
  };

  const messages = activeTicket?.messages || [];
  const grouped = useMemo(() => {
    const out = [];
    let lastDay = '';
    messages.forEach((msg) => {
      const day = fmtDay(msg.created_at);
      if (day !== lastDay) {
        out.push({ type: 'day', day, key: `day-${day}-${msg.msg_id || out.length}` });
        lastDay = day;
      }
      out.push({ type: 'msg', msg });
    });
    return out;
  }, [messages]);

  const statusMeta = STATUS_META[activeTicket?.status] || STATUS_META.open;

  return (
    <div className="sup">
      <style>{`
        .sup { display: flex; flex-direction: column; gap: 14px; max-width: 1760px; margin: 0 auto; width: 100%; }
        .sup-shell {
          display: grid; grid-template-columns: 336px minmax(0,1fr) 286px;
          background: var(--md-surface); border: 1px solid var(--md-line);
          border-radius: 14px; overflow: hidden; min-height: 660px;
          height: calc(100vh - 210px);
        }
        .sup-inbox { border-right: 1px solid var(--md-line); display: flex; flex-direction: column; min-height: 0; background: #fcfbf7; }
        .sup-toolbar { padding: 12px 14px; border-bottom: 1px solid var(--md-line); display: flex; flex-direction: column; gap: 9px; }
        .sup-search { position: relative; }
        .sup-search input {
          width: 100%; height: 34px; border: 1px solid var(--md-line-strong); border-radius: 8px;
          background: var(--md-surface); padding: 0 10px 0 32px; font-family: var(--md-font-sans);
          font-size: 12.5px; color: var(--md-ink); outline: none;
        }
        .sup-search input:focus { border-color: var(--md-amber); box-shadow: 0 0 0 3px rgba(232,121,47,.14); }
        .sup-search svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--md-ink-3); }
        .sup-filters { display: flex; gap: 4px; flex-wrap: wrap; }
        .sup-filter {
          border: 1px solid transparent; background: transparent; color: var(--md-ink-3);
          font-family: var(--md-font-sans); font-size: 11px; font-weight: 600; padding: 4px 8px;
          border-radius: 6px; cursor: pointer;
        }
        .sup-filter:hover { background: var(--md-surface-sunken); color: var(--md-ink); }
        .sup-filter[aria-pressed='true'] { background: var(--md-forest); border-color: var(--md-forest); color: #fff; }
        .sup-list { flex: 1; overflow-y: auto; min-height: 0; }
        .sup-item {
          width: 100%; text-align: left; border: 0; border-bottom: 1px solid var(--md-line);
          background: transparent; padding: 12px 14px; cursor: pointer; display: flex; gap: 10px;
        }
        .sup-item:hover { background: var(--md-surface-hover); }
        .sup-item[data-active='true'] { background: var(--md-surface); box-shadow: inset 3px 0 0 var(--md-amber); }
        .sup-avatar {
          width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center;
          background: var(--md-surface-sunken); color: var(--md-ink-2); font-size: 11px; font-weight: 700;
        }
        .sup-item-main { min-width: 0; flex: 1; }
        .sup-item-top { display: flex; align-items: center; gap: 6px; }
        .sup-item-subject { flex: 1; font-size: 12.5px; font-weight: 600; color: var(--md-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sup-item-time { font-size: 10px; color: var(--md-ink-3); white-space: nowrap; }
        .sup-item-mail { font-size: 10.5px; color: var(--md-ink-3); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sup-item-snippet { font-size: 11px; color: var(--md-ink-2); margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sup-thread { display: flex; flex-direction: column; min-width: 0; min-height: 0; background: var(--md-surface); }
        .sup-thread-head { padding: 12px 18px; border-bottom: 1px solid var(--md-line); display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .sup-subject { font-size: 14px; font-weight: 650; color: var(--md-ink); margin: 0; letter-spacing: -.01em; }
        .sup-sub { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 11px; color: var(--md-ink-3); margin-top: 3px; }
        .sup-id { font-family: var(--md-font-mono); font-size: 10.5px; background: var(--md-surface-sunken); border-radius: 4px; padding: 2px 5px; color: var(--md-ink-2); }
        .sup-id-btn { border: 0; background: transparent; padding: 2px; border-radius: 4px; cursor: pointer; color: var(--md-ink-3); display: inline-flex; }
        .sup-id-btn:hover { background: var(--md-surface-sunken); color: var(--md-ink); }
        .sup-thread-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .sup-select {
          height: 32px; border: 1px solid var(--md-line-strong); border-radius: 7px; background: var(--md-surface);
          font-family: var(--md-font-sans); font-size: 11.5px; font-weight: 600; color: var(--md-ink);
          padding: 0 8px; outline: none; cursor: pointer;
        }
        .sup-messages { flex: 1; overflow-y: auto; padding: 18px 20px 10px; background: var(--md-paper); min-height: 0; }
        .sup-day { text-align: center; margin: 10px 0 14px; }
        .sup-day span { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .07em; color: var(--md-ink-3); background: var(--md-surface); border: 1px solid var(--md-line); border-radius: 999px; padding: 3px 9px; }
        .sup-msg { display: flex; gap: 9px; margin-bottom: 14px; max-width: 760px; }
        .sup-msg.admin { margin-left: auto; flex-direction: row-reverse; }
        .sup-msg-avatar { width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center; font-size: 10px; font-weight: 700; background: var(--md-surface-sunken); color: var(--md-ink-2); }
        .sup-msg.admin .sup-msg-avatar { background: var(--md-forest); color: #fff; }
        .sup-bubble { border-radius: 12px; padding: 10px 13px; border: 1px solid var(--md-line); background: var(--md-surface); min-width: 0; }
        .sup-msg.admin .sup-bubble { background: #eaf1ee; border-color: #d5e3dd; }
        .sup-meta { display: flex; align-items: center; gap: 7px; font-size: 10px; color: var(--md-ink-3); margin-bottom: 4px; }
        .sup-meta strong { font-size: 10.5px; color: var(--md-ink-2); font-weight: 600; }
        .sup-body { font-size: 13px; line-height: 1.6; color: var(--md-ink); white-space: pre-wrap; word-break: break-word; }
        .sup-composer { border-top: 1px solid var(--md-line); padding: 12px 16px 14px; background: var(--md-surface); }
        .sup-composer-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
        .sup-canned { display: flex; gap: 5px; flex-wrap: wrap; }
        .sup-chip {
          border: 1px solid var(--md-line); background: var(--md-surface); color: var(--md-ink-2);
          font-family: var(--md-font-sans); font-size: 10.5px; font-weight: 600; padding: 4px 8px;
          border-radius: 999px; cursor: pointer;
        }
        .sup-chip:hover { border-color: var(--md-amber); color: var(--md-amber-2); background: var(--md-amber-soft); }
        .sup-textarea {
          width: 100%; border: 1px solid var(--md-line-strong); border-radius: 9px; padding: 10px 11px;
          font-family: var(--md-font-sans); font-size: 13px; line-height: 1.55; color: var(--md-ink);
          background: var(--md-surface); resize: vertical; min-height: 74px; max-height: 220px; outline: none;
        }
        .sup-textarea:focus { border-color: var(--md-amber); box-shadow: 0 0 0 3px rgba(232,121,47,.14); }
        .sup-composer-bottom { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 8px; flex-wrap: wrap; }
        .sup-hint { font-size: 10.5px; color: var(--md-ink-3); }
        .sup-context { border-left: 1px solid var(--md-line); background: #fcfbf7; padding: 14px; overflow-y: auto; min-height: 0; }
        .sup-ctx-block { margin-bottom: 16px; }
        .sup-ctx-label { font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--md-ink-3); margin: 0 0 7px; }
        .sup-ctx-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11.5px; color: var(--md-ink-2); padding: 5px 0; }
        .sup-ctx-row strong { color: var(--md-ink); font-weight: 600; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sup-quick { display: grid; gap: 6px; }
        .sup-quick a, .sup-quick button {
          display: flex; align-items: center; gap: 7px; padding: 7px 9px; border-radius: 7px;
          border: 1px solid var(--md-line); background: var(--md-surface); color: var(--md-ink-2);
          font-family: var(--md-font-sans); font-size: 11.5px; font-weight: 500; text-decoration: none; cursor: pointer;
        }
        .sup-quick a:hover, .sup-quick button:hover { border-color: #d6d9cf; color: var(--md-ink); background: var(--md-surface-hover); }
        .sup-diag { margin: 0 0 12px; border: 1px solid #cfe1db; background: var(--md-info-soft); border-radius: 9px; padding: 10px 12px; }
        .sup-diag-title { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 650; color: var(--md-info); margin-bottom: 6px; }
        .sup-diag-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 6px; font-size: 10.5px; color: var(--md-ink-2); }
        .sup-diag-grid strong { color: var(--md-ink); font-weight: 600; }
        .sup-toast { position: fixed; right: 22px; bottom: 22px; z-index: 90; background: var(--md-forest); color: #fff; font-size: 12px; font-weight: 500; padding: 9px 14px; border-radius: 9px; box-shadow: var(--md-shadow-pop); }
        .sup-toast.error { background: var(--md-danger); }
        .sup-back { display: none; }
        @media (max-width: 1500px) {
          .sup-shell { grid-template-columns: 320px minmax(0,1fr); }
          .sup-context { display: none; }
        }
        @media (max-width: 980px) {
          .sup-shell { grid-template-columns: 1fr; height: auto; min-height: 560px; }
          .sup-inbox { display: ${showInboxMobile ? 'flex' : 'none'}; border-right: 0; max-height: 70vh; }
          .sup-thread { display: ${showInboxMobile ? 'none' : 'flex'}; min-height: 70vh; }
          .sup-back { display: inline-flex; }
        }
      `}</style>

      <PageHeader
        eyebrow="Customer operations"
        title="Support inbox"
        description="Every tenant conversation in one place — triage, reply, and keep the resolution moving."
        actions={
          <>
            <div style={{ display: 'flex', gap: 6 }}>
              <Badge tone="danger" dot>{metrics.open} open</Badge>
              <Badge tone="info" dot>{metrics.in_progress} in progress</Badge>
              <Badge tone="warning" dot>{metrics.waiting_user} waiting</Badge>
            </div>
            <Button variant="secondary" icon={RefreshCw} onClick={fetchTickets} disabled={loading}>
              {loading ? 'Refreshing' : 'Refresh'}
            </Button>
          </>
        }
      />

      <div className="sup-shell">
        <section className="sup-inbox" aria-label="Ticket list">
          <div className="sup-toolbar">
            <div className="sup-search">
              <Search size={13} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search email, ticket ID or subject"
                aria-label="Search tickets"
              />
            </div>
            <div className="sup-filters" role="group" aria-label="Filter tickets">
              {STATUS_FILTERS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className="sup-filter"
                  aria-pressed={statusFilter === tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sup-list">
            {tickets.length ? (
              tickets.map((t) => {
                const meta = STATUS_META[t.status] || STATUS_META.open;
                return (
                  <button
                    type="button"
                    key={t.ticket_id}
                    className="sup-item"
                    data-active={t.ticket_id === selectedTicketId}
                    onClick={() => {
                      setSelectedTicketId(t.ticket_id);
                      setShowInboxMobile(false);
                    }}
                  >
                    <span className="sup-avatar">{initials(t.user_email)}</span>
                    <span className="sup-item-main">
                      <span className="sup-item-top">
                        <span className="sup-item-subject">{t.subject || 'No subject'}</span>
                        <span className="sup-item-time">{fmtTime(t.updated_at)}</span>
                      </span>
                      <span className="sup-item-mail">{t.user_email}</span>
                      <span className="sup-item-snippet">{t.latest_message?.snippet || 'No messages yet'}</span>
                      <span style={{ display: 'inline-flex', gap: 5, marginTop: 6 }}>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        {t.priority && t.priority !== 'low' && (
                          <Badge tone={PRIORITY_TONE[t.priority] || 'neutral'}>{t.priority}</Badge>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <EmptyState
                icon={Inbox}
                title={loading ? 'Loading tickets…' : 'No tickets here'}
                description={loading ? 'Fetching the latest conversations.' : 'Nothing matches this filter yet.'}
              />
            )}
          </div>
        </section>

        <section className="sup-thread" aria-label="Conversation">
          {ticketLoading ? (
            <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--md-ink-3)' }}>
              <RefreshCw size={20} className="animate-spin" />
            </div>
          ) : !activeTicket ? (
            <EmptyState
              icon={LifeBuoy}
              title="Select a conversation"
              description="Choose a ticket on the left to read the thread and reply."
            />
          ) : (
            <>
              <div className="sup-thread-head">
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" className="sup-back" onClick={() => setShowInboxMobile(true)} aria-label="Back to inbox">
                      <ArrowLeft size={15} />
                    </button>
                    <h2 className="sup-subject">{activeTicket.subject || 'No subject'}</h2>
                    <Badge tone={statusMeta.tone} dot>{statusMeta.label}</Badge>
                    {activeTicket.priority && <Badge tone={PRIORITY_TONE[activeTicket.priority] || 'neutral'}>{activeTicket.priority}</Badge>}
                  </div>
                  <div className="sup-sub">
                    <span className="sup-id">#{activeTicket.ticket_id}</span>
                    <button type="button" className="sup-id-btn" onClick={copyTicketId} aria-label="Copy ticket ID">
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                    <span>{activeTicket.user_email}</span>
                    {activeTicket.target_domain && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Globe2 size={11} /> {activeTicket.target_domain}
                      </span>
                    )}
                    <span>· {activeTicket.message_count || messages.length} messages</span>
                  </div>
                </div>
                <div className="sup-thread-actions">
                  {activeTicket.target_domain && (
                    <Button variant="secondary" size="sm" icon={Activity} onClick={() => handleInspectOrigin(activeTicket.target_domain)} disabled={inspecting}>
                      {inspecting ? 'Inspecting' : 'Inspect site'}
                    </Button>
                  )}
                  <select className="sup-select" value={activeTicket.status} onChange={(e) => handleStatusChange(e.target.value)} aria-label="Ticket status">
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="waiting_user">Waiting on customer</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteTicket(activeTicket.ticket_id)} aria-label="Delete ticket">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              <div className="sup-messages" ref={threadRef}>
                {inspectorData && (
                  <div className="sup-diag">
                    <div className="sup-diag-title">
                      <Activity size={13} /> Live diagnostics · {inspectorData.domain}
                      <button type="button" onClick={() => setInspectorData(null)} style={{ marginLeft: 'auto', border: 0, background: 'none', color: 'var(--md-info)', cursor: 'pointer', fontSize: 10 }}>
                        Close
                      </button>
                    </div>
                    {inspectorData.found ? (
                      <div className="sup-diag-grid">
                        <span>WAF: <strong>{String(inspectorData.waf_mode || '—').toUpperCase()}</strong></span>
                        <span>Origin: <strong>{inspectorData.status || '—'}</strong></span>
                        <span>Health: <strong>{inspectorData.health_score ?? '—'}%</strong></span>
                        <span>WordPress: <strong>v{inspectorData.wp_version || '—'}</strong></span>
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: 'var(--md-danger)' }}>{inspectorData.message || 'Site did not respond.'}</div>
                    )}
                  </div>
                )}

                {grouped.length ? (
                  grouped.map((row) =>
                    row.type === 'day' ? (
                      <div className="sup-day" key={row.key}><span>{row.day}</span></div>
                    ) : (
                      <div className={`sup-msg ${row.msg.sender_type === 'admin' ? 'admin' : 'customer'}`} key={row.msg.msg_id || row.msg.created_at}>
                        <span className="sup-msg-avatar">
                          {row.msg.sender_type === 'admin' ? (staffName || 'M').slice(0, 1).toUpperCase() : initials(activeTicket.user_email)}
                        </span>
                        <div className="sup-bubble">
                          <div className="sup-meta">
                            <strong>{row.msg.sender_type === 'admin' ? 'Support' : activeTicket.user_email}</strong>
                            <span>{fmtTime(row.msg.created_at)}</span>
                          </div>
                          <div className="sup-body">{row.msg.message}</div>
                        </div>
                      </div>
                    )
                  )
                ) : (
                  <EmptyState icon={MessageSquare} title="No messages yet" description="The conversation will appear here." />
                )}
              </div>

              <form className="sup-composer" onSubmit={handleSendReply}>
                <div className="sup-composer-top">
                  <div className="sup-canned">
                    {CANNED_REPLIES.map((c) => (
                      <button
                        key={c.label}
                        type="button"
                        className="sup-chip"
                        onClick={() => {
                          setReplyText((prev) => (prev ? `${prev}\n\n${c.text}` : c.text));
                          composerRef.current?.focus();
                        }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'var(--md-ink-3)' }}>
                    <UserRound size={12} />
                    <input
                      value={staffName}
                      onChange={(e) => saveStaff(e.target.value)}
                      aria-label="Responding as"
                      style={{ width: 140, height: 26, border: '1px solid var(--md-line)', borderRadius: 6, padding: '0 7px', fontSize: 11, fontFamily: 'inherit', background: 'var(--md-surface)', color: 'var(--md-ink)' }}
                    />
                  </div>
                </div>

                <textarea
                  ref={composerRef}
                  className="sup-textarea"
                  placeholder={`Reply to ${activeTicket.user_email}…`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSendReply(e);
                  }}
                />

                <div className="sup-composer-bottom">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10.5, color: 'var(--md-ink-3)' }}>
                    <span>Status after reply</span>
                    <select className="sup-select" value={replyStatus} onChange={(e) => setReplyStatus(e.target.value)} aria-label="Status after reply">
                      <option value="waiting_user">Waiting on customer</option>
                      <option value="in_progress">In progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    <span className="sup-hint">⌘/Ctrl + Enter to send</span>
                  </div>
                  <Button variant="primary" type="submit" icon={Send} disabled={submittingReply || !replyText.trim()}>
                    {submittingReply ? 'Sending…' : 'Send reply'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </section>

        <aside className="sup-context" aria-label="Customer context">
          {activeTicket ? (
            <>
              <div className="sup-ctx-block">
                <p className="sup-ctx-label">Customer</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                  <span className="sup-avatar" style={{ width: 34, height: 34 }}>{initials(activeTicket.user_email)}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 650, color: 'var(--md-ink)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeTicket.user_name || activeTicket.user_email}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--md-ink-3)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeTicket.user_email}</div>
                  </div>
                </div>
              </div>

              <div className="sup-ctx-block">
                <p className="sup-ctx-label">Conversation</p>
                <div className="sup-ctx-row"><span>Status</span><strong><Badge tone={statusMeta.tone}>{statusMeta.label}</Badge></strong></div>
                <div className="sup-ctx-row"><span>Priority</span><strong style={{ textTransform: 'capitalize' }}>{activeTicket.priority || 'medium'}</strong></div>
                <div className="sup-ctx-row"><span>Category</span><strong style={{ textTransform: 'capitalize' }}>{String(activeTicket.category || 'general').replace(/_/g, ' ')}</strong></div>
                <div className="sup-ctx-row"><span>Opened</span><strong>{fmtDay(activeTicket.created_at)}</strong></div>
                <div className="sup-ctx-row"><span>Messages</span><strong>{activeTicket.message_count || messages.length}</strong></div>
              </div>

              {activeTicket.target_domain && (
                <div className="sup-ctx-block">
                  <p className="sup-ctx-label">Site</p>
                  <div className="sup-ctx-row"><span>Domain</span><strong>{activeTicket.target_domain}</strong></div>
                  <div className="sup-quick" style={{ marginTop: 6 }}>
                    <button type="button" onClick={() => handleInspectOrigin(activeTicket.target_domain)}>
                      <Activity size={12} /> Run live diagnostics
                    </button>
                    <Link to="/admin/clients"><Globe2 size={12} /> Open protected websites</Link>
                  </div>
                </div>
              )}

              <div className="sup-ctx-block">
                <p className="sup-ctx-label">Quick actions</p>
                <div className="sup-quick">
                  <Link to="/admin/users"><UserRound size={12} /> Open tenant record</Link>
                  <Link to="/admin/logs"><ShieldCheck size={12} /> Check WAF events</Link>
                  <Link to="/admin/learning"><Zap size={12} /> False-positive lab</Link>
                </div>
              </div>

              <div className="sup-ctx-block" style={{ marginBottom: 0 }}>
                <p className="sup-ctx-label">SLA</p>
                <div className="sup-ctx-row" style={{ alignItems: 'flex-start' }}>
                  <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: 'var(--md-ink-2)' }}>
                    <Clock3 size={12} /> First response target
                  </span>
                  <strong>4h</strong>
                </div>
                <div className="sup-ctx-row">
                  <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: 'var(--md-ink-2)' }}>
                    <Tag size={12} /> Plan
                  </span>
                  <strong>—</strong>
                </div>
              </div>
            </>
          ) : (
            <EmptyState icon={Inbox} title="No ticket selected" description="Customer context appears here." />
          )}
        </aside>
      </div>

      {toast && <div className={`sup-toast ${toast.isError ? 'error' : ''}`} role="status">{toast.text}</div>}
    </div>
  );
}
