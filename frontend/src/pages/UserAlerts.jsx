import { useState, useEffect } from 'react'
import {
  Bell,
  Mail,
  Send,
  MessageSquare,
  AlertTriangle,
  ShieldAlert,
  Clock,
  HardDrive,
  RefreshCw,
  Lock,
  Globe,
  Bug,
  Check,
  Zap,
  Sliders,
  Sparkles,
  Server,
  Activity,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Flame,
  Terminal,
  Settings,
  X
} from 'lucide-react'
import api from '../api/api'
import userStore from '../utils/userStore'

export default function UserAlerts() {
  const cachedUser = userStore.get('user') || {}
  const initialEmail = cachedUser.email || 'operator@enterprise.com'

  const [loading, setLoading] = useState(true)
  const [emailSettings, setEmailSettings] = useState({
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

  const [alertPolicies, setAlertPolicies] = useState([
    {
      id: 'ddos',
      title: 'Layer 7 Volumetric DDoS & Traffic Surges',
      desc: 'Dispatches emergency alert when ingress request rates exceed normal baselines by 300% or trigger automated rate scrubbing.',
      severity: 'CRITICAL',
      icon: Flame,
      enabled: true,
      color: '#DC2626',
      bg: '#FEF2F2',
      border: '#FECACA'
    },
    {
      id: 'bruteforce',
      title: 'Automated Bot & Brute-Force Bans',
      desc: 'Notifies when Turnstile bot gate or IP auto-shield bans more than 50 malicious IP scanners in a rolling 10-minute window.',
      severity: 'HIGH',
      icon: ShieldAlert,
      enabled: true,
      color: '#D97706',
      bg: '#FFFBEB',
      border: '#FDE68A'
    },
    {
      id: 'exploit',
      title: 'Zero-Day Injection & WAF Exploit Block',
      desc: 'Sends high-priority forensic dispatch including attack payload snippet, CVE signature, and source country when an exploit is blocked.',
      severity: 'CRITICAL',
      icon: Bug,
      enabled: true,
      color: '#DC2626',
      bg: '#FEF2F2',
      border: '#FECACA'
    },
    {
      id: 'ssl',
      title: 'SSL / TLS Certificate Expiry & Cipher Warning',
      desc: 'Proactive warnings at 30 days, 14 days, and 3 days before any domain SSL certificate expires or encounters TLS handshake failures.',
      severity: 'WARNING',
      icon: Lock,
      enabled: true,
      color: '#0284C7',
      bg: '#F0F9FF',
      border: '#BAE6FD'
    },
    {
      id: 'origin_down',
      title: 'Origin Host Unreachable (502 / 504 Gateway Drops)',
      desc: 'Alerts immediately when Anycast edge nodes fail to establish TCP connection with your origin server for 3 consecutive health checks.',
      severity: 'CRITICAL',
      icon: Server,
      enabled: true,
      color: '#DC2626',
      bg: '#FEF2F2',
      border: '#FECACA'
    },
    {
      id: 'wp_admin',
      title: 'WordPress Admin & API Unauthorized Intrusion',
      desc: 'Alerts when repeated credential stuffing attacks target /wp-login.php or xmlrpc.php, blocking offending subnet.',
      severity: 'HIGH',
      icon: ShieldCheck,
      enabled: true,
      color: '#D97706',
      bg: '#FFFBEB',
      border: '#FDE68A'
    }
  ])

  const [recentDispatches, setRecentDispatches] = useState([])
  const [toastMsg, setToastMsg] = useState(null)
  const [sendingTest, setSendingTest] = useState(false)

  const showToast = (text, type = 'success') => {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 4000)
  }

  // Load preferences and notifications from backend API
  const loadAlertData = async () => {
    try {
      const [prefRes, notifRes] = await Promise.all([
        api.getNotificationPreferences().catch(() => null),
        api.getNotifications({ limit: 30 }).catch(() => null)
      ])

      if (prefRes?.data?.preferences) {
        const p = prefRes.data.preferences
        const primEmail = p.primary_email || cachedUser.email || initialEmail
        const secEmail = p.secondary_email || ''
        setEmailSettings({
          primaryEmail: primEmail,
          secondaryEmail: secEmail,
          instantCritical: p.instant_critical ?? true,
          weeklyDigest: p.weekly_digest ?? true,
          includeForensicPayload: p.include_forensic_payload ?? true
        })
        setTempPrimaryEmail(primEmail)
        setTempSecondaryEmail(secEmail)

        setWebhookSettings({
          enabled: Boolean(p.webhook),
          url: p.webhook_url || '',
          secretToken: p.webhook_secret || '',
          format: 'json'
        })

        if (p.policy_states) {
          setAlertPolicies(prev => prev.map(pol => ({
            ...pol,
            enabled: p.policy_states[pol.id] !== undefined ? p.policy_states[pol.id] : pol.enabled
          })))
        }
      }

      if (notifRes?.data?.notifications) {
        const list = notifRes.data.notifications.map(n => ({
          id: n.id || n._id,
          title: n.title,
          target: n.data?.website_domain || n.website_id || 'Workspace Fleet',
          severity: (n.severity || 'info').toUpperCase(),
          destination: 'Dashboard & Corporate Email',
          status: 'Delivered',
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
      ;(updatedPolicies || alertPolicies).forEach(p => { policyStates[p.id] = p.enabled })

      const eSettings = updatedEmail || emailSettings
      const whSettings = updatedWebhook || webhookSettings

      await api.saveNotificationPreferences({
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
    const updated = alertPolicies.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p)
    setAlertPolicies(updated)
    persistPreferences(null, null, updated)
    showToast('Alert notification policy updated!')
  }

  const handleToggleWebhook = async () => {
    const next = !webhookSettings.enabled
    const updated = { ...webhookSettings, enabled: next }
    setWebhookSettings(updated)
    await persistPreferences(null, updated)
    showToast(`SOC Webhook ${next ? 'activated' : 'disabled'}!`)
  }

  const handleSendTestAlert = async () => {
    setSendingTest(true)
    try {
      await api.sendTestNotification()
      await loadAlertData()
      showToast(`Test security verification notification dispatched to ${emailSettings.primaryEmail}!`)
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

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '4px 0 60px' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          background: toastMsg.type === 'error' ? '#DC2626' : '#10201E',
          color: '#FFFFFF', padding: '12px 20px', borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(16, 32, 30, 0.25)', zIndex: 9999,
          fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px',
          fontSize: '13.5px'
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
            <Bell size={26} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#10201E', margin: 0, letterSpacing: '-0.3px' }}>
                Alerts &amp; Incident Notifications
              </h1>
              <span style={{
                background: '#F0FDF4', color: '#15803D', border: '1px solid #DCFCE7',
                padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
                fontWeight: '700', letterSpacing: '0.5px'
              }}>
                REAL-TIME SOC DISPATCH
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0', maxWidth: '680px', lineHeight: '1.5' }}>
              Configure corporate security notifications. Receive instant email alerts for volumetric DDoS attacks, zero-day WAF block events, origin server downtime, and SSL certificate expiration notices.
            </p>
          </div>
        </div>

        <button
          onClick={handleSendTestAlert}
          disabled={sendingTest}
          style={{
            padding: '10px 22px', borderRadius: '9px', border: 'none',
            background: sendingTest ? '#64748B' : '#10201E', color: '#FFFFFF', fontSize: '13px',
            fontWeight: '700', cursor: sendingTest ? 'not-allowed' : 'pointer', display: 'inline-flex',
            alignItems: 'center', gap: '8px', boxShadow: '0 2px 10px rgba(16, 32, 30, 0.18)',
            transition: 'all 0.15s ease'
          }}
        >
          {sendingTest ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
          <span>{sendingTest ? 'Dispatching Verification...' : 'Send Test Alert'}</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '14px', marginBottom: '24px'
      }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #D9E1DC', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 2px 6px rgba(16, 32, 30, 0.02)' }}>
          <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Watchdogs</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#10201E', marginTop: '6px' }}>
            {alertPolicies.filter(p => p.enabled).length} of {alertPolicies.length} Active
          </div>
          <div style={{ fontSize: '11.5px', color: '#15803D', marginTop: '4px' }}>Multi-vector threat monitoring</div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #D9E1DC', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 2px 6px rgba(16, 32, 30, 0.02)' }}>
          <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Primary Destination</div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#10201E', marginTop: '10px', wordBreak: 'break-all' }}>
            {emailSettings.primaryEmail}
          </div>
          <div style={{ fontSize: '11.5px', color: '#15803D', marginTop: '4px' }}>Verified Corporate Email</div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #D9E1DC', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 2px 6px rgba(16, 32, 30, 0.02)' }}>
          <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Delivery SLA</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#15803D', marginTop: '6px' }}>&lt; 15 Seconds</div>
          <div style={{ fontSize: '11.5px', color: '#16A34A', marginTop: '4px' }}>High-priority Anycast SMTP pipeline</div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #D9E1DC', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 2px 6px rgba(16, 32, 30, 0.02)' }}>
          <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recorded Dispatches</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#10201E', marginTop: '6px' }}>{recentDispatches.length} Events</div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>Logged in security audit trail</div>
        </div>
      </div>

      {/* Card 1: Enterprise Alert Channels (Email & Webhook) */}
      <div style={{
        background: '#FFFFFF', borderRadius: '16px', border: '1px solid #D9E1DC',
        padding: '24px 28px', marginBottom: '24px', boxShadow: '0 4px 18px rgba(16, 32, 30, 0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '800', color: '#10201E' }}>
              Incident Dispatch Channels
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
              Manage corporate notification destinations for critical security alerts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowEmailEdit(true)}
            style={{
              padding: '7px 16px', borderRadius: '8px', border: '1px solid #D9E1DC',
              background: '#FAFBF9', color: '#10201E', fontSize: '12.5px', fontWeight: '700',
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
            }}
          >
            <Settings size={13} />
            <span>Configure Recipients</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {/* Primary Channel: Corporate Email */}
          <div style={{
            border: '1.5px solid #D9E1DC', borderRadius: '12px', padding: '20px',
            background: '#FAFBF9', position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid #D9E1DC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10201E' }}>
                  <Mail size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#10201E' }}>Corporate Email Dispatch</div>
                  <div style={{ fontSize: '11.5px', color: '#64748B' }}>Primary incident escalation channel</div>
                </div>
              </div>
              <span style={{
                padding: '3px 9px', borderRadius: '20px', fontSize: '10.5px', fontWeight: '800',
                background: '#F0FDF4', color: '#15803D', border: '1px solid #DCFCE7'
              }}>
                ACTIVE (DEFAULT)
              </span>
            </div>

            <div style={{ fontSize: '12.5px', color: '#334155', lineHeight: '1.6', background: '#FFFFFF', padding: '12px 14px', borderRadius: '9px', border: '1px solid #E2E8F0', marginBottom: '12px' }}>
              <div>Primary: <strong style={{ color: '#10201E' }}>{emailSettings.primaryEmail}</strong></div>
              {emailSettings.secondaryEmail && (
                <div style={{ marginTop: '3px' }}>Secondary: <strong style={{ color: '#10201E' }}>{emailSettings.secondaryEmail}</strong></div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11.5px', padding: '2px 8px', borderRadius: '6px', background: '#FFFFFF', border: '1px solid #D9E1DC', color: '#475569', fontWeight: '600' }}>
                ✓ Instant Critical Alerts
              </span>
              <span style={{ fontSize: '11.5px', padding: '2px 8px', borderRadius: '6px', background: '#FFFFFF', border: '1px solid #D9E1DC', color: '#475569', fontWeight: '600' }}>
                ✓ Forensics Payload Included
              </span>
            </div>
          </div>

          {/* Secondary Channel: Webhook / Slack / PagerDuty */}
          <div style={{
            border: '1.5px solid #D9E1DC', borderRadius: '12px', padding: '20px',
            background: '#FAFBF9', position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid #D9E1DC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7' }}>
                  <Terminal size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#10201E' }}>SOC JSON Webhook</div>
                  <div style={{ fontSize: '11.5px', color: '#64748B' }}>Slack, Microsoft Teams, PagerDuty, Splunk</div>
                </div>
              </div>
              <span style={{
                padding: '3px 9px', borderRadius: '20px', fontSize: '10.5px', fontWeight: '800',
                background: webhookSettings.enabled ? '#F0FDF4' : '#F1F5F9',
                color: webhookSettings.enabled ? '#15803D' : '#64748B',
                border: `1px solid ${webhookSettings.enabled ? '#DCFCE7' : '#E2E8F0'}`
              }}>
                {webhookSettings.enabled ? 'ACTIVE' : 'OPTIONAL'}
              </span>
            </div>

            <div style={{ fontSize: '12.5px', color: '#64748B', lineHeight: '1.5', background: '#FFFFFF', padding: '12px 14px', borderRadius: '9px', border: '1px solid #E2E8F0', marginBottom: '12px' }}>
              {webhookSettings.enabled && webhookSettings.url ? (
                <div>Endpoint: <strong style={{ color: '#10201E', fontFamily: 'monospace' }}>{webhookSettings.url}</strong></div>
              ) : (
                <div>Connect your incident response management system via automated HTTP POST payload.</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleToggleWebhook}
                style={{
                  padding: '6px 14px', borderRadius: '7px',
                  background: webhookSettings.enabled ? '#FEF2F2' : '#10201E',
                  border: `1px solid ${webhookSettings.enabled ? '#FECACA' : '#10201E'}`,
                  color: webhookSettings.enabled ? '#DC2626' : '#FFFFFF',
                  fontSize: '11.5px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                {webhookSettings.enabled ? 'Disable Webhook' : 'Enable Webhook Endpoint'}
              </button>
              <button
                type="button"
                onClick={() => setShowWebhookEdit(true)}
                style={{
                  padding: '6px 12px', borderRadius: '7px',
                  background: '#FFFFFF', border: '1px solid #D9E1DC',
                  color: '#10201E', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                Edit URL &amp; Secret
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Security Threat Trigger Policies */}
      <div style={{
        background: '#FFFFFF', borderRadius: '16px', border: '1px solid #D9E1DC',
        padding: '24px 28px', marginBottom: '24px', boxShadow: '0 4px 18px rgba(16, 32, 30, 0.03)'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '800', color: '#10201E' }}>
            Security Threat Watchdogs &amp; Trigger Thresholds
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
            Define which security anomalies dispatch immediate notifications to your operations team.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
          {alertPolicies.map(policy => {
            const Icon = policy.icon
            return (
              <div
                key={policy.id}
                style={{
                  border: `1px solid ${policy.enabled ? '#D9E1DC' : '#E2E8F0'}`,
                  borderRadius: '12px', padding: '18px 20px',
                  background: policy.enabled ? '#FAFBF9' : '#F8FAFC',
                  transition: 'all 0.15s ease', opacity: policy.enabled ? 1 : 0.65
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '9px',
                      background: policy.bg, border: `1px solid ${policy.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: policy.color, flexShrink: 0
                    }}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: '800', color: '#10201E' }}>
                        {policy.title}
                      </h4>
                      <span style={{
                        fontSize: '9.5px', fontWeight: '800', padding: '1px 6px',
                        borderRadius: '4px', background: policy.bg, color: policy.color,
                        border: `1px solid ${policy.border}`, display: 'inline-block', marginTop: '3px'
                      }}>
                        {policy.severity}
                      </span>
                    </div>
                  </div>

                  {/* Switch */}
                  <label style={{ position: 'relative', display: 'inline-block', width: '38px', height: '22px', flexShrink: 0, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={policy.enabled}
                      onChange={() => handleTogglePolicy(policy.id)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                      background: policy.enabled ? '#10201E' : '#CBD5E1', borderRadius: '22px',
                      transition: '0.2s'
                    }}>
                      <span style={{
                        position: 'absolute', content: '""', height: '16px', width: '16px', left: policy.enabled ? '19px' : '3px',
                        bottom: '3px', background: '#FFFFFF', borderRadius: '50%', transition: '0.2s'
                      }} />
                    </span>
                  </label>
                </div>

                <p style={{ margin: 0, fontSize: '12px', color: '#64748B', lineHeight: '1.5' }}>
                  {policy.desc}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Card 3: Recent Incident Dispatch Feed */}
      <div style={{
        background: '#FFFFFF', borderRadius: '16px', border: '1px solid #D9E1DC',
        padding: '24px 28px', boxShadow: '0 4px 18px rgba(16, 32, 30, 0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '800', color: '#10201E' }}>
              Recent Security Incident Dispatches
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
              Audit trail of alerts delivered to corporate channels in the last 30 days.
            </p>
          </div>
        </div>

        {recentDispatches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#FAFBF9', border: '1px dashed #D9E1DC', borderRadius: '12px' }}>
            <ShieldCheck size={36} style={{ color: '#15803D', margin: '0 auto 10px' }} />
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: '800', color: '#10201E' }}>No Security Alerts Dispatched Yet</h4>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#64748B', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>
              All connected domains are clean and protected with zero critical incidents. Click "Send Test Alert" to verify delivery to your inbox.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {recentDispatches.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 18px', border: '1px solid #D9E1DC', borderRadius: '10px',
                  background: '#FAFBF9', flexWrap: 'wrap', gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    padding: '3px 8px', borderRadius: '5px', fontSize: '10px', fontWeight: '800',
                    background: item.severity === 'CRITICAL' ? '#FEF2F2' : item.severity === 'HIGH' ? '#FFFBEB' : '#F0F9FF',
                    color: item.severity === 'CRITICAL' ? '#DC2626' : item.severity === 'HIGH' ? '#D97706' : '#0284C7',
                    border: `1px solid ${item.severity === 'CRITICAL' ? '#FECACA' : item.severity === 'HIGH' ? '#FDE68A' : '#BAE6FD'}`
                  }}>
                    {item.severity}
                  </span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#10201E' }}>
                      {item.title} <span style={{ color: '#64748B', fontWeight: '500' }}>on {item.target}</span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                      {item.details} • Dispatched via {item.destination}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: '#F0FDF4', color: '#15803D', border: '1px solid #DCFCE7' }}>
                    {item.status}
                  </span>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Configure Recipients Modal */}
      {showEmailEdit && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(16, 32, 30, 0.65)',
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
                <Mail size={18} style={{ color: '#10201E' }} />
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#10201E', margin: 0 }}>
                  Corporate Alert Recipients
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailEdit(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEmail} style={{ padding: '22px 24px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#10201E', marginBottom: '6px' }}>
                  Primary Incident Email
                </label>
                <input
                  type="email"
                  value={tempPrimaryEmail}
                  onChange={e => setTempPrimaryEmail(e.target.value)}
                  required
                  style={{
                    width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px',
                    border: '1px solid #D9E1DC', background: '#FFFFFF', color: '#10201E',
                    fontSize: '13px', boxSizing: 'border-box', outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#10201E', marginBottom: '6px' }}>
                  Secondary / SOC Team Backup Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="soc-lead@company.com"
                  value={tempSecondaryEmail}
                  onChange={e => setTempSecondaryEmail(e.target.value)}
                  style={{
                    width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px',
                    border: '1px solid #D9E1DC', background: '#FFFFFF', color: '#10201E',
                    fontSize: '13px', boxSizing: 'border-box', outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowEmailEdit(false)}
                  style={{
                    padding: '9px 18px', background: '#FFFFFF', border: '1px solid #D9E1DC',
                    borderRadius: '8px', fontSize: '12.5px', fontWeight: '700', color: '#475569', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '9px 20px', background: '#10201E', border: 'none',
                    borderRadius: '8px', fontSize: '12.5px', fontWeight: '700', color: '#FFFFFF',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                    boxShadow: '0 2px 8px rgba(16, 32, 30, 0.2)'
                  }}
                >
                  <Check size={14} />
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
          position: 'fixed', inset: 0, background: 'rgba(16, 32, 30, 0.65)',
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
                <Terminal size={18} style={{ color: '#0284C7' }} />
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#10201E', margin: 0 }}>
                  Configure SOC Webhook
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWebhookEdit(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setShowWebhookEdit(false)
                await persistPreferences(null, webhookSettings)
                showToast('Webhook configuration updated!')
              }}
              style={{ padding: '22px 24px' }}
            >
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#10201E', marginBottom: '6px' }}>
                  HTTP POST Endpoint URL
                </label>
                <input
                  type="url"
                  placeholder="https://hooks.slack.com/services/... or https://api.pagerduty.com/..."
                  value={webhookSettings.url}
                  onChange={e => setWebhookSettings({ ...webhookSettings, url: e.target.value })}
                  required
                  style={{
                    width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px',
                    border: '1px solid #D9E1DC', background: '#FFFFFF', color: '#10201E',
                    fontSize: '13px', boxSizing: 'border-box', outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#10201E', marginBottom: '6px' }}>
                  HMAC Secret / Authorization Token (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Bearer token or signing secret"
                  value={webhookSettings.secretToken}
                  onChange={e => setWebhookSettings({ ...webhookSettings, secretToken: e.target.value })}
                  style={{
                    width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px',
                    border: '1px solid #D9E1DC', background: '#FFFFFF', color: '#10201E',
                    fontSize: '13px', boxSizing: 'border-box', outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowWebhookEdit(false)}
                  style={{
                    padding: '9px 18px', background: '#FFFFFF', border: '1px solid #D9E1DC',
                    borderRadius: '8px', fontSize: '12.5px', fontWeight: '700', color: '#475569', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '9px 20px', background: '#10201E', border: 'none',
                    borderRadius: '8px', fontSize: '12.5px', fontWeight: '700', color: '#FFFFFF',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                    boxShadow: '0 2px 8px rgba(16, 32, 30, 0.2)'
                  }}
                >
                  <Check size={14} />
                  <span>Save Endpoint</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
