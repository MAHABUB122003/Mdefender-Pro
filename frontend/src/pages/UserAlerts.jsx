import { useState, useEffect, useMemo } from 'react'
import {
  Bell,
  Mail,
  Send,
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  Lock,
  Globe,
  Bug,
  Check,
  Server,
  CheckCircle2,
  ShieldCheck,
  Flame,
  Terminal,
  Settings,
  Trash2,
  X,
  Link2,
  Zap
} from 'lucide-react'
import api from '../api/api'
import userStore from '../utils/userStore'

const POLICY_DEFINITIONS = [
  {
    id: 'site_lifecycle',
    title: 'Website Connected & Disconnected Events',
    desc: 'Sends instant notification & email with domain name whenever a new WordPress site connects or disconnects from your fleet.',
    severity: 'LIFECYCLE',
    icon: Link2
  },
  {
    id: 'origin_down',
    title: 'Website Down & Recovery Watchdog',
    desc: 'Alerts once when your website becomes unreachable (502/504/Timeout) and sends a recovery notice once back online.',
    severity: 'CRITICAL',
    icon: Server
  },
  {
    id: 'ssl',
    title: 'SSL / TLS Certificate Expiry Warnings',
    desc: 'Proactive email & dashboard alerts at 30 days, 14 days, and 3 days before any domain SSL certificate expires.',
    severity: 'WARNING',
    icon: Lock
  },
  {
    id: 'malware',
    title: 'Malware, Backdoor & Core Tamper Detection',
    desc: 'Immediate critical dispatch when scanner detects infected PHP files, web shells, or modified WordPress core checksums.',
    severity: 'CRITICAL',
    icon: Bug
  },
  {
    id: 'ddos',
    title: 'Volumetric DDoS & Attack Surge (Zero-Spam)',
    desc: 'Never spams per attack — sends 1 consolidated alert per 60 min only when a domain experiences a surge (50+ blocks / 10m).',
    severity: 'CRITICAL',
    icon: Flame
  },
  {
    id: 'bruteforce',
    title: 'Automated Bot & Brute-Force Lockouts',
    desc: 'Notifies when automated IP defense quarantines repeated credential-stuffing or brute-force scanners.',
    severity: 'HIGH',
    icon: ShieldAlert
  },
  {
    id: 'exploit',
    title: 'Zero-Day Injection & WAF Exploit Surge',
    desc: 'Escalates high-severity SQLi/RCE/XSS exploit waves with forensic summary without flooding your inbox.',
    severity: 'CRITICAL',
    icon: Zap
  },
  {
    id: 'wp_admin',
    title: 'WordPress Admin Gateway Intrusion',
    desc: 'Alerts on unauthorized attempts targeting concealed login gateways or admin IP lockdown rules.',
    severity: 'HIGH',
    icon: ShieldCheck
  }
]

