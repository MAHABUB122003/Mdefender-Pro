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

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: '24px' }}></i></div>

  const isPremium = profile?.plan === 'premium'

  return (
    <div className="space-y-6">
      {msg && <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 500 }}><i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>{msg}</div>}
      {errMsg && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 500 }}><i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>{errMsg}</div>}

      <div className="settings-grid">
        {/* Profile Info */}
        <div className="settings-card">
          <h3><i className="fas fa-user-circle" style={{ color: '#2563eb', marginRight: '8px' }}></i> Profile Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
            {[
              { label: 'Name', value: profile?.full_name || '—' },
              { label: 'Username', value: profile?.username || '—' },
              { label: 'Email', value: profile?.email || '—' },
              { label: 'Email Verified', value: profile?.email_verified ? '✅ Yes' : '❌ No' },
              { label: '2FA Enabled', value: mfaEnabled ? '✅ Yes' : '❌ No' },
              { label: 'Plan', value: (profile?.plan || 'free').toUpperCase() },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < 5 ? '1px solid #f1f5f9' : 'none' }}>
                <span style={{ color: '#64748b', fontSize: '13px' }}>{item.label}</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{item.value}</span>
              </div>
            ))}
          </div>
          <Link to="/user/sessions" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '16px', color: '#2563eb', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
            <i className="fas fa-desktop"></i> View Active Sessions
          </Link>
        </div>

        {/* Change Email */}
        <div className="settings-card">
          <h3><i className="fas fa-envelope" style={{ color: '#06b6d4', marginRight: '8px' }}></i> Change Email</h3>
          <form onSubmit={changeEmail} style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label>New Email</label>
              <input type="email" required value={emailForm.new_email} onChange={e => setEmailForm({ ...emailForm, new_email: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Current Password</label>
              <input type="password" required value={emailForm.password} onChange={e => setEmailForm({ ...emailForm, password: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary" disabled={emailLoading} style={{ width: '100%' }}>
              {emailLoading ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Updating...</> : 'Change Email'}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="settings-card">
          <h3><i className="fas fa-lock" style={{ color: '#f59e0b', marginRight: '8px' }}></i> Change Password</h3>
          <form onSubmit={changePassword} style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label>Current Password</label>
              <input type="password" required value={pwForm.current_password} onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })} />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" required minLength="12" value={pwForm.new_password} onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })} />
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Min 12 chars, uppercase, lowercase, number, special character</span>
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" required value={pwForm.confirmPassword} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary" disabled={pwLoading} style={{ width: '100%' }}>
              {pwLoading ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Changing...</> : 'Change Password'}
            </button>
          </form>
        </div>

        {/* MFA / 2FA */}
        <div className="settings-card">
          <h3><i className="fas fa-shield-halved" style={{ color: '#8b5cf6', marginRight: '8px' }}></i> Two-Factor Authentication</h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '12px' }}>
            Add an extra layer of security to your account using an authenticator app.
          </p>

          {mfaSetup ? (
            <div style={{ marginTop: '16px' }}>
              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '12px' }}>Scan this QR code with your authenticator app:</p>
              {mfaSetup.qr_code && <img src={mfaSetup.qr_code} alt="QR Code" style={{ width: '200px', height: '200px', borderRadius: '8px', marginBottom: '12px' }} />}
              <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '12px', color: '#64748b', marginBottom: '12px', wordBreak: 'break-all' }}>
                Secret: <strong>{mfaSetup.secret}</strong>
              </div>
              {mfaSetup.backup_codes && (
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600, marginBottom: '6px' }}>Save these backup codes:</p>
                  {mfaSetup.backup_codes.map((c, i) => <div key={i} style={{ fontSize: '12px', fontFamily: 'monospace', color: '#475569' }}>{c}</div>)}
                </div>
              )}
              <input type="text" placeholder="Enter 6-digit code" value={mfaCode} onChange={e => setMfaCode(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px', fontSize: '14px', letterSpacing: 4, textAlign: 'center' }} maxLength={6} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleVerifyMFA} disabled={mfaLoading} className="btn-primary" style={{ flex: 1 }}>Verify & Enable</button>
                <button onClick={() => { setMfaSetup(null); setMfaCode('') }} style={{ padding: '10px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              </div>
            </div>
          ) : mfaEnabled ? (
            <div style={{ marginTop: '16px' }}>
              <div style={{ padding: '12px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0', marginBottom: '16px' }}>
                <span style={{ color: '#059669', fontSize: '13px', fontWeight: 600 }}><i className="fas fa-check-circle" style={{ marginRight: '6px' }}></i> 2FA is enabled</span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>To disable, enter your password and an auth code:</p>
              <input type="password" placeholder="Current password" value={mfaDisableForm.password} onChange={e => setMfaDisableForm({ ...mfaDisableForm, password: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px', fontSize: '13px' }} />
              <input type="text" placeholder="6-digit code" value={mfaDisableForm.code} onChange={e => setMfaDisableForm({ ...mfaDisableForm, code: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px', fontSize: '13px', letterSpacing: 4, textAlign: 'center' }} maxLength={6} />
              <button onClick={handleDisableMFA} disabled={mfaLoading} style={{ width: '100%', padding: '10px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                {mfaLoading ? 'Processing...' : 'Disable 2FA'}
              </button>
            </div>
          ) : (
            <button onClick={handleEnableMFA} disabled={mfaLoading} style={{ marginTop: '16px', padding: '12px 20px', background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-shield-halved"></i>
              {mfaLoading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
            </button>
          )}
        </div>

        {/* Plan Details */}
        <div className="settings-card">
          <h3><i className="fas fa-crown" style={{ color: '#d97706', marginRight: '8px' }}></i> Subscription Plan</h3>
          <div style={{ padding: '20px', borderRadius: '12px', background: isPremium ? '#f5f3ff' : '#f8fafc', border: `1px solid ${isPremium ? '#e9d5ff' : '#e2e8f0'}`, marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: isPremium ? 'linear-gradient(135deg, #8b5cf6, #a78bfa)' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: isPremium ? '#fff' : '#94a3b8' }}>
                <i className={`fas ${isPremium ? 'fa-crown' : 'fa-lock'}`}></i>
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{isPremium ? 'Premium Plan' : 'Free Plan'}</div>
              </div>
            </div>
            {isPremium ? (
              <button onClick={handleDowngrade} disabled={planLoading} style={{ padding: '10px 20px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                <i className="fas fa-arrow-down" style={{ marginRight: '6px' }}></i> Downgrade to Free
              </button>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  {[{ id: 'monthly', label: 'Monthly', price: '$9', sub: '/month' }, { id: 'yearly', label: 'Yearly', price: '$60', sub: '/year' }].map(p => (
                    <div key={p.id} onClick={() => setSelectedPlan(p.id)} style={{ padding: '16px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', border: `2px solid ${selectedPlan === p.id ? '#2563eb' : '#e2e8f0'}`, background: selectedPlan === p.id ? '#eff6ff' : '#fff', transition: 'all 0.2s' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>{p.label}</div>
                      <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>{p.price}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{p.sub}</div>
                    </div>
                  ))}
                </div>
                <button onClick={handleUpgrade} disabled={planLoading} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}>
                  {planLoading ? <><i className="fas fa-spinner fa-spin"></i> Processing...</> : <><i className="fas fa-crown" style={{ marginRight: '8px' }}></i> Upgrade to Premium</>}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* API Key */}
        <div className="settings-card">
          <h3><i className="fas fa-key" style={{ color: '#8b5cf6', marginRight: '8px' }}></i> API Key</h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '12px', marginBottom: '16px' }}>
            Your API key authenticates your websites with MDefender.
          </p>
          <div style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontFamily: "'Fira Code', Consolas, monospace", color: '#2563eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '16px' }}>
            {profile?.api_key || 'No key generated'}
          </div>
          <button onClick={async () => { if (!confirm('Regenerate API key?')) return; try { await api.regenerateApiKey(); fetchProfile() } catch (err) { showErr(err.message) } }} style={{ padding: '10px 20px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            <i className="fas fa-arrow-rotate-right" style={{ marginRight: '6px' }}></i> Regenerate API Key
          </button>
        </div>
      </div>
    </div>
  )
}
