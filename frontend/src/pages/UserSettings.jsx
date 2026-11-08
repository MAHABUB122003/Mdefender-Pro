import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  User,
  Mail,
  KeyRound,
  ShieldCheck,
  Lock,
  Smartphone,
  Laptop,
  Copy,
  Check,
  Eye,
  EyeOff,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Terminal,
  Calendar,
  Layers,
  Tag,
  ArrowRight,
  Shield,
  Trash2,
  Globe,
  Clock,
  RefreshCw,
  Cpu,
  Fingerprint
} from 'lucide-react'
import api from '../api/api'
import userStore from '../utils/userStore'
import copyToClipboard from '../utils/clipboard'

export default function UserSettings() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const cachedUser = userStore.get('profile') || userStore.get('dashboard')?.user || null
  const [profile, setProfile] = useState(() => cachedUser)
  const [loading, setLoading] = useState(() => !cachedUser)

  // URL Tab handling
  const tabFromUrl = searchParams.get('tab')
  const initialTab = (() => {
    if (tabFromUrl === '2fa') return 'mfa'
    if (['profile', 'security', 'mfa', 'sessions', 'api', 'email'].includes(tabFromUrl)) return tabFromUrl
    return 'profile'
  })()
  const [activeTab, setActiveTab] = useState(initialTab)

  // Sync tab with URL search parameter
  useEffect(() => {
    const t = searchParams.get('tab')
    if (t === '2fa') setActiveTab('mfa')
    else if (t && ['profile', 'security', 'mfa', 'sessions', 'api', 'email'].includes(t)) {
      setActiveTab(t)
    }
  }, [searchParams])

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    setSearchParams({ tab: tabId })
  }

  // Profile Form
  const [nameForm, setNameForm] = useState({ name: cachedUser?.full_name || cachedUser?.name || '' })
  const [nameLoading, setNameLoading] = useState(false)

  // Password Form
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirmPassword: '' })
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwStrength, setPwStrength] = useState({ score: 0, label: '', color: '#E2E8F0' })

  // Email Form
  const [emailForm, setEmailForm] = useState({ new_email: '', password: '' })
  const [emailLoading, setEmailLoading] = useState(false)

  // Feedback notifications
  const [msg, setMsg] = useState('')
  const [errMsg, setErrMsg] = useState('')

  // 2FA / MFA
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaSetup, setMfaSetup] = useState(null)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)
  const [mfaDisableForm, setMfaDisableForm] = useState({ password: '', code: '' })

  // Sessions Management
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [terminatingSessionId, setTerminatingSessionId] = useState(null)
  const [terminatingAll, setTerminatingAll] = useState(false)

  // API Key
  const [apiKey, setApiKey] = useState(cachedUser?.api_key || 'mdf_live_sec_sample_key')
  const [isKeyMasked, setIsKeyMasked] = useState(true)
  const [copiedKey, setCopiedKey] = useState(false)
  const [regeneratingKey, setRegeneratingKey] = useState(false)
  const [activeSnippetTab, setActiveSnippetTab] = useState('curl')

  const showMsg = (text) => {
    setMsg(text)
    setErrMsg('')
    setTimeout(() => setMsg(''), 4500)
  }

  const showErr = (text) => {
    setErrMsg(text)
    setMsg('')
    setTimeout(() => setErrMsg(''), 4500)
  }

  // Fetch User Profile
  const fetchProfile = useCallback(async () => {
    try {
      const data = await api.getProfile()
      const usr = data.user || data
      const storedName = localStorage.getItem('mdefender_user_name') || ''
      const mergedUser = {
        ...usr,
        full_name: usr?.full_name || usr?.name || storedName || (usr?.email ? usr.email.split('@')[0] : '') || 'User',
        name: usr?.name || usr?.full_name || storedName || 'User',
        username: usr?.username || (usr?.email ? usr.email.split('@')[0] : '—'),
      }
      setProfile(mergedUser)
      setNameForm({ name: mergedUser.full_name })
      if (mergedUser.api_key) setApiKey(mergedUser.api_key)
      userStore.set('profile', mergedUser)
      if (mergedUser?.plan) localStorage.setItem('mdefender_user_plan', mergedUser.plan)
      if (mergedUser?.full_name) localStorage.setItem('mdefender_user_name', mergedUser.full_name)

      try {
        const mfaData = await api.getMFAStatus()
        setMfaEnabled(mfaData.mfa_enabled || false)
      } catch {}
    } catch {
      // In guest or local dev, don't force logout
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch Active Sessions
  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true)
    try {
      const data = await api.getSessions()
      setSessions(data.sessions || [])
    } catch {
      // ignore
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
    fetchSessions()
  }, [fetchProfile, fetchSessions])

  // Password Strength Calculation
  const calcPwStrength = (pw) => {
    let score = 0
    if (pw.length >= 8) score++
    if (pw.length >= 12) score++
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++

    if (pw.length === 0) return { score: 0, label: '', color: '#E2E8F0' }
    if (score <= 2) return { score: 1, label: 'Weak', color: '#EF4444' }
    if (score <= 4) return { score: 2, label: 'Moderate', color: '#F59E0B' }
    return { score: 3, label: 'Strong (Enterprise Grade)', color: '#10B981' }
  }

  // Update Profile Name
  const handleUpdateName = async (e) => {
    e.preventDefault()
    if (!nameForm.name.trim()) {
      showErr('Please enter a valid display name')
      return
    }
    setNameLoading(true)
    try {
      await api.updateProfile({ name: nameForm.name.trim() })
      const updated = { ...profile, name: nameForm.name.trim(), full_name: nameForm.name.trim() }
      setProfile(updated)
      userStore.set('profile', updated)
      localStorage.setItem('mdefender_user_name', nameForm.name.trim())
      showMsg('Profile name updated successfully!')
    } catch (err) {
      showErr(err.message || 'Failed to update profile name')
    } finally {
      setNameLoading(false)
    }
  }

  // Change Password
  const changePassword = async (e) => {
    e.preventDefault()
    if (pwForm.new_password !== pwForm.confirmPassword) {
      showErr('Passwords do not match')
      return
    }
    if (pwForm.new_password.length < 8) {
      showErr('New password must be at least 8 characters long')
      return
    }
    setPwLoading(true)
    try {
      await api.changePassword({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password
      })
      setPwForm({ current_password: '', new_password: '', confirmPassword: '' })
      setPwStrength({ score: 0, label: '', color: '#E2E8F0' })
      showMsg('Password updated successfully!')
    } catch (err) {
      showErr(err.message || 'Failed to update password')
    } finally {
      setPwLoading(false)
    }
  }

  // Change Email
  const changeEmail = async (e) => {
    e.preventDefault()
    setEmailLoading(true)
    try {
      await api.changeEmail({ new_email: emailForm.new_email, password: emailForm.password })
      setEmailForm({ new_email: '', password: '' })
      showMsg('Verification email sent to your new address. Please verify.')
    } catch (err) {
      showErr(err.message || 'Failed to update email')
    } finally {
      setEmailLoading(false)
    }
  }

  // 2FA Handlers
  const handleEnableMFA = async () => {
    setMfaLoading(true)
    try {
      const data = await api.enableMFA()
      setMfaSetup(data)
    } catch (err) {
      showErr(err.message || 'Failed to initiate 2FA setup')
    } finally {
      setMfaLoading(false)
    }
  }

  const handleVerifyMFA = async () => {
    if (mfaCode.length !== 6) {
      showErr('Please enter the 6-digit verification code')
      return
    }
    setMfaLoading(true)
    try {
      await api.verifyMFASetup(mfaCode)
      setMfaEnabled(true)
      setMfaSetup(null)
      setMfaCode('')
      showMsg('Two-Factor Authentication (2FA) is now active!')
    } catch (err) {
      showErr(err.message || 'Invalid verification code')
    } finally {
      setMfaLoading(false)
    }
  }

  const handleDisableMFA = async () => {
    if (!mfaDisableForm.password || !mfaDisableForm.code) {
      showErr('Password and 6-digit authenticator code are required')
      return
    }
    setMfaLoading(true)
    try {
      await api.disableMFA(mfaDisableForm.password, mfaDisableForm.code)
      setMfaEnabled(false)
      setMfaDisableForm({ password: '', code: '' })
      showMsg('Two-Factor Authentication has been disabled.')
    } catch (err) {
      showErr(err.message || 'Failed to disable 2FA. Verify password and code.')
    } finally {
      setMfaLoading(false)
    }
  }

  // Sessions Handlers
  const handleDeleteSession = async (sessionId) => {
    setTerminatingSessionId(sessionId)
    try {
      await api.deleteSession(sessionId)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      showMsg('Session terminated successfully.')
    } catch (err) {
      showErr(err.message || 'Failed to terminate session')
    } finally {
      setTerminatingSessionId(null)
    }
  }

  const handleDeleteAllSessions = async () => {
    if (!confirm('Are you sure you want to terminate all other active login sessions? You will stay logged in on this browser.')) {
      return
    }
    setTerminatingAll(true)
    try {
      await api.deleteAllSessions()
      await fetchSessions()
      showMsg('All other sessions terminated successfully!')
    } catch (err) {
      showErr(err.message || 'Failed to terminate sessions')
    } finally {
      setTerminatingAll(false)
    }
  }

  // API Key Handlers
  const handleCopyApiKey = async () => {
    const ok = await copyToClipboard(apiKey)
    if (ok) {
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
    }
  }

  const handleRegenerateKey = async () => {
    if (!confirm('Are you sure you want to regenerate your master API Key? Any WordPress sites or API clients using the current key will need to be updated.')) {
      return
    }
    setRegeneratingKey(true)
    try {
      const res = await api.regenerateApiKey()
      if (res?.api_key) {
        setApiKey(res.api_key)
        showMsg('Master API Key regenerated successfully!')
      } else {
        showMsg('Master API Key regenerated.')
      }
    } catch (err) {
      showErr(err.message || 'Failed to regenerate API key')
    } finally {
      setRegeneratingKey(false)
    }
  }

  const displayName = profile?.full_name || profile?.name || profile?.username || (profile?.email ? profile.email.split('@')[0] : '') || 'User'
  const userInitial = (displayName || 'U')[0].toUpperCase()
  const planName = (profile?.plan || 'Free').toUpperCase()
  const isPremium = profile?.plan && profile?.plan !== 'free'

  if (loading && !profile) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: '#60716B' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: '600' }}>
          <RotateCw size={22} style={{ animation: 'spin 1s linear infinite', color: '#E8792F' }} />
          <span>Loading Account &amp; Security Settings...</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '24px 20px', color: '#10201E' }}>
      
      {/* Toast Feedback Messages */}
      {msg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 18px',
          background: '#ECFDF5',
          border: '1px solid #A7F3D0',
          borderRadius: '12px',
          marginBottom: '20px',
          color: '#065F46',
          fontSize: '13px',
          fontWeight: '600',
          boxShadow: '0 2px 8px rgba(5,150,105,0.08)'
        }}>
          <CheckCircle2 size={18} color="#059669" />
          <span>{msg}</span>
        </div>
      )}

      {errMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 18px',
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '12px',
          marginBottom: '20px',
          color: '#991B1B',
          fontSize: '13px',
          fontWeight: '600',
          boxShadow: '0 2px 8px rgba(220,38,38,0.08)'
        }}>
          <AlertCircle size={18} color="#DC2626" />
          <span>{errMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. ENTERPRISE ACCOUNT IDENTITY BANNER                                     */}
      {/* ========================================================================= */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #D9E1DC',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '24px',
        boxShadow: '0 2px 12px rgba(11, 37, 34, 0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {/* Avatar Monogram */}
          <div style={{
            position: 'relative',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0B2522 0%, #164E46 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: '800',
            boxShadow: '0 4px 14px rgba(11, 37, 34, 0.2)',
            flexShrink: 0
          }}>
            {userInitial}
            <span style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: '#10B981',
              border: '2.5px solid #FFFFFF',
              boxShadow: '0 0 6px rgba(16,185,129,0.6)'
            }} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#10201E', margin: 0, letterSpacing: '-0.02em' }}>
                {displayName}
              </h1>
              <span style={{
                fontSize: '11px',
                fontWeight: '800',
                padding: '3px 10px',
                borderRadius: '9999px',
                background: isPremium ? '#F5F3FF' : '#F1F5F9',
                color: isPremium ? '#7C3AED' : '#475569',
                border: `1px solid ${isPremium ? '#DDD6FE' : '#CBD5E1'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Sparkles size={11} />
                <span>{planName} TIER</span>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: '#60716B' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} color="#87948D" />
                <span style={{ fontWeight: 500 }}>{profile?.email || '—'}</span>
                {profile?.email_verified !== false && (
                  <span style={{ color: '#059669', fontWeight: '700', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '2px', background: '#ECFDF5', padding: '1px 6px', borderRadius: '4px' }}>
                    <CheckCircle2 size={11} /> Verified
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} color={mfaEnabled ? '#059669' : '#F59E0B'} />
                <span>2FA: <strong style={{ color: mfaEnabled ? '#059669' : '#D97706' }}>{mfaEnabled ? 'Protected' : 'Inactive'}</strong></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Laptop size={14} color="#0284C7" />
                <span>Active Sessions: <strong style={{ color: '#0F172A' }}>{sessions.length || 1}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Link
            to="/user/pricing"
            style={{
              padding: '9px 16px',
              borderRadius: '9px',
              background: '#FEF3EB',
              color: '#D97735',
              border: '1px solid #FCD8BF',
              fontSize: '13px',
              fontWeight: '700',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Tag size={14} />
            <span>Manage Plan</span>
          </Link>

          <button
            type="button"
            onClick={() => handleTabChange('sessions')}
            style={{
              padding: '9px 16px',
              borderRadius: '9px',
              background: '#FAFBF9',
              color: '#334155',
              border: '1px solid #D9E1DC',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Laptop size={14} />
            <span>Manage Sessions</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TABBED SETTINGS SWITCHER                                               */}
      {/* ========================================================================= */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        background: '#FAFBF9',
        padding: '6px',
        borderRadius: '12px',
        border: '1px solid #E2E8F0'
      }}>
        {[
          { id: 'profile', icon: User, label: 'Account Profile' },
          { id: 'security', icon: Lock, label: 'Password & Security' },
          { id: 'mfa', icon: ShieldCheck, label: 'Two-Factor Auth (2FA)' },
          { id: 'sessions', icon: Laptop, label: `Active Sessions (${sessions.length || 1})` },
          { id: 'api', icon: Terminal, label: 'API Keys & Integration' },
          { id: 'email', icon: Mail, label: 'Change Email' },
        ].map(t => {
          const Icon = t.icon
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              style={{
                padding: '9px 15px',
                borderRadius: '9px',
                border: 'none',
                background: isActive ? '#0B2522' : 'transparent',
                color: isActive ? '#FFFFFF' : '#64748B',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 2px 8px rgba(11, 37, 34, 0.18)' : 'none'
              }}
            >
              <Icon size={15} color={isActive ? '#FFFFFF' : '#64748B'} />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ACCOUNT PROFILE                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #D9E1DC',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 2px 12px rgba(11, 37, 34, 0.04)'
        }}>
          <div style={{ marginBottom: '22px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#10201E', margin: '0 0 6px 0' }}>
              Personal &amp; Organization Details
            </h2>
            <p style={{ fontSize: '13px', color: '#60716B', margin: 0 }}>
              Update your public display name, manage identity attributes and security tier credentials.
            </p>
          </div>

          <form onSubmit={handleUpdateName}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '22px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '7px', textTransform: 'uppercase' }}>
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={nameForm.name}
                  onChange={e => setNameForm({ name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '9px',
                    border: '1px solid #D9E1DC',
                    background: '#FAFBF9',
                    fontSize: '13.5px',
                    color: '#10201E',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '7px', textTransform: 'uppercase' }}>
                  Account Email (Primary)
                </label>
                <input
                  type="email"
                  disabled
                  value={profile?.email || ''}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '9px',
                    border: '1px solid #E2E8F0',
                    background: '#F1F5F9',
                    fontSize: '13.5px',
                    color: '#64748B',
                    cursor: 'not-allowed',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '7px', textTransform: 'uppercase' }}>
                  Role &amp; Permissions
                </label>
                <input
                  type="text"
                  disabled
                  value={profile?.role ? profile.role.toUpperCase() : 'USER / FLEET OPERATOR'}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '9px',
                    border: '1px solid #E2E8F0',
                    background: '#F1F5F9',
                    fontSize: '13.5px',
                    color: '#64748B',
                    cursor: 'not-allowed',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '7px', textTransform: 'uppercase' }}>
                  Subscription Tier
                </label>
                <input
                  type="text"
                  disabled
                  value={`${planName} TIER (ACTIVE)`}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '9px',
                    border: '1px solid #E2E8F0',
                    background: '#F1F5F9',
                    fontSize: '13.5px',
                    color: '#64748B',
                    cursor: 'not-allowed',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={nameLoading}
              style={{
                padding: '10px 22px',
                borderRadius: '9px',
                background: '#0B2522',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13px',
                fontWeight: '700',
                cursor: nameLoading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              {nameLoading && <RotateCw size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              <span>Save Profile Changes</span>
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PASSWORD & SECURITY                                                */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #D9E1DC',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 2px 12px rgba(11, 37, 34, 0.04)'
        }}>
          <div style={{ marginBottom: '22px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#10201E', margin: '0 0 6px 0' }}>
              Update Master Password
            </h2>
            <p style={{ fontSize: '13px', color: '#60716B', margin: 0 }}>
              Ensure your account uses an enterprise-strength password to protect your centralized WordPress fleet.
            </p>
          </div>

          <form onSubmit={changePassword} style={{ maxWidth: '480px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '7px', textTransform: 'uppercase' }}>
                Current Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={pwForm.current_password}
                  onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 14px',
                    borderRadius: '9px',
                    border: '1px solid #D9E1DC',
                    background: '#FAFBF9',
                    fontSize: '13.5px',
                    color: '#10201E',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(prev => !prev)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748B'
                  }}
                >
                  {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '7px', textTransform: 'uppercase' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPw ? 'text' : 'password'}
                  required
                  placeholder="At least 8 characters"
                  value={pwForm.new_password}
                  onChange={e => {
                    const val = e.target.value
                    setPwForm({ ...pwForm, new_password: val })
                    setPwStrength(calcPwStrength(val))
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 14px',
                    borderRadius: '9px',
                    border: '1px solid #D9E1DC',
                    background: '#FAFBF9',
                    fontSize: '13.5px',
                    color: '#10201E',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(prev => !prev)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748B'
                  }}
                >
                  {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {pwForm.new_password && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>Password Strength:</span>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: pwStrength.color }}>{pwStrength.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', height: '4px' }}>
                    <div style={{ flex: 1, background: pwStrength.score >= 1 ? pwStrength.color : '#E2E8F0', borderRadius: '2px' }} />
                    <div style={{ flex: 1, background: pwStrength.score >= 2 ? pwStrength.color : '#E2E8F0', borderRadius: '2px' }} />
                    <div style={{ flex: 1, background: pwStrength.score >= 3 ? pwStrength.color : '#E2E8F0', borderRadius: '2px' }} />
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '7px', textTransform: 'uppercase' }}>
                Confirm New Password
              </label>
              <input
                type="password"
                required
                placeholder="Re-type new password"
                value={pwForm.confirmPassword}
                onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '9px',
                  border: '1px solid #D9E1DC',
                  background: '#FAFBF9',
                  fontSize: '13.5px',
                  color: '#10201E',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={pwLoading}
              style={{
                padding: '10px 22px',
                borderRadius: '9px',
                background: '#0B2522',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13px',
                fontWeight: '700',
                cursor: pwLoading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              {pwLoading && <RotateCw size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              <span>Update Password</span>
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TWO-FACTOR AUTH (2FA / MFA)                                        */}
      {/* ========================================================================= */}
      {activeTab === 'mfa' && (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #D9E1DC',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 2px 12px rgba(11, 37, 34, 0.04)'
        }}>
          <div style={{ marginBottom: '22px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#10201E', margin: '0 0 6px 0' }}>
              Two-Factor Authentication (TOTP / Google Authenticator)
            </h2>
            <p style={{ fontSize: '13px', color: '#60716B', margin: 0 }}>
              Add a mandatory extra layer of cryptographic protection to your operator credentials.
            </p>
          </div>

          {/* Status Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderRadius: '12px',
            background: mfaEnabled ? '#ECFDF5' : '#FEF3EB',
            border: `1px solid ${mfaEnabled ? '#A7F3D0' : '#FCD8BF'}`,
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: mfaEnabled ? '#10B981' : '#F59E0B',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: mfaEnabled ? '#065F46' : '#92400E' }}>
                  2FA Status: {mfaEnabled ? 'Active & Enforced' : 'Disabled'}
                </h4>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: mfaEnabled ? '#047857' : '#B45309' }}>
                  {mfaEnabled
                    ? 'Your account requires an authenticator 6-digit TOTP code at every login.'
                    : 'Your account is currently protected only by your master password. Enable 2FA now.'}
                </p>
              </div>
            </div>

            {!mfaEnabled && !mfaSetup && (
              <button
                type="button"
                onClick={handleEnableMFA}
                disabled={mfaLoading}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: '#0B2522',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: mfaLoading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {mfaLoading && <RotateCw size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                <span>Set Up 2FA</span>
              </button>
            )}
          </div>

          {/* MFA Setup Wizard */}
          {!mfaEnabled && mfaSetup && (
            <div style={{
              background: '#FAFBF9',
              border: '1px solid #D9E1DC',
              borderRadius: '14px',
              padding: '24px',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#10201E', margin: '0 0 16px 0' }}>
                Scan QR Code with Authenticator App
              </h3>

              <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {mfaSetup?.qr_code && (
                  <div style={{
                    padding: '12px',
                    background: '#FFFFFF',
                    border: '1px solid #D9E1DC',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}>
                    <img
                      src={mfaSetup.qr_code.startsWith('data:') ? mfaSetup.qr_code : `data:image/png;base64,${mfaSetup.qr_code}`}
                      alt="2FA QR Code"
                      style={{ width: '160px', height: '160px', display: 'block' }}
                    />
                  </div>
                )}

                <div style={{ flex: 1, minWidth: '260px' }}>
                  <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 12px 0' }}>
                    Open <strong>Google Authenticator</strong>, <strong>1Password</strong>, or <strong>Authy</strong> on your phone and scan the QR code.
                  </p>

                  {mfaSetup?.secret && (
                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', display: 'block', marginBottom: '4px' }}>
                        OR ENTER SECRET KEY MANUALLY:
                      </span>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#FFFFFF',
                        border: '1px solid #D9E1DC',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#0B2522'
                      }}>
                        <code>{mfaSetup.secret}</code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(mfaSetup.secret)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#E8792F' }}
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ maxWidth: '280px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                      ENTER 6-DIGIT TOTP CODE:
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        maxLength="6"
                        placeholder="123456"
                        value={mfaCode}
                        onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                        style={{
                          width: '140px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #D9E1DC',
                          fontSize: '16px',
                          letterSpacing: '3px',
                          fontWeight: '700',
                          textAlign: 'center'
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleVerifyMFA}
                        disabled={mfaLoading || mfaCode.length !== 6}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          background: '#059669',
                          color: '#FFFFFF',
                          border: 'none',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: (mfaLoading || mfaCode.length !== 6) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Verify &amp; Activate
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Disable 2FA Section */}
          {mfaEnabled && (
            <div style={{
              borderTop: '1px solid #E2E8F0',
              paddingTop: '20px',
              maxWidth: '440px'
            }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#DC2626', margin: '0 0 6px 0' }}>
                Disable Two-Factor Authentication
              </h4>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 14px 0' }}>
                Disabling 2FA makes your account significantly less secure. You will need your current password and a final 6-digit TOTP code.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="password"
                  placeholder="Master Password"
                  value={mfaDisableForm.password}
                  onChange={e => setMfaDisableForm({ ...mfaDisableForm, password: e.target.value })}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D9E1DC',
                    fontSize: '13px'
                  }}
                />
                <input
                  type="text"
                  maxLength="6"
                  placeholder="6-Digit TOTP Code"
                  value={mfaDisableForm.code}
                  onChange={e => setMfaDisableForm({ ...mfaDisableForm, code: e.target.value.replace(/\D/g, '') })}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D9E1DC',
                    fontSize: '13px'
                  }}
                />
                <button
                  type="button"
                  onClick={handleDisableMFA}
                  disabled={mfaLoading}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#DC2626',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: mfaLoading ? 'not-allowed' : 'pointer',
                    alignSelf: 'flex-start'
                  }}
                >
                  Disable 2FA Protection
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ACTIVE SESSIONS & DEVICES (NEW)                                   */}
      {/* ========================================================================= */}
      {activeTab === 'sessions' && (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #D9E1DC',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 2px 12px rgba(11, 37, 34, 0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#10201E', margin: '0 0 6px 0' }}>
                Active Login Sessions &amp; Connected Devices
              </h2>
              <p style={{ fontSize: '13px', color: '#60716B', margin: 0 }}>
                Review all active browser sessions currently authorized to manage your Mdefender fleet.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={fetchSessions}
                disabled={sessionsLoading}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: '#FAFBF9',
                  border: '1px solid #D9E1DC',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={13} style={sessionsLoading ? { animation: 'spin 1s linear infinite' } : {}} />
                <span>Refresh</span>
              </button>

              {sessions.length > 1 && (
                <button
                  type="button"
                  onClick={handleDeleteAllSessions}
                  disabled={terminatingAll}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#DC2626',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: terminatingAll ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Trash2 size={13} />
                  <span>Terminate All Others</span>
                </button>
              )}
            </div>
          </div>

          {/* Sessions List */}
          {sessionsLoading && sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748B', fontSize: '13px' }}>
              <RotateCw size={18} style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginBottom: '8px' }} />
              <div>Loading active sessions...</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sessions.map(s => {
                const isMobile = (s.device || '').toLowerCase().includes('mobile') || (s.os || '').toLowerCase().includes('android') || (s.os || '').toLowerCase().includes('ios')
                const isCurrent = s.is_current

                return (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      borderRadius: '12px',
                      background: isCurrent ? '#F0FDF4' : '#FAFBF9',
                      border: `1px solid ${isCurrent ? '#86EFAC' : '#E2E8F0'}`,
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: isCurrent ? '#DCFCE7' : '#F1F5F9',
                        color: isCurrent ? '#16A34A' : '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {isMobile ? <Smartphone size={20} /> : <Laptop size={20} />}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>
                            {s.browser || 'Web Browser'} on {s.os || 'Desktop OS'}
                          </span>
                          {isCurrent && (
                            <span style={{
                              fontSize: '10.5px',
                              fontWeight: '700',
                              color: '#15803D',
                              background: '#DCFCE7',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16A34A' }} />
                              THIS DEVICE
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: '#64748B', flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Globe size={12} /> IP: {s.ip_address || '127.0.0.1'}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> Last active: {s.last_active ? new Date(s.last_active).toLocaleString() : 'Just now'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSession(s.id)}
                        disabled={terminatingSessionId === s.id}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '7px',
                          background: '#FFFFFF',
                          border: '1px solid #FECACA',
                          color: '#DC2626',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: terminatingSessionId === s.id ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {terminatingSessionId === s.id ? (
                          <RotateCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <Trash2 size={12} />
                        )}
                        <span>Revoke Session</span>
                      </button>
                    )}
                  </div>
                )
              })}

              {sessions.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748B', fontSize: '13px' }}>
                  No active sessions found.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: API KEYS & DEVELOPER CLI                                           */}
      {/* ========================================================================= */}
      {activeTab === 'api' && (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #D9E1DC',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 2px 12px rgba(11, 37, 34, 0.04)'
        }}>
          <div style={{ marginBottom: '22px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#10201E', margin: '0 0 6px 0' }}>
              Master Security API Key &amp; CLI Access
            </h2>
            <p style={{ fontSize: '13px', color: '#60716B', margin: 0 }}>
              Use your cryptographic API key to connect WordPress fleets, remote CI/CD security pipelines, and custom agents.
            </p>
          </div>

          {/* Master API Key Display */}
          <div style={{
            background: '#FAFBF9',
            border: '1px solid #D9E1DC',
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '26px'
          }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>
              Live Production Master Key
            </label>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{
                flex: 1,
                minWidth: '280px',
                padding: '10px 14px',
                background: '#FFFFFF',
                border: '1px solid #D9E1DC',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontFamily: 'monospace',
                color: '#0B2522',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {isKeyMasked
                  ? apiKey.slice(0, 12) + '••••••••••••••••••••••••••••••••' + apiKey.slice(-4)
                  : apiKey}
              </div>

              <button
                type="button"
                onClick={() => setIsKeyMasked(prev => !prev)}
                style={{
                  padding: '9px 14px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  border: '1px solid #D9E1DC',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isKeyMasked ? <Eye size={14} /> : <EyeOff size={14} />}
                <span>{isKeyMasked ? 'Reveal' : 'Mask'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyApiKey}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  background: copiedKey ? '#059669' : '#0B2522',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
              </button>

              <button
                type="button"
                onClick={handleRegenerateKey}
                disabled={regeneratingKey}
                style={{
                  padding: '9px 14px',
                  borderRadius: '8px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: regeneratingKey ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {regeneratingKey ? <RotateCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={13} />}
                <span>Regenerate Key</span>
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#889895', margin: '10px 0 0 0' }}>
              🔒 Never expose your master API key in public repositories or client-side code.
            </p>
          </div>

          {/* Quick Code Snippets */}
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#10201E', margin: '0 0 12px 0' }}>
              Integration Examples
            </h3>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              {['curl', 'python', 'nodejs', 'php'].map(lang => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveSnippetTab(lang)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: activeSnippetTab === lang ? '#0B2522' : '#F1F5F9',
                    color: activeSnippetTab === lang ? '#FFFFFF' : '#475569',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}
                >
                  {lang}
                </button>
              ))}
            </div>

            <div style={{
              background: '#0B1916',
              borderRadius: '10px',
              padding: '16px',
              color: '#A7F3D0',
              fontFamily: 'monospace',
              fontSize: '12.5px',
              lineHeight: 1.5,
              overflowX: 'auto'
            }}>
              {activeSnippetTab === 'curl' && (
                <pre style={{ margin: 0 }}>{`curl -X GET "http://127.0.0.1:8000/api/v1/websites" \\
  -H "Authorization: Bearer ${isKeyMasked ? 'mdf_live_sec_••••••••••••' : apiKey}" \\
  -H "Content-Type: application/json"`}</pre>
              )}
              {activeSnippetTab === 'python' && (
                <pre style={{ margin: 0 }}>{`import requests

url = "http://127.0.0.1:8000/api/v1/websites"
headers = {
    "Authorization": "Bearer ${isKeyMasked ? 'mdf_live_sec_••••••••••••' : apiKey}",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
print(response.json())`}</pre>
              )}
              {activeSnippetTab === 'nodejs' && (
                <pre style={{ margin: 0 }}>{`const fetch = require('node-fetch');

const res = await fetch('http://127.0.0.1:8000/api/v1/websites', {
  headers: {
    'Authorization': 'Bearer ${isKeyMasked ? 'mdf_live_sec_••••••••••••' : apiKey}',
    'Content-Type': 'application/json'
  }
});
const data = await res.json();
console.log(data);`}</pre>
              )}
              {activeSnippetTab === 'php' && (
                <pre style={{ margin: 0 }}>{`$ch = curl_init('http://127.0.0.1:8000/api/v1/websites');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ${isKeyMasked ? 'mdf_live_sec_••••••••••••' : apiKey}',
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);`}</pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: CHANGE EMAIL                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'email' && (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #D9E1DC',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 2px 12px rgba(11, 37, 34, 0.04)'
        }}>
          <div style={{ marginBottom: '22px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#10201E', margin: '0 0 6px 0' }}>
              Change Account Email Address
            </h2>
            <p style={{ fontSize: '13px', color: '#60716B', margin: 0 }}>
              A confirmation verification link will be sent to the new email address before changes take effect.
            </p>
          </div>

          <form onSubmit={changeEmail} style={{ maxWidth: '480px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '7px', textTransform: 'uppercase' }}>
                Current Email Address
              </label>
              <input
                type="email"
                disabled
                value={profile?.email || ''}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '9px',
                  border: '1px solid #E2E8F0',
                  background: '#F1F5F9',
                  fontSize: '13.5px',
                  color: '#64748B',
                  cursor: 'not-allowed',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '7px', textTransform: 'uppercase' }}>
                New Email Address
              </label>
              <input
                type="email"
                required
                placeholder="new.email@example.com"
                value={emailForm.new_email}
                onChange={e => setEmailForm({ ...emailForm, new_email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '9px',
                  border: '1px solid #D9E1DC',
                  background: '#FAFBF9',
                  fontSize: '13.5px',
                  color: '#10201E',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '7px', textTransform: 'uppercase' }}>
                Confirm Master Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={emailForm.password}
                onChange={e => setEmailForm({ ...emailForm, password: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '9px',
                  border: '1px solid #D9E1DC',
                  background: '#FAFBF9',
                  fontSize: '13.5px',
                  color: '#10201E',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={emailLoading}
              style={{
                padding: '10px 22px',
                borderRadius: '9px',
                background: '#0B2522',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13px',
                fontWeight: '700',
                cursor: emailLoading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              {emailLoading && <RotateCw size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              <span>Send Verification Email</span>
            </button>
          </form>
        </div>
      )}

    </div>
  )
}