export default function UserAlerts() {
  const cachedUser = userStore.get('user') || {}
  const storedUserEmail = (typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_user_email') : '') || ''
  const initialEmail = cachedUser.email || storedUserEmail || ''

  const [loading, setLoading] = useState(true)
  const [emailSettings, setEmailSettings] = useState({
    emailEnabled: true,
    primaryEmail: initialEmail,
    secondaryEmail: '',
    instantCritical: true,
    weeklyDigest: true,
    includeForensicPayload: true
  })

  const [webhookSettings, setWebhookSettings] = useState({
    enabled: false,
    url: '',
    secretToken: '',
    format: 'json'
  })

  const [showWebhookEdit, setShowWebhookEdit] = useState(false)
  const [showEmailEdit, setShowEmailEdit] = useState(false)
  const [tempPrimaryEmail, setTempPrimaryEmail] = useState(initialEmail)
  const [tempSecondaryEmail, setTempSecondaryEmail] = useState('')

  const [alertPolicies, setAlertPolicies] = useState(() =>
    POLICY_DEFINITIONS.map(p => ({ ...p, enabled: true }))
  )

  const [recentDispatches, setRecentDispatches] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [feedFilter, setFeedFilter] = useState('all') // 'all' | 'unread' | 'critical' | 'lifecycle'
  const [toastMsg, setToastMsg] = useState(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [testingWebhook, setTestingWebhook] = useState(false)

  const showToast = (text, type = 'success') => {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 4000)
  }

  const loadAlertData = async () => {
    try {
      const [prefRes, notifRes] = await Promise.all([
        api.getNotificationPreferences().catch(() => null),
        api.getNotifications({ limit: 40 }).catch(() => null)
      ])

      const prefs = prefRes?.data?.preferences || prefRes?.preferences
      if (prefs) {
        const primEmail = prefs.primary_email || initialEmail
        const secEmail = prefs.secondary_email || ''
        setEmailSettings({
          emailEnabled: prefs.email ?? true,
          primaryEmail: primEmail,
          secondaryEmail: secEmail,
          instantCritical: prefs.instant_critical ?? true,
          weeklyDigest: prefs.weekly_digest ?? true,
          includeForensicPayload: prefs.include_forensic_payload ?? true
        })
        setTempPrimaryEmail(primEmail)
        setTempSecondaryEmail(secEmail)

        setWebhookSettings({
          enabled: Boolean(prefs.webhook),
          url: prefs.webhook_url || '',
          secretToken: prefs.webhook_secret || '',
          format: 'json'
        })

        if (prefs.policy_states) {
          setAlertPolicies(
            POLICY_DEFINITIONS.map(pol => ({
              ...pol,
              enabled: prefs.policy_states[pol.id] !== undefined ? Boolean(prefs.policy_states[pol.id]) : true
            }))
          )
        }
      }

      const notifPayload = notifRes?.data || notifRes
      if (notifPayload?.notifications) {
        setUnreadCount(Number(notifPayload.unread || 0))
        const list = notifPayload.notifications.map(n => ({
          id: n.id || n._id,
          title: n.title,
          target: n.data?.website_domain || n.data?.domain || n.website_id || 'Workspace Fleet',
          severity: (n.severity || 'info').toUpperCase(),
          category: n.category || 'general',
          read: Boolean(n.read),
          destination: 'Bell & Email',
          time: n.created_at ? new Date(n.created_at).toLocaleString() : 'Recent',
          details: n.message
        }))
        setRecentDispatches(list)
      }
    } catch (err) {
      console.error('Failed to load alert settings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAlertData()
  }, [])

  const persistPreferences = async (updatedEmail, updatedWebhook, updatedPolicies) => {
    try {
      const policyStates = {}
      ;(updatedPolicies || alertPolicies).forEach(p => {
        policyStates[p.id] = p.enabled
      })

      const eSettings = updatedEmail || emailSettings
      const whSettings = updatedWebhook || webhookSettings

      await api.saveNotificationPreferences({
        email: eSettings.emailEnabled,
        primary_email: eSettings.primaryEmail,
        secondary_email: eSettings.secondaryEmail,
        instant_critical: eSettings.instantCritical,
        weekly_digest: eSettings.weeklyDigest,
        include_forensic_payload: eSettings.includeForensicPayload,
        webhook: whSettings.enabled,
        webhook_url: whSettings.url,
        webhook_secret: whSettings.secretToken,
        policy_states: policyStates
      })
    } catch (err) {
      console.error('Failed to persist notification preferences:', err)
    }
  }

  const handleTogglePolicy = (id) => {
    const updated = alertPolicies.map(p => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    setAlertPolicies(updated)
    persistPreferences(null, null, updated)
    showToast('Alert policy updated!')
  }

  const handleToggleEmailChannel = async () => {
    const next = !emailSettings.emailEnabled
    const updated = { ...emailSettings, emailEnabled: next }
    setEmailSettings(updated)
    await persistPreferences(updated, null)
    showToast(`Email alerts ${next ? 'enabled' : 'paused'}!`)
  }

  const handleToggleWebhook = async () => {
    const next = !webhookSettings.enabled
    const updated = { ...webhookSettings, enabled: next }
    setWebhookSettings(updated)
    await persistPreferences(null, updated)
    showToast(`SOC Webhook ${next ? 'activated' : 'disabled'}!`)
  }

  const handleTestWebhook = async () => {
    if (!webhookSettings.url) {
      setShowWebhookEdit(true)
      return
    }
    setTestingWebhook(true)
    try {
      const res = await api.testNotificationWebhook({
        webhook_url: webhookSettings.url,
        webhook_secret: webhookSettings.secretToken
      })
      showToast(res?.message || 'Webhook endpoint verified successfully!')
    } catch (err) {
      showToast(err.message || 'Webhook verification failed.', 'error')
    } finally {
      setTestingWebhook(false)
    }
  }

  const handleDeleteDispatch = async (id) => {
    try {
      await api.deleteNotification(id)
      setRecentDispatches(prev => prev.filter(item => item.id !== id))
      window.dispatchEvent(new Event('mdf_notifications_updated'))
      showToast('Incident dispatch record cleared.')
    } catch (err) {
      showToast('Failed to clear dispatch record.', 'error')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead()
      setRecentDispatches(prev => prev.map(item => ({ ...item, read: true })))
      setUnreadCount(0)
      window.dispatchEvent(new Event('mdf_notifications_updated'))
      showToast('All alerts marked as read.')
    } catch {
      showToast('Failed to update read status.', 'error')
    }
  }

  const handleClearAllDispatches = async () => {
    try {
      if (api.clearAllNotifications) {
        await api.clearAllNotifications()
      } else {
        await api.markAllNotificationsRead()
      }
      setRecentDispatches([])
      setUnreadCount(0)
      window.dispatchEvent(new Event('mdf_notifications_updated'))
      showToast('All incident dispatch records cleared.')
    } catch (err) {
      showToast('Failed to clear dispatch records.', 'error')
    }
  }

  const handleSendTestAlert = async () => {
    setSendingTest(true)
    try {
      await api.sendTestNotification()
      await loadAlertData()
      window.dispatchEvent(new Event('mdf_notifications_updated'))
      showToast(`Test alert dispatched to dashboard${emailSettings.primaryEmail ? ` & ${emailSettings.primaryEmail}` : ''}!`)
    } catch (err) {
      showToast(err.message || 'Failed to dispatch test notification.', 'error')
    } finally {
      setSendingTest(false)
    }
  }

  const handleSaveEmail = async (e) => {
    e.preventDefault()
    const updated = {
      ...emailSettings,
      primaryEmail: tempPrimaryEmail.trim(),
      secondaryEmail: tempSecondaryEmail.trim()
    }
    setEmailSettings(updated)
    setShowEmailEdit(false)
    await persistPreferences(updated, null)
    showToast('Alert recipient emails updated successfully!')
  }

  const filteredDispatches = useMemo(() => {
    if (feedFilter === 'unread') return recentDispatches.filter(i => !i.read)
    if (feedFilter === 'critical') return recentDispatches.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH')
    if (feedFilter === 'lifecycle') return recentDispatches.filter(i => i.category === 'website_connected' || i.category === 'website_disconnected' || i.category === 'site_recovered')
    return recentDispatches
  }, [recentDispatches, feedFilter])

  const activeWatchdogsCount = alertPolicies.filter(p => p.enabled).length

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '4px 0 32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          background: toastMsg.type === 'error' ? '#DC2626' : '#0B2522',
          color: '#FFFFFF', padding: '10px 18px', borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(16, 32, 30, 0.25)', zIndex: 99999,
          fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '12.5px'
        }}>
          {toastMsg.type === 'error' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} style={{ color: '#4ADE80' }} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* TOP 4 COMPACT ENTERPRISE KPI CHIPS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #D9E1DC', borderRadius: '8px', padding: '8px 12px', boxShadow: '0 1px 3px rgba(11,37,34,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Watchdogs</span>
            <Bell size={13} color="#2A8B68" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '15px', fontWeight: '700', color: '#0B2522' }}>{activeWatchdogsCount} / {alertPolicies.length} Enabled</span>
            <span style={{ fontSize: '10.5px', color: '#059669', fontWeight: 700 }}>Cooldown Active</span>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #D9E1DC', borderRadius: '8px', padding: '8px 12px', boxShadow: '0 1px 3px rgba(11,37,34,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registered Alert Email</span>
            <Mail size={13} color="#0B2522" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '6px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#0B2522', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {emailSettings.primaryEmail || 'Auto-Resolved on Login'}
            </span>
            <span style={{ fontSize: '10.5px', color: emailSettings.emailEnabled ? '#059669' : '#64748B', fontWeight: 700, flexShrink: 0 }}>
              {emailSettings.emailEnabled ? 'SMTP Ready' : 'Paused'}
            </span>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #D9E1DC', borderRadius: '8px', padding: '8px 12px', boxShadow: '0 1px 3px rgba(11,37,34,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spam Suppression</span>
            <ShieldCheck size={13} color="#2A8B68" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '15px', fontWeight: '700', color: '#0B2522' }}>Zero-Flood Engine</span>
            <span style={{ fontSize: '10.5px', color: '#60716B' }}>30d Auto-TTL</span>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #D9E1DC', borderRadius: '8px', padding: '8px 12px', boxShadow: '0 1px 3px rgba(11,37,34,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#60716B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alert Dispatches</span>
            <Globe size={13} color="#0B2522" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '15px', fontWeight: '700', color: '#0B2522' }}>{recentDispatches.length} Recorded</span>
            <span style={{ fontSize: '10.5px', color: unreadCount > 0 ? '#DC2626' : '#059669', fontWeight: 700 }}>
              {unreadCount} Unread
            </span>
          </div>
        </div>
      </div>

      {/* CARD 1: INCIDENT DISPATCH CHANNELS (COMPACT) */}
      <div style={{
        background: '#FFFFFF', borderRadius: '10px', border: '1px solid #D9E1DC',
        padding: '14px 18px', boxShadow: '0 1px 3px rgba(11, 37, 34, 0.02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>
              Incident Dispatch Channels
            </h3>
            <p style={{ margin: 0, fontSize: '11.5px', color: '#64748B' }}>
              Alerts automatically route to your registered account email and optional Slack, Discord, or SOC webhooks.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowEmailEdit(true)}
              style={{
                height: '32px', padding: '0 12px', borderRadius: '6px', border: '1px solid #CBD5E1',
                background: '#FFFFFF', color: '#0F172A', fontSize: '11.5px', fontWeight: '700',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px'
              }}
            >
              <Settings size={13} />
              <span>Edit Recipients</span>
            </button>
            <button
              type="button"
              onClick={handleSendTestAlert}
              disabled={sendingTest}
              style={{
                height: '32px', padding: '0 14px', borderRadius: '6px', border: 'none',
                background: sendingTest ? '#64748B' : '#0B2522', color: '#FFFFFF', fontSize: '11.5px',
                fontWeight: '700', cursor: sendingTest ? 'not-allowed' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '6px'
              }}
            >
              {sendingTest ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
              <span>{sendingTest ? 'Sending...' : 'Send Test Alert'}</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
          {/* Primary Channel: Registered Email */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 14px', background: '#F8FAFC' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0B2522' }}>
                  <Mail size={15} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>Corporate Email Dispatch</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Website lifecycle, uptime &amp; critical threat emails</div>
                </div>
              </div>
              <span style={{
                padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700',
                background: emailSettings.emailEnabled ? '#ECFDF5' : '#F1F5F9',
                color: emailSettings.emailEnabled ? '#059669' : '#64748B',
                border: emailSettings.emailEnabled ? '1px solid #A7F3D0' : '1px solid #E2E8F0'
              }}>
                {emailSettings.emailEnabled ? 'ACTIVE' : 'PAUSED'}
              </span>
            </div>

            <div style={{ fontSize: '11.5px', color: '#334155', background: '#FFFFFF', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', marginBottom: '10px' }}>
              <div>Primary: <strong style={{ color: '#0F172A' }}>{emailSettings.primaryEmail || 'Loading...'}</strong></div>
              {emailSettings.secondaryEmail && (
                <div style={{ marginTop: '2px' }}>Backup: <strong style={{ color: '#0F172A' }}>{emailSettings.secondaryEmail}</strong></div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{ fontSize: '10.5px', padding: '2px 7px', borderRadius: '5px', background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#475569', fontWeight: '600' }}>✓ Domain Included</span>
                <span style={{ fontSize: '10.5px', padding: '2px 7px', borderRadius: '5px', background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#475569', fontWeight: '600' }}>✓ Non-Blocking SMTP</span>
              </div>
              <button
                type="button"
                onClick={handleToggleEmailChannel}
                style={{
                  padding: '4px 10px', borderRadius: '6px', border: '1px solid #CBD5E1',
                  background: '#FFFFFF', color: '#0F172A', fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                {emailSettings.emailEnabled ? 'Pause Emails' : 'Enable Emails'}
              </button>
            </div>
          </div>

          {/* Secondary Channel: Webhook */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 14px', background: '#F8FAFC' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0B2522' }}>
                  <Terminal size={15} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>SOC / Slack / Discord Webhook</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Auto-formats Slack, Discord &amp; HMAC-signed JSON</div>
                </div>
              </div>
              <span style={{
                padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700',
                background: webhookSettings.enabled ? '#ECFDF5' : '#F1F5F9',
                color: webhookSettings.enabled ? '#059669' : '#64748B',
                border: webhookSettings.enabled ? '1px solid #A7F3D0' : '1px solid #E2E8F0'
              }}>
                {webhookSettings.enabled ? 'ACTIVE' : 'OPTIONAL'}
              </span>
            </div>

            <div style={{ fontSize: '11.5px', color: '#64748B', background: '#FFFFFF', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {webhookSettings.url ? (
                <span>Endpoint: <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{webhookSettings.url}</strong></span>
              ) : (
                <span>No webhook URL configured. Connect Slack, Discord, or PagerDuty.</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleToggleWebhook}
                style={{
                  padding: '5px 10px', borderRadius: '6px',
                  background: webhookSettings.enabled ? '#FFFFFF' : '#0B2522',
                  border: webhookSettings.enabled ? '1px solid #CBD5E1' : 'none',
                  color: webhookSettings.enabled ? '#0F172A' : '#FFFFFF',
                  fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                {webhookSettings.enabled ? 'Disable' : 'Enable Webhook'}
              </button>
              <button
                type="button"
                onClick={() => setShowWebhookEdit(true)}
                style={{
                  padding: '5px 10px', borderRadius: '6px', background: '#FFFFFF',
                  border: '1px solid #CBD5E1', color: '#0F172A', fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                Edit URL &amp; Secret
              </button>
              {webhookSettings.url && (
                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={testingWebhook}
                  style={{
                    padding: '5px 10px', borderRadius: '6px', background: '#FFFFFF',
                    border: '1px solid #CBD5E1', color: '#059669', fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                  }}
                >
                  {testingWebhook ? 'Testing...' : 'Test Webhook'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CARD 2: SMART ALERT POLICIES (HIGH-DENSITY 2/4-COL GRID) */}
      <div style={{
        background: '#FFFFFF', borderRadius: '10px', border: '1px solid #D9E1DC',
        padding: '14px 18px', boxShadow: '0 1px 3px rgba(11, 37, 34, 0.02)'
      }}>
        <div style={{ marginBottom: '12px' }}>
          <h3 style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>
            Smart Alert Triggers &amp; Anti-Spam Policies
          </h3>
          <p style={{ margin: 0, fontSize: '11.5px', color: '#64748B' }}>
            High-signal events trigger alerts immediately; routine single blocked attacks are silently logged without flooding your inbox.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '10px' }}>
          {alertPolicies.map(policy => {
            const Icon = policy.icon
            return (
              <div
                key={policy.id}
                style={{
                  border: `1px solid ${policy.enabled ? '#D9E1DC' : '#E2E8F0'}`,
                  borderRadius: '8px', padding: '10px 12px',
                  background: policy.enabled ? '#FFFFFF' : '#F8FAFC',
                  transition: 'all 0.15s ease', opacity: policy.enabled ? 1 : 0.65
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '7px',
                      background: '#F8FAF9', border: '1px solid #D9E1DC',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#0B2522', flexShrink: 0, marginTop: '2px'
                    }}>
                      <Icon size={14} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ margin: 0, fontSize: '12.5px', fontWeight: '800', color: '#0F172A', lineHeight: '1.35', wordBreak: 'break-word' }}>
                        {policy.title}
                      </h4>
                      <span style={{
                        fontSize: '9.5px', fontWeight: '700', padding: '1px 6px',
                        borderRadius: '4px', background: '#F1F5F3', color: '#475569',
                        border: '1px solid #E2E8F0', display: 'inline-block', marginTop: '4px'
                      }}>
                        {policy.severity}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <label style={{ position: 'relative', display: 'inline-block', width: '34px', height: '20px', flexShrink: 0, cursor: 'pointer', marginTop: '2px' }}>
                    <input
                      type="checkbox"
                      checked={policy.enabled}
                      onChange={() => handleTogglePolicy(policy.id)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                      background: policy.enabled ? '#0B2522' : '#CBD5E1', borderRadius: '20px', transition: '0.2s'
                    }}>
                      <span style={{
                        position: 'absolute', height: '14px', width: '14px', left: policy.enabled ? '17px' : '3px',
                        bottom: '3px', background: '#FFFFFF', borderRadius: '50%', transition: '0.2s'
                      }} />
                    </span>
                  </label>
                </div>

                <p style={{ margin: 0, fontSize: '11px', color: '#64748B', lineHeight: '1.4' }}>
                  {policy.desc}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* CARD 3: RECENT INCIDENT DISPATCH FEED */}
      <div style={{
        background: '#FFFFFF', borderRadius: '10px', border: '1px solid #D9E1DC',
        padding: '14px 18px', boxShadow: '0 1px 3px rgba(11, 37, 34, 0.02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>
              Recent Alert Dispatches (30-Day Auto-TTL)
            </h3>
            <p style={{ margin: 0, fontSize: '11.5px', color: '#64748B' }}>
              Clean audit trail of website connections, downtime incidents, and critical surge alerts.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: `Unread (${unreadCount})` },
              { id: 'critical', label: 'Critical' },
              { id: 'lifecycle', label: 'Site Events' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFeedFilter(tab.id)}
                style={{
                  padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                  border: feedFilter === tab.id ? '1px solid #0B2522' : '1px solid #E2E8F0',
                  background: feedFilter === tab.id ? '#0B2522' : '#FFFFFF',
                  color: feedFilter === tab.id ? '#FFFFFF' : '#475569'
                }}
              >
                {tab.label}
              </button>
            ))}

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  padding: '4px 10px', borderRadius: '6px', border: '1px solid #A7F3D0',
                  background: '#ECFDF5', color: '#059669', fontSize: '11px', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Mark All Read
              </button>
            )}

            {recentDispatches.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '4px 10px', borderRadius: '6px', border: '1px solid #E2E8F0',
                  background: '#FFFFFF', color: '#64748B', fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                <Trash2 size={12} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px', fontSize: '12px', color: '#64748B' }}>
            Loading alert history...
          </div>
        ) : filteredDispatches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 16px', background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '8px' }}>
            <ShieldCheck size={28} style={{ color: '#059669', margin: '0 auto 6px' }} />
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>No Security Alerts Dispatched Yet</div>
            <p style={{ margin: '3px auto 0', fontSize: '11.5px', color: '#64748B', maxWidth: '460px' }}>
              Your connected sites are healthy. Click &quot;Send Test Alert&quot; above to verify instant delivery to your email &amp; header bell.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {filteredDispatches.map(item => {
              const isCrit = item.severity === 'CRITICAL' || item.severity === 'HIGH'
              const isWarn = item.severity === 'WARNING'
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', border: `1px solid ${item.read ? '#E2E8F0' : '#CBD5E1'}`,
                    borderRadius: '8px', background: item.read ? '#FFFFFF' : '#F8FAFC',
                    flexWrap: 'wrap', gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <span style={{
                      padding: '2px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: '800', flexShrink: 0,
                      background: isCrit ? '#FEF2F2' : (isWarn ? '#FFFBEB' : '#ECFDF5'),
                      color: isCrit ? '#DC2626' : (isWarn ? '#D97706' : '#059669'),
                      border: `1px solid ${isCrit ? '#FECACA' : (isWarn ? '#FDE68A' : '#A7F3D0')}`
                    }}>
                      {item.severity}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#0F172A' }}>
                        {item.title} <span style={{ color: '#64748B', fontWeight: '600' }}>• {item.target}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        {item.details}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '10.5px', fontWeight: '700', color: item.read ? '#64748B' : '#059669' }}>
                        {item.read ? 'Read' : 'New'}
                      </span>
                      <div style={{ fontSize: '10.5px', color: '#94A3B8' }}>{item.time}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteDispatch(item.id)}
                      title="Dismiss alert"
                      style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px', display: 'flex' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Configure Recipients Modal */}
      {showEmailEdit && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(16, 32, 30, 0.6)',
          backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 99999, padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '12px', border: '1px solid #D9E1DC',
            width: '100%', maxWidth: '460px', boxShadow: '0 20px 40px rgba(16, 32, 30, 0.25)', overflow: 'hidden'
          }}>
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid #E2E8F0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={16} color="#0B2522" />
                <h3 style={{ fontSize: '14.5px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                  Alert Email Recipients
                </h3>
              </div>
              <button type="button" onClick={() => setShowEmailEdit(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEmail} style={{ padding: '18px 20px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0F172A', marginBottom: '5px' }}>
                  Primary Incident Email (Registered Account Email)
                </label>
                <input
                  type="email"
                  value={tempPrimaryEmail}
                  onChange={e => setTempPrimaryEmail(e.target.value)}
                  required
                  style={{
                    width: '100%', height: '36px', padding: '0 10px', borderRadius: '7px',
                    border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A',
                    fontSize: '12.5px', boxSizing: 'border-box', outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0F172A', marginBottom: '5px' }}>
                  Secondary / Team Backup Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="ops-backup@company.com"
                  value={tempSecondaryEmail}
                  onChange={e => setTempSecondaryEmail(e.target.value)}
                  style={{
                    width: '100%', height: '36px', padding: '0 10px', borderRadius: '7px',
                    border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A',
                    fontSize: '12.5px', boxSizing: 'border-box', outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowEmailEdit(false)}
                  style={{
                    height: '34px', padding: '0 14px', background: '#FFFFFF', border: '1px solid #CBD5E1',
                    borderRadius: '7px', fontSize: '12px', fontWeight: '700', color: '#475569', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    height: '34px', padding: '0 16px', background: '#0B2522', border: 'none',
                    borderRadius: '7px', fontSize: '12px', fontWeight: '700', color: '#FFFFFF',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px'
                  }}
                >
                  <Check size={13} />
                  <span>Save Recipients</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Configure Webhook Modal */}
      {showWebhookEdit && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(16, 32, 30, 0.6)',
          backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 99999, padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '12px', border: '1px solid #D9E1DC',
            width: '100%', maxWidth: '460px', boxShadow: '0 20px 40px rgba(16, 32, 30, 0.25)', overflow: 'hidden'
          }}>
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid #E2E8F0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={16} color="#0B2522" />
                <h3 style={{ fontSize: '14.5px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                  Configure SOC / Slack / Discord Webhook
                </h3>
              </div>
              <button type="button" onClick={() => setShowWebhookEdit(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setShowWebhookEdit(false)
                await persistPreferences(null, webhookSettings)
                showToast('Webhook configuration updated!')
              }}
              style={{ padding: '18px 20px' }}
            >
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0F172A', marginBottom: '5px' }}>
                  HTTP POST Endpoint URL
                </label>
                <input
                  type="url"
                  placeholder="https://hooks.slack.com/services/... or https://discord.com/api/webhooks/..."
                  value={webhookSettings.url}
                  onChange={e => setWebhookSettings({ ...webhookSettings, url: e.target.value })}
                  required
                  style={{
                    width: '100%', height: '36px', padding: '0 10px', borderRadius: '7px',
                    border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A',
                    fontSize: '12.5px', boxSizing: 'border-box', outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0F172A', marginBottom: '5px' }}>
                  HMAC Secret / Authorization Token (Optional for custom webhooks)
                </label>
                <input
                  type="text"
                  placeholder="Signing secret"
                  value={webhookSettings.secretToken}
                  onChange={e => setWebhookSettings({ ...webhookSettings, secretToken: e.target.value })}
                  style={{
                    width: '100%', height: '36px', padding: '0 10px', borderRadius: '7px',
                    border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A',
                    fontSize: '12.5px', boxSizing: 'border-box', outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowWebhookEdit(false)}
                  style={{
                    height: '34px', padding: '0 14px', background: '#FFFFFF', border: '1px solid #CBD5E1',
                    borderRadius: '7px', fontSize: '12px', fontWeight: '700', color: '#475569', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    height: '34px', padding: '0 16px', background: '#0B2522', border: 'none',
                    borderRadius: '7px', fontSize: '12px', fontWeight: '700', color: '#FFFFFF',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px'
                  }}
                >
                  <Check size={13} />
                  <span>Save Endpoint</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* CLEAR ALL DISPATCHES CONFIRMATION POPUP MODAL */}
      {showClearConfirm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            maxWidth: '440px',
            width: '100%',
            padding: '22px 24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: '#FEF2F2', color: '#DC2626',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <Trash2 size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                  Clear All Alert Dispatches?
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748B' }}>
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
              Are you sure you want to permanently clear all <strong>{recentDispatches.length}</strong> alert dispatch records from your security notification feed?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '7px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  setShowClearConfirm(false)
                  await handleClearAllDispatches()
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  borderRadius: '7px',
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)'
                }}
              >
                <Trash2 size={13} />
                <span>Yes, Clear All Alerts</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}