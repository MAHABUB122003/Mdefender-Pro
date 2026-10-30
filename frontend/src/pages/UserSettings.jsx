import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  User,
  Mail,
  KeyRound,
  ShieldCheck,
  Lock,
  Smartphone,
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
  Shield
} from 'lucide-react'
import api from '../api/api'
import userStore from '../utils/userStore'
import copyToClipboard from '../utils/clipboard'

export default function UserSettings() {
  const navigate = useNavigate()
  const cachedUser = userStore.get('profile') || userStore.get('dashboard')?.user || null
  const [profile, setProfile] = useState(() => cachedUser)
  const [loading, setLoading] = useState(() => !cachedUser)
  const [activeTab, setActiveTab] = useState('profile') // 'profile' | 'security' | 'mfa' | 'email' | 'api'

  // Forms
  const [nameForm, setNameForm] = useState({ name: cachedUser?.full_name || cachedUser?.name || '' })
  const [nameLoading, setNameLoading] = useState(false)
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirmPassword: '' })
  const [pwLoading, setPwLoading] = useState(false)
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
  const [pwStrength, setPwStrength] = useState({ score: 0, label: '', color: '#E2E8F0' })

  // API Key
  const [apiKey, setApiKey] = useState(cachedUser?.api_key || 'mdf_live_sec_key_sample')
  const [isKeyMasked, setIsKeyMasked] = useState(true)
  const [copiedKey, setCopiedKey] = useState(false)
  const [regeneratingKey, setRegeneratingKey] = useState(false)

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

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const calcPwStrength = (pw) => {
    let score = 0
    if (pw.length >= 10) score++
    if (pw.length >= 14) score++
    if (/[A-Z]/.test(pw)) score++
    if (/[a-z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    if (pw.length === 0) return { score: 0, label: '', color: '#E2E8F0' }
    if (score <= 2) return { score: 1, label: 'Weak', color: '#EF4444' }
    if (score <= 4) return { score: 2, label: 'Moderate', color: '#F59E0B' }
    return { score: 3, label: 'Strong (Enterprise Grade)', color: '#10B981' }
  }

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

  const changePassword = async (e) => {
    e.preventDefault()
    if (pwForm.new_password !== pwForm.confirmPassword) {
      showErr('Passwords do not match')
      return
    }
    if (pwForm.new_password.length < 8) {
      showErr('New password must be at least 8 characters')
      return
    }
    setPwLoading(true)
    try {
      await api.changePassword({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
        confirm_password: pwForm.confirmPassword,
      })
      setPwForm({ current_password: '', new_password: '', confirmPassword: '' })
      setPwStrength({ score: 0, label: '', color: '#E2E8F0' })
      showMsg('Password changed successfully!')
    } catch (err) {
      showErr(err.message || 'Failed to change password. Please verify current password.')
    } finally {
      setPwLoading(false)
    }
  }

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
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#60716B' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: '600' }}>
          <RotateCw size={20} style={{ animation: 'spin 1s linear infinite', color: '#E8792F' }} />
          <span>Loading Account &amp; Security Settings...</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '24px 20px', color: '#10201E' }}>
      
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
          fontSize: '13.5px',
          fontWeight: '600',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
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
          fontSize: '13.5px',
          fontWeight: '600',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <AlertCircle size={18} color="#DC2626" />
          <span>{errMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. CLEAN ACCOUNT IDENTITY BANNER (MATCHES LIGHT THEME)                     */}
      {/* ========================================================================= */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #D9E1DC',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {/* Avatar Initial */}
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '14px',
            background: '#FEF3EB',
            border: '1px solid #FCD8BF',
            color: '#D97735',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: '900',
            flexShrink: 0
          }}>
            {userInitial}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#10201E', margin: 0 }}>
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '13px', color: '#60716B' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Mail size={13} color="#87948D" />
                <span>{profile?.email || '—'}</span>
                {profile?.email_verified && (
                  <span style={{ color: '#059669', fontWeight: '700', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                    <CheckCircle2 size={11} /> Verified
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ShieldCheck size={13} color={mfaEnabled ? '#059669' : '#F59E0B'} />
                <span>2FA: <strong>{mfaEnabled ? 'Protected' : 'Disabled'}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Link
            to="/user/pricing"
            style={{
              padding: '9px 16px',
              borderRadius: '8px',
              background: '#FEF3EB',
              color: '#D97735',
              border: '1px solid #FCD8BF',
              fontSize: '13px',
              fontWeight: '700',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Tag size={14} />
            <span>Manage Plan</span>
          </Link>

          <Link
            to="/user/sessions"
            style={{
              padding: '9px 16px',
              borderRadius: '8px',
              background: '#FAFBF9',
              color: '#334155',
              border: '1px solid #D9E1DC',
              fontSize: '13px',
              fontWeight: '700',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Smartphone size={14} />
            <span>Active Sessions</span>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TABBED SETTINGS SWITCHER                                               */}
      {/* ========================================================================= */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        borderBottom: '1px solid #E2E8F0',
        paddingBottom: '12px'
      }}>
        {[
          { id: 'profile', icon: User, label: 'Account Profile' },
          { id: 'security', icon: Lock, label: 'Password & Security' },
          { id: 'mfa', icon: ShieldCheck, label: 'Two-Factor Auth (2FA)' },
          { id: 'email', icon: Mail, label: 'Change Email' },
          { id: 'api', icon: Terminal, label: 'Master API Key' },
        ].map(t => {
          const Icon = t.icon
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: isActive ? '1px solid #10201E' : '1px solid transparent',
                background: isActive ? '#10201E' : 'transparent',
                color: isActive ? '#FFFFFF' : '#64748B',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={15} />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ACCOUNT PROFILE                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Edit Display Name */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #D9E1DC',
            borderRadius: '14px',
            padding: '22px 24px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '800', color: '#10201E' }}>
              Personal Details
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#60716B' }}>
              Update your account name and identity details.
            </p>

            <form onSubmit={handleUpdateName}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Display Name
                </label>
                <input
                  type="text"
                  value={nameForm.name}
                  onChange={e => setNameForm({ name: e.target.value })}
                  placeholder="Enter full name"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #D9E1DC',
                    background: '#FAFBF9',
                    fontSize: '13.5px',
                    color: '#10201E',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Registered Email Address
                </label>
                <input
                  type="text"
                  disabled
                  value={profile?.email || ''}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    background: '#F1F5F9',
                    fontSize: '13.5px',
                    color: '#60716B',
                    boxSizing: 'border-box',
                    cursor: 'not-allowed'
                  }}
                />
                <span style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
                  To change your email address, navigate to the &quot;Change Email&quot; tab.
                </span>
              </div>

              <button
                type="submit"
                disabled={nameLoading}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  background: '#0B2522', border: '1px solid #0B2522',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: nameLoading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {nameLoading ? <RotateCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
                <span>Save Changes</span>
              </button>
            </form>
          </div>

          {/* Account Overview Metadata */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #D9E1DC',
            borderRadius: '14px',
            padding: '22px 24px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '800', color: '#10201E' }}>
              Account Metadata
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#60716B' }}>
              Overview of your MDefender credentials and active tier.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: '13px', color: '#60716B' }}>Account Tier:</span>
                <strong style={{ fontSize: '13px', color: '#10201E' }}>{planName}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: '13px', color: '#60716B' }}>Username:</span>
                <strong style={{ fontSize: '13px', color: '#10201E' }}>{profile?.username || '—'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: '13px', color: '#60716B' }}>Member Since:</span>
                <span style={{ fontSize: '13px', color: '#10201E', fontWeight: '600' }}>
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recently'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                <span style={{ fontSize: '13px', color: '#60716B' }}>Account Status:</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '3px 8px',
                  borderRadius: '9999px',
                  background: '#ECFDF5',
                  color: '#059669',
                  border: '1px solid #A7F3D0'
                }}>
                  ACTIVE &bull; GOOD STANDING
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PASSWORD & SECURITY                                                */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div style={{ maxWidth: '640px' }}>
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #D9E1DC',
            borderRadius: '14px',
            padding: '22px 24px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '800', color: '#10201E' }}>
              Change Account Password
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#60716B' }}>
              Ensure your account uses a strong, unique password to prevent unauthorized access.
            </p>

            <form onSubmit={changePassword}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  value={pwForm.current_password}
                  onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #D9E1DC',
                    background: '#FAFBF9',
                    fontSize: '13.5px',
                    color: '#10201E',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 8 characters"
                  value={pwForm.new_password}
                  onChange={e => {
                    setPwForm({ ...pwForm, new_password: e.target.value })
                    setPwStrength(calcPwStrength(e.target.value))
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #D9E1DC',
                    background: '#FAFBF9',
                    fontSize: '13.5px',
                    color: '#10201E',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                {pwStrength.label && (
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '3px' }}>
                      {[1, 2, 3].map(i => (
                        <div key={i} style={{ height: '3px', flex: 1, borderRadius: '2px', background: i <= pwStrength.score ? pwStrength.color : '#E2E8F0', transition: 'all 0.2s' }} />
                      ))}
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: pwStrength.color }}>
                      {pwStrength.label}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Repeat new password"
                  value={pwForm.confirmPassword}
                  onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #D9E1DC',
                    background: '#FAFBF9',
                    fontSize: '13.5px',
                    color: '#10201E',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={pwLoading}
                style={{
                  padding: '10px 22px',
                  borderRadius: '8px',
                  background: '#0B2522', border: '1px solid #0B2522',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: pwLoading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {pwLoading ? <RotateCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Lock size={14} />}
                <span>Update Password</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TWO-FACTOR AUTH (2FA / MFA)                                        */}
      {/* ========================================================================= */}
      {activeTab === 'mfa' && (
        <div style={{ maxWidth: '640px' }}>
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #D9E1DC',
            borderRadius: '14px',
            padding: '22px 24px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#10201E' }}>
                  Two-Factor Authentication (TOTP)
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#60716B' }}>
                  Protect your account with Google Authenticator, Authy, or 1Password.
                </p>
              </div>

              <span style={{
                fontSize: '11px',
                fontWeight: '800',
                padding: '4px 10px',
                borderRadius: '9999px',
                background: mfaEnabled ? '#ECFDF5' : '#FFFBEB',
                color: mfaEnabled ? '#059669' : '#D97706',
                border: `1px solid ${mfaEnabled ? '#A7F3D0' : '#FDE68A'}`
              }}>
                {mfaEnabled ? '2FA ACTIVE' : '2FA DISABLED'}
              </span>
            </div>

            {!mfaEnabled && !mfaSetup && (
              <div>
                <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, margin: '0 0 16px' }}>
                  Enabling Two-Factor Authentication requires a 6-digit verification code from your authenticator app whenever you sign in to MDefender Pro.
                </p>
                <button
                  type="button"
                  onClick={handleEnableMFA}
                  disabled={mfaLoading}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    background: '#0B2522',
                    color: '#FFFFFF',
                    border: '1px solid #0B2522',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: mfaLoading ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {mfaLoading ? <RotateCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldCheck size={14} />}
                  <span>Begin 2FA Configuration</span>
                </button>
              </div>
            )}

            {mfaSetup && (
              <div style={{ background: '#FAFBF9', border: '1px solid #D9E1DC', borderRadius: '10px', padding: '18px', marginTop: '14px' }}>
                <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#10201E', fontWeight: '700' }}>
                  1. Scan this QR Code with your Authenticator app:
                </p>

                {mfaSetup.qr_code && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
                    <img
                      src={mfaSetup.qr_code}
                      alt="TOTP QR Code"
                      style={{ width: '160px', height: '160px', borderRadius: '10px', border: '1px solid #CBD5E1', background: '#FFFFFF', padding: '8px' }}
                    />
                  </div>
                )}

                <div style={{
                  padding: '10px 14px',
                  background: '#FFFFFF',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#475569',
                  border: '1px dashed #CBD5E1',
                  marginBottom: '14px',
                  fontFamily: 'monospace'
                }}>
                  <strong>Secret Key:</strong> {mfaSetup.secret}
                </div>

                <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#10201E', fontWeight: '700' }}>
                  2. Enter the 6-digit code from your app:
                </p>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={mfaCode}
                    onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    style={{
                      width: '160px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #D9E1DC',
                      background: '#FFFFFF',
                      fontSize: '18px',
                      fontWeight: '800',
                      letterSpacing: '4px',
                      textAlign: 'center',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyMFA}
                    disabled={mfaLoading}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      background: '#059669',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: mfaLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Verify &amp; Activate
                  </button>
                </div>
              </div>
            )}

            {mfaEnabled && (
              <div style={{ marginTop: '14px' }}>
                <p style={{ fontSize: '13px', color: '#059669', fontWeight: '700', margin: '0 0 12px' }}>
                  ✓ Your account is actively protected with Two-Factor Authentication.
                </p>
                <div style={{ background: '#FAFBF9', border: '1px solid #D9E1DC', borderRadius: '10px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '13.5px', fontWeight: '800', color: '#10201E' }}>
                    Disable 2FA Protection
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <input
                      type="password"
                      placeholder="Account Password"
                      value={mfaDisableForm.password}
                      onChange={e => setMfaDisableForm({ ...mfaDisableForm, password: e.target.value })}
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #D9E1DC', fontSize: '13px', outline: 'none' }}
                    />
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="6-digit Authenticator Code"
                      value={mfaDisableForm.code}
                      onChange={e => setMfaDisableForm({ ...mfaDisableForm, code: e.target.value.replace(/\D/g, '') })}
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #D9E1DC', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleDisableMFA}
                    disabled={mfaLoading}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      background: '#FFFFFF',
                      color: '#10201E',
                      border: '1px solid #D9E1DC',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Disable 2FA
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CHANGE EMAIL ADDRESS                                               */}
      {/* ========================================================================= */}
      {activeTab === 'email' && (
        <div style={{ maxWidth: '640px' }}>
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #D9E1DC',
            borderRadius: '14px',
            padding: '22px 24px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '800', color: '#10201E' }}>
              Update Registered Email
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#60716B' }}>
              We will send a confirmation link to your new email address to complete verification.
            </p>

            <form onSubmit={changeEmail}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                  New Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="new@example.com"
                  value={emailForm.new_email}
                  onChange={e => setEmailForm({ ...emailForm, new_email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #D9E1DC',
                    background: '#FAFBF9',
                    fontSize: '13.5px',
                    color: '#10201E',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Current Account Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password to authorize"
                  value={emailForm.password}
                  onChange={e => setEmailForm({ ...emailForm, password: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #D9E1DC',
                    background: '#FAFBF9',
                    fontSize: '13.5px',
                    color: '#10201E',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={emailLoading}
                style={{
                  padding: '10px 22px',
                  borderRadius: '8px',
                  background: '#0B2522', border: '1px solid #0B2522',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: emailLoading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {emailLoading ? <RotateCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={14} />}
                <span>Send Verification to New Email</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: MASTER API KEY                                                     */}
      {/* ========================================================================= */}
      {activeTab === 'api' && (
        <div style={{ maxWidth: '780px' }}>
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #D9E1DC',
            borderRadius: '14px',
            padding: '22px 24px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '800', color: '#10201E' }}>
              Master Account API Key
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#60716B' }}>
              Used for programmatic management, custom CI/CD pipelines, and high-throughput microservice protection.
            </p>

            <div style={{
              background: '#FAFBF9',
              border: '1px solid #D9E1DC',
              borderRadius: '10px',
              padding: '16px 18px',
              marginBottom: '18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', color: '#60716B', letterSpacing: '0.4px' }}>
                  Secret Key
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsKeyMasked(!isKeyMasked)}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      cursor: 'pointer',
                      fontSize: '11.5px',
                      fontWeight: '600',
                      color: '#475569',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isKeyMasked ? <Eye size={12} /> : <EyeOff size={12} />}
                    <span>{isKeyMasked ? 'Reveal' : 'Mask'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyApiKey}
                    style={{
                      background: '#0B2522', border: '1px solid #0B2522',
                      border: 'none',
                      color: '#FFFFFF',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '700',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    {copiedKey ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                    <span>{copiedKey ? 'Copied Key!' : 'Copy Key'}</span>
                  </button>
                </div>
              </div>

              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '10px 14px',
                fontFamily: "'JetBrains Mono', Menlo, Consolas, monospace",
                fontSize: '13px',
                fontWeight: '700',
                color: '#10201E',
                overflowX: 'auto',
                whiteSpace: 'nowrap'
              }}>
                {isKeyMasked ? (apiKey.startsWith('mdf_live_sec_') ? `mdf_live_sec_••••••••••••${apiKey.slice(-4)}` : `${apiKey.slice(0, 8)}••••••••••••${apiKey.slice(-4)}`) : apiKey}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <span style={{ fontSize: '12.5px', color: '#60716B' }}>
                Need to invalidate your existing key? Regenerating creates a new live token immediately.
              </span>

              <button
                type="button"
                onClick={handleRegenerateKey}
                disabled={regeneratingKey}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: regeneratingKey ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RotateCw size={13} style={{ animation: regeneratingKey ? 'spin 1s linear infinite' : 'none' }} />
                <span>{regeneratingKey ? 'Regenerating...' : 'Regenerate API Key'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
