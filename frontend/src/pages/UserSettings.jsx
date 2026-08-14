import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/api'

export default function UserSettings() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirmPassword: '' })
  const [emailForm, setEmailForm] = useState({ new_email: '', password: '' })
  const [msg, setMsg] = useState('')
  const [errMsg, setErrMsg] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [planLoading, setPlanLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('monthly')
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaSetup, setMfaSetup] = useState(null)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)
  const [mfaDisableForm, setMfaDisableForm] = useState({ password: '', code: '' })
  const [showApiKey, setShowApiKey] = useState(false)
  const [copiedApiKey, setCopiedApiKey] = useState(false)
  const [pwStrength, setPwStrength] = useState({ score: 0, label: '', color: '#e2e8f0' })
  const [activeSection, setActiveSection] = useState(null)

  const fetchProfile = async () => {
    try {
      const data = await api.getProfile()
      setProfile(data.user || data)
      const mfaData = await api.getMFAStatus()
      setMfaEnabled(mfaData.mfa_enabled || false)
    } catch {
      navigate('/user/login')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProfile() }, [])

  const showMsg = (text) => { setMsg(text); setErrMsg(''); setTimeout(() => setMsg(''), 4000) }
  const showErr = (text) => { setErrMsg(text); setMsg(''); setTimeout(() => setErrMsg(''), 4000) }

  const calcPwStrength = (pw) => {
    let score = 0
    if (pw.length >= 12) score++
    if (pw.length >= 16) score++
    if (/[A-Z]/.test(pw)) score++
    if (/[a-z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    if (pw.length === 0) return { score: 0, label: '', color: '#e2e8f0' }
    if (score <= 2) return { score: 1, label: 'Weak', color: '#ef4444' }
    if (score <= 4) return { score: 2, label: 'Fair', color: '#f59e0b' }
    return { score: 3, label: 'Strong', color: '#10b981' }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    if (pwForm.new_password !== pwForm.confirmPassword) { showErr('Passwords do not match'); return }
    if (pwForm.new_password.length < 12) { showErr('Password must be at least 12 characters'); return }
    setPwLoading(true)
    try {
      await api.changePassword({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
        confirm_password: pwForm.confirmPassword,
      })
      setPwForm({ current_password: '', new_password: '', confirmPassword: '' })
      setPwStrength({ score: 0, label: '', color: '#e2e8f0' })
      showMsg('Password changed successfully! Please login again.')
      setTimeout(() => { api.logout(); navigate('/user/login') }, 2000)
    } catch (err) { showErr(err.message || 'Failed to change password') }
    finally { setPwLoading(false) }
  }

  const changeEmail = async (e) => {
    e.preventDefault()
    setEmailLoading(true)
    try {
      await api.changeEmail({ new_email: emailForm.new_email, password: emailForm.password })
      setEmailForm({ new_email: '', password: '' })
      showMsg('Email changed. Please verify your new email.')
    } catch (err) { showErr(err.message || 'Failed to change email') }
    finally { setEmailLoading(false) }
  }

  const handleEnableMFA = async () => {
    setMfaLoading(true)
    try {
      const data = await api.enableMFA()
      setMfaSetup(data)
    } catch (err) { showErr(err.message || 'Failed to initiate MFA setup') }
    finally { setMfaLoading(false) }
  }

  const handleVerifyMFA = async () => {
    if (mfaCode.length !== 6) { showErr('Enter 6-digit code'); return }
    setMfaLoading(true)
    try {
      await api.verifyMFASetup(mfaCode)
      setMfaEnabled(true)
      setMfaSetup(null)
      setMfaCode('')
      showMsg('MFA enabled successfully!')
    } catch (err) { showErr(err.message || 'Invalid code') }
    finally { setMfaLoading(false) }
  }

  const handleDisableMFA = async () => {
    if (!mfaDisableForm.password || !mfaDisableForm.code) { showErr('Password and code required'); return }
    setMfaLoading(true)
    try {
      await api.disableMFA(mfaDisableForm.password, mfaDisableForm.code)
      setMfaEnabled(false)
      setMfaDisableForm({ password: '', code: '' })
      showMsg('MFA disabled.')
    } catch (err) { showErr(err.message || 'Failed to disable MFA') }
    finally { setMfaLoading(false) }
  }

  const handleUpgrade = async () => {
    if (!confirm(`Upgrade to Premium?`)) return
    setPlanLoading(true)
    try {
      const days = selectedPlan === 'yearly' ? 365 : 30
      await api.upgradePlan(days)
      showMsg('Upgraded to Premium!')
      fetchProfile()
    } catch (err) { showErr(err.message || 'Upgrade failed') }
    finally { setPlanLoading(false) }
  }

  const handleDowngrade = async () => {
    if (!confirm('Downgrade to Free plan?')) return
    setPlanLoading(true)
    try {
      await api.downgradePlan()
      showMsg('Downgraded to Free plan.')
      fetchProfile()
    } catch (err) { showErr(err.message || 'Downgrade failed') }
    finally { setPlanLoading(false) }
  }

  const copyApiKey = async () => {
    if (!profile?.api_key) return
    try {
      await navigator.clipboard.writeText(profile.api_key)
      setCopiedApiKey(true)
      setTimeout(() => setCopiedApiKey(false), 2000)
    } catch {}
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', color: '#94a3b8' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px' }}></i>
    </div>
  )

  const isPremium = profile?.plan === 'premium'
  const userInitial = (profile?.full_name || profile?.email || '?')[0].toUpperCase()

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {msg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', marginBottom: '20px', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', flexShrink: 0 }}>
            <i className="fas fa-check"></i>
          </div>
          <span style={{ color: '#065f46', fontSize: '14px', fontWeight: 500 }}>{msg}</span>
        </div>
      )}
      {errMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', marginBottom: '20px', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', flexShrink: 0 }}>
            <i className="fas fa-exclamation"></i>
          </div>
          <span style={{ color: '#991b1b', fontSize: '14px', fontWeight: 500 }}>{errMsg}</span>
        </div>
      )}

      {/* Profile Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '24px',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)', borderRadius: '50%', transform: 'translate(40%, -40%)' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', fontWeight: '700', color: '#fff',
            boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
            flexShrink: 0,
          }}>
            {userInitial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>{profile?.full_name || 'User'}</h1>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                background: isPremium ? 'rgba(168,85,247,0.2)' : 'rgba(100,116,139,0.2)',
                color: isPremium ? '#c084fc' : '#94a3b8',
                border: `1px solid ${isPremium ? 'rgba(168,85,247,0.3)' : 'rgba(100,116,139,0.2)'}`,
              }}>
                <i className={`fas ${isPremium ? 'fa-crown' : 'fa-user'}`}></i>
                {isPremium ? 'Premium' : 'Free'}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fas fa-envelope" style={{ fontSize: '11px' }}></i>
              {profile?.email}
              {profile?.email_verified && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#10b981', fontSize: '11px', fontWeight: 600, marginLeft: '4px' }}>
                  <i className="fas fa-check-circle"></i> Verified
                </span>
              )}
            </div>
          </div>
          <Link to="/user/dashboard" style={{
            padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
            background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)',
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px',
            transition: 'all 0.2s', flexShrink: 0,
          }}>
            <i className="fas fa-arrow-left"></i> Dashboard
          </Link>
        </div>
      </div>

      {/* Section Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { id: 'account', icon: 'fa-user-circle', label: 'Account', color: '#2563eb' },
          { id: 'security', icon: 'fa-shield-halved', label: 'Security', color: '#10b981' },
          { id: 'billing', icon: 'fa-crown', label: 'Billing', color: '#f59e0b' },
          { id: 'api', icon: 'fa-key', label: 'API Key', color: '#8b5cf6' },
        ].map(s => (
          <button key={s.id} onClick={() => setActiveSection(activeSection === s.id ? null : s.id)} style={{
            padding: '10px 18px', borderRadius: '10px', border: `1px solid ${activeSection === s.id ? s.color : '#e2e8f0'}`,
            background: activeSection === s.id ? `${s.color}10` : '#fff',
            color: activeSection === s.id ? s.color : '#64748b',
            fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: '7px', transition: 'all 0.2s',
          }}>
            <i className={`fas ${s.icon}`}></i> {s.label}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: (activeSection === null || activeSection === 'billing' || activeSection === 'api') ? '1fr' : '1fr 1fr', gap: '20px' }}>
        {(activeSection === null || activeSection === 'account') && (
          <>
            {/* Profile Info */}
            <div style={{
              background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden',
            }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontSize: '16px' }}>
                  <i className="fas fa-user-circle"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Profile Information</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Your account details</p>
                </div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                {[
                  { label: 'Full Name', value: profile?.full_name || '—', icon: 'fa-id-card' },
                  { label: 'Username', value: profile?.username || '—', icon: 'fa-at' },
                  { label: 'Email', value: profile?.email || '—', icon: 'fa-envelope' },
                  { label: 'Member Since', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—', icon: 'fa-calendar' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < 3 ? '1px solid #f8fafc' : 'none' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px' }}>
                      <i className={`fas ${item.icon}`} style={{ fontSize: '12px', width: '16px', textAlign: 'center', color: '#94a3b8' }}></i>
                      {item.label}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{item.value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px' }}>
                    <i className="fas fa-shield-check" style={{ fontSize: '12px', width: '16px', textAlign: 'center', color: '#94a3b8' }}></i>
                    Email Verified
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px',
                    borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                    background: profile?.email_verified ? '#ecfdf5' : '#fef2f2',
                    color: profile?.email_verified ? '#059669' : '#dc2626',
                    border: `1px solid ${profile?.email_verified ? '#a7f3d0' : '#fecaca'}`,
                  }}>
                    <i className={`fas ${profile?.email_verified ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                    {profile?.email_verified ? 'Verified' : 'Not Verified'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px' }}>
                    <i className="fas fa-lock" style={{ fontSize: '12px', width: '16px', textAlign: 'center', color: '#94a3b8' }}></i>
                    Two-Factor Auth
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px',
                    borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                    background: mfaEnabled ? '#ecfdf5' : '#fef2f2',
                    color: mfaEnabled ? '#059669' : '#dc2626',
                    border: `1px solid ${mfaEnabled ? '#a7f3d0' : '#fecaca'}`,
                  }}>
                    <i className={`fas ${mfaEnabled ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                    {mfaEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <Link to="/user/sessions" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  marginTop: '16px', padding: '10px 16px', borderRadius: '10px',
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  color: '#475569', fontSize: '13px', fontWeight: '500', textDecoration: 'none',
                  transition: 'all 0.2s',
                }}>
                  <i className="fas fa-desktop"></i> View Active Sessions
                </Link>
              </div>
            </div>

            {/* Change Email */}
            <div style={{
              background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden',
            }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06b6d4', fontSize: '16px' }}>
                  <i className="fas fa-envelope"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Change Email</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Update your email address</p>
                </div>
              </div>
              <form onSubmit={changeEmail} style={{ padding: '20px 24px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>New Email Address</label>
                  <input
                    type="email" required
                    placeholder="new@email.com"
                    value={emailForm.new_email}
                    onChange={e => setEmailForm({ ...emailForm, new_email: e.target.value })}
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', transition: 'border-color 0.2s', boxSizing: 'border-box', outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = '#06b6d4'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>Current Password</label>
                  <input
                    type="password" required
                    placeholder="Enter current password"
                    value={emailForm.password}
                    onChange={e => setEmailForm({ ...emailForm, password: e.target.value })}
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', transition: 'border-color 0.2s', boxSizing: 'border-box', outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = '#06b6d4'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
                <button type="submit" disabled={emailLoading} style={{
                  width: '100%', padding: '12px 20px', border: 'none', borderRadius: '10px',
                  background: '#06b6d4', color: '#fff', fontSize: '14px', fontWeight: '600',
                  cursor: emailLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  opacity: emailLoading ? 0.7 : 1, transition: 'all 0.2s',
                }}>
                  {emailLoading ? <><i className="fas fa-spinner fa-spin"></i> Updating...</> : <><i className="fas fa-check"></i> Update Email</>}
                </button>
              </form>
            </div>
          </>
        )}

        {(activeSection === null || activeSection === 'security') && (
          <>
            {/* Change Password */}
            <div style={{
              background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden',
            }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', fontSize: '16px' }}>
                  <i className="fas fa-lock"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Change Password</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Keep your account secure</p>
                </div>
              </div>
              <form onSubmit={changePassword} style={{ padding: '20px 24px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>Current Password</label>
                  <input
                    type="password" required
                    placeholder="Enter current password"
                    value={pwForm.current_password}
                    onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })}
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', transition: 'border-color 0.2s', boxSizing: 'border-box', outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = '#f59e0b'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>New Password</label>
                  <input
                    type="password" required minLength="12"
                    placeholder="Min 12 characters"
                    value={pwForm.new_password}
                    onChange={e => {
                      setPwForm({ ...pwForm, new_password: e.target.value })
                      setPwStrength(calcPwStrength(e.target.value))
                    }}
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', transition: 'border-color 0.2s', boxSizing: 'border-box', outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = '#f59e0b'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                  {pwStrength.label && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                        {[1, 2, 3].map(i => (
                          <div key={i} style={{ height: '3px', flex: 1, borderRadius: '2px', background: i <= pwStrength.score ? pwStrength.color : '#e2e8f0', transition: 'all 0.3s' }}></div>
                        ))}
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: pwStrength.color }}>{pwStrength.label}</span>
                    </div>
                  )}
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>Confirm New Password</label>
                  <input
                    type="password" required
                    placeholder="Repeat new password"
                    value={pwForm.confirmPassword}
                    onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', transition: 'border-color 0.2s', boxSizing: 'border-box', outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = '#f59e0b'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
                <button type="submit" disabled={pwLoading} style={{
                  width: '100%', padding: '12px 20px', border: 'none', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', fontSize: '14px', fontWeight: '600',
                  cursor: pwLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  opacity: pwLoading ? 0.7 : 1, transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(245,158,11,0.25)',
                }}>
                  {pwLoading ? <><i className="fas fa-spinner fa-spin"></i> Changing...</> : <><i className="fas fa-shield-halved"></i> Change Password</>}
                </button>
              </form>
            </div>

            {/* MFA / 2FA */}
            <div style={{
              background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden',
            }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6', fontSize: '16px' }}>
                  <i className="fas fa-shield-halved"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Two-Factor Authentication</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Extra security layer</p>
                </div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                {mfaSetup ? (
                  <div>
                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                      <p style={{ fontSize: '13px', color: '#475569', marginBottom: '12px', fontWeight: 500 }}>Scan this QR code with your authenticator app:</p>
                      {mfaSetup.qr_code && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                          <img src={mfaSetup.qr_code} alt="QR Code" style={{ width: '180px', height: '180px', borderRadius: '12px', border: '2px solid #e2e8f0' }} />
                        </div>
                      )}
                      <div style={{ padding: '10px 12px', background: '#fff', borderRadius: '8px', fontSize: '12px', color: '#64748b', wordBreak: 'break-all', border: '1px dashed #d1d5db', fontFamily: "'Fira Code', Consolas, monospace" }}>
                        <span style={{ fontWeight: 600 }}>Secret:</span> {mfaSetup.secret}
                      </div>
                      {mfaSetup.backup_codes && (
                        <div style={{ marginTop: '12px', padding: '12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                          <p style={{ fontSize: '11px', color: '#dc2626', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <i className="fas fa-exclamation-triangle" style={{ marginRight: '4px' }}></i> Save these backup codes
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                            {mfaSetup.backup_codes.map((c, i) => (
                              <div key={i} style={{ fontSize: '12px', fontFamily: "'Fira Code', Consolas, monospace", color: '#475569', padding: '4px 8px', background: '#fff', borderRadius: '4px' }}>{c}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <input
                      type="text" placeholder="Enter 6-digit code"
                      value={mfaCode}
                      onChange={e => setMfaCode(e.target.value)}
                      maxLength={6}
                      style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '16px', letterSpacing: '6px', textAlign: 'center', marginBottom: '12px', fontWeight: '600', fontFamily: "'Fira Code', Consolas, monospace", outline: 'none', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={handleVerifyMFA} disabled={mfaLoading} style={{
                        flex: 1, padding: '11px 16px', border: 'none', borderRadius: '10px',
                        background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', color: '#fff',
                        fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      }}>
                        <i className="fas fa-check"></i> Verify & Enable
                      </button>
                      <button onClick={() => { setMfaSetup(null); setMfaCode('') }} style={{
                        padding: '11px 16px', background: '#f8fafc', border: '1px solid #e2e8f0',
                        borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
                        color: '#64748b', fontFamily: 'inherit',
                      }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : mfaEnabled ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', background: '#ecfdf5', borderRadius: '10px', border: '1px solid #a7f3d0', marginBottom: '20px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px' }}>
                        <i className="fas fa-check"></i>
                      </div>
                      <div>
                        <span style={{ color: '#065f46', fontSize: '13px', fontWeight: '600' }}>Two-Factor Authentication is Enabled</span>
                        <p style={{ color: '#6b7280', fontSize: '12px', margin: '2px 0 0' }}>Your account has an extra layer of protection</p>
                      </div>
                    </div>
                    <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
                      <p style={{ fontSize: '12px', color: '#991b1b', fontWeight: '600', marginBottom: '10px' }}>
                        <i className="fas fa-exclamation-triangle" style={{ marginRight: '4px' }}></i> Disable Two-Factor Authentication
                      </p>
                      <input
                        type="password" placeholder="Current password"
                        value={mfaDisableForm.password}
                        onChange={e => setMfaDisableForm({ ...mfaDisableForm, password: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', marginBottom: '8px', boxSizing: 'border-box', outline: 'none' }}
                      />
                      <input
                        type="text" placeholder="6-digit code"
                        value={mfaDisableForm.code}
                        onChange={e => setMfaDisableForm({ ...mfaDisableForm, code: e.target.value })}
                        maxLength={6}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', marginBottom: '12px', letterSpacing: '4px', textAlign: 'center', fontFamily: "'Fira Code', Consolas, monospace", boxSizing: 'border-box', outline: 'none' }}
                      />
                      <button onClick={handleDisableMFA} disabled={mfaLoading} style={{
                        width: '100%', padding: '10px 16px', background: '#ef4444', color: '#fff',
                        border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                        {mfaLoading ? 'Processing...' : 'Disable 2FA'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: '1.6' }}>
                      Add an extra layer of security using an authenticator app like Google Authenticator, Authy, or 1Password.
                    </p>
                    <button onClick={handleEnableMFA} disabled={mfaLoading} style={{
                      width: '100%', padding: '14px 20px',
                      background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                      color: '#fff', border: 'none', borderRadius: '10px',
                      fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      boxShadow: '0 2px 8px rgba(139,92,246,0.25)',
                    }}>
                      <i className="fas fa-shield-halved"></i>
                      {mfaLoading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {(activeSection === null || activeSection === 'billing') && (
          /* Plan Details */
          <div style={{
            background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden', gridColumn: activeSection === 'billing' ? '1 / -1' : undefined,
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', fontSize: '16px' }}>
                <i className="fas fa-crown"></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Subscription Plan</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Manage your subscription</p>
              </div>
            </div>
            <div style={{ padding: '24px' }}>
              {isPremium ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                      <div style={{
                        width: '56px', height: '56px', borderRadius: '14px',
                        background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '24px', color: '#fff',
                        boxShadow: '0 4px 14px rgba(139,92,246,0.3)',
                      }}>
                        <i className="fas fa-crown"></i>
                      </div>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>Premium Plan</div>
                        <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <i className="fas fa-circle" style={{ fontSize: '6px' }}></i> Active
                        </div>
                      </div>
                    </div>
                    {profile?.plan_expires && (
                      <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 70px' }}>
                        Expires: {new Date(profile.plan_expires).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <button onClick={handleDowngrade} disabled={planLoading} style={{
                    padding: '10px 20px', background: '#fef2f2', color: '#dc2626',
                    border: '1px solid #fecaca', borderRadius: '10px', fontSize: '13px',
                    fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <i className="fas fa-arrow-down"></i> Downgrade to Free
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                    {[
                      { id: 'monthly', label: 'Monthly', price: '$9', sub: '/month', desc: 'Billed monthly' },
                      { id: 'yearly', label: 'Yearly', price: '$60', sub: '/year', desc: 'Save 44%' },
                    ].map(p => (
                      <div key={p.id} onClick={() => setSelectedPlan(p.id)} style={{
                        padding: '20px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
                        border: `2px solid ${selectedPlan === p.id ? '#2563eb' : '#e2e8f0'}`,
                        background: selectedPlan === p.id ? '#eff6ff' : '#fff',
                        transition: 'all 0.2s',
                      }}>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 500 }}>{p.label}</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '2px' }}>
                          <span style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>{p.price}</span>
                          <span style={{ fontSize: '13px', color: '#94a3b8' }}>{p.sub}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{p.desc}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={handleUpgrade} disabled={planLoading} style={{
                    width: '100%', padding: '14px 24px',
                    background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                    color: '#fff', border: 'none', borderRadius: '12px',
                    fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}>
                    {planLoading ? <><i className="fas fa-spinner fa-spin"></i> Processing...</> : <><i className="fas fa-crown"></i> Upgrade to Premium</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {(activeSection === null || activeSection === 'api') && (
          /* API Key */
          <div style={{
            background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden', gridColumn: activeSection === 'api' ? '1 / -1' : undefined,
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6', fontSize: '16px' }}>
                <i className="fas fa-key"></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>API Key</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Used to authenticate your websites</p>
              </div>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px', lineHeight: '1.5' }}>
                Use this key to connect your websites to MDefender's protection network. Keep it secret and never share it publicly.
              </p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <div style={{
                  flex: 1, padding: '14px 16px', background: '#f8fafc', border: '1.5px solid #e2e8f0',
                  borderRadius: '10px', fontSize: '14px', fontFamily: "'Fira Code', Consolas, monospace",
                  color: '#2563eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center',
                }}>
                  {showApiKey ? (profile?.api_key || 'No key generated') : (profile?.api_key ? '•'.repeat(36) : 'No key generated')}
                </div>
                <button onClick={() => setShowApiKey(!showApiKey)} style={{
                  width: '44px', height: '44px', borderRadius: '10px', border: '1.5px solid #e2e8f0',
                  background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#64748b', fontSize: '14px', flexShrink: 0, transition: 'all 0.2s',
                }}>
                  <i className={`fas ${showApiKey ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
                <button onClick={copyApiKey} style={{
                  width: '44px', height: '44px', borderRadius: '10px', border: '1.5px solid #e2e8f0',
                  background: copiedApiKey ? '#ecfdf5' : '#fff',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: copiedApiKey ? '#10b981' : '#64748b', fontSize: '14px', flexShrink: 0,
                  transition: 'all 0.2s', borderColor: copiedApiKey ? '#a7f3d0' : '#e2e8f0',
                }}>
                  <i className={`fas ${copiedApiKey ? 'fa-check' : 'fa-copy'}`}></i>
                </button>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={async () => {
                  if (!confirm('Regenerate API key? Your old key will stop working immediately.')) return
                  try { await api.regenerateApiKey(); fetchProfile(); showMsg('API key regenerated.') } catch (err) { showErr(err.message) }
                }} style={{
                  padding: '10px 18px', background: '#fffbeb', color: '#d97706',
                  border: '1px solid #fde68a', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                  cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px',
                  transition: 'all 0.2s',
                }}>
                  <i className="fas fa-arrow-rotate-right"></i> Regenerate
                </button>
                <Link to="/user/connect" style={{
                  padding: '10px 18px', background: '#eff6ff', color: '#2563eb',
                  border: '1px solid #bfdbfe', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                  textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px',
                  transition: 'all 0.2s',
                }}>
                  <i className="fas fa-link"></i> Setup Guide
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
