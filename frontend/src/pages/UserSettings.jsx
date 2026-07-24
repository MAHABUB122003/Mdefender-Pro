import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/api'

export default function UserSettings() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirmPassword: '' })
  const [msg, setMsg] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [planLoading, setPlanLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('monthly')

  const token = localStorage.getItem('mdefender_user_token')

  const fetchProfile = async () => {
    try {
      const data = await api.getUserProfile()
      setProfile(data)
    } catch (err) {
      if (err.message === 'Unauthorized') {
        localStorage.removeItem('mdefender_user_token')
        navigate('/user/login')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) { navigate('/user/login'); return }
    fetchProfile()
  }, [token, navigate])

  const changePassword = async (e) => {
    e.preventDefault()
    if (pwForm.new_password !== pwForm.confirmPassword) { alert('Passwords do not match'); return }
    if (pwForm.new_password.length < 8) { alert('Password must be at least 8 characters'); return }
    setPwLoading(true)
    try {
      const data = await api.changeUserPassword({ old_password: pwForm.old_password, new_password: pwForm.new_password })
      if (data.status === 'success') {
        setPwForm({ old_password: '', new_password: '', confirmPassword: '' })
        setMsg('Password changed successfully!')
        setTimeout(() => setMsg(''), 3000)
      } else {
        alert(data.message || 'Failed to change password')
      }
    } catch (err) {
      alert(err.message || 'Failed to change password')
    } finally {
      setPwLoading(false)
    }
  }

  const isPremium = profile?.plan === 'premium'

  const handleUpgrade = async () => {
    if (!confirm(`Upgrade to Premium (${selectedPlan === 'yearly' ? '1 year' : '1 month'})?`)) return
    setPlanLoading(true)
    try {
      const days = selectedPlan === 'yearly' ? 365 : 30
      const result = await api.upgradePlan(days)
      if (result.status === 'success') {
        localStorage.setItem('mdefender_user_plan', 'premium')
        setMsg(result.message)
        fetchProfile()
      } else {
        alert(result.message || 'Upgrade failed')
      }
    } catch (err) {
      alert(err.message || 'Upgrade failed')
    } finally {
      setPlanLoading(false)
    }
  }

  const handleDowngrade = async () => {
    if (!confirm('Downgrade to Free plan? You will lose access to premium features (Logs, Rules, unlimited websites).')) return
    setPlanLoading(true)
    try {
      const result = await api.downgradePlan()
      if (result.status === 'success') {
        localStorage.setItem('mdefender_user_plan', 'free')
        setMsg(result.message)
        fetchProfile()
      } else {
        alert(result.message || 'Downgrade failed')
      }
    } catch (err) {
      alert(err.message || 'Downgrade failed')
    } finally {
      setPlanLoading(false)
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: '24px' }}></i></div>
  }

  return (
    <>
      {msg && (
        <div style={{
          background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669',
          padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px', fontWeight: 500,
        }}>
          <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>{msg}
        </div>
      )}

      <div className="settings-grid">
        {/* Profile Info */}
        <div className="settings-card">
          <h3><i className="fas fa-user-circle" style={{ color: '#2563eb', marginRight: '8px' }}></i> Profile Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b', fontSize: '13px' }}>Name</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{profile?.name || '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b', fontSize: '13px' }}>Email</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{profile?.email || '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b', fontSize: '13px' }}>Role</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', textTransform: 'capitalize' }}>{profile?.role || 'readonly'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b', fontSize: '13px' }}>Plan</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                background: isPremium ? '#f5f3ff' : '#f1f5f9', color: isPremium ? '#8b5cf6' : '#64748b',
              }}>
                <i className={`fas ${isPremium ? 'fa-crown' : 'fa-star'}`}></i>
                {(profile?.plan || 'free').toUpperCase()}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
              <span style={{ color: '#64748b', fontSize: '13px' }}>Member Since</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{profile?.created_at || '—'}</span>
            </div>
          </div>
        </div>

        {/* Plan Details */}
        <div className="settings-card">
          <h3><i className="fas fa-crown" style={{ color: '#d97706', marginRight: '8px' }}></i> Subscription Plan</h3>
          <div style={{ padding: '20px', borderRadius: '12px', background: isPremium ? '#f5f3ff' : '#f8fafc', border: `1px solid ${isPremium ? '#e9d5ff' : '#e2e8f0'}`, marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: isPremium ? 'linear-gradient(135deg, #8b5cf6, #a78bfa)' : '#e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', color: isPremium ? '#fff' : '#94a3b8',
              }}>
                <i className={`fas ${isPremium ? 'fa-crown' : 'fa-lock'}`}></i>
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{isPremium ? 'Premium Plan' : 'Free Plan'}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  {isPremium
                    ? `Active until ${profile?.plan_expires || 'N/A'}`
                    : 'Unlock all features'}
                </div>
              </div>
            </div>

            {/* Feature Comparison */}
            <div style={{ fontSize: '13px', color: '#475569', marginBottom: '20px' }}>
              {[
                { label: 'Websites', free: '1 website', premium: 'Unlimited' },
                { label: 'Attack Logs', free: 'Locked', premium: 'Full access' },
                { label: 'WAF Rules', free: 'Locked', premium: 'Full access' },
                { label: 'Finance Module', free: 'Full access', premium: 'Full access' },
                { label: 'Notice Board', free: 'Full access', premium: 'Full access' },
                { label: 'Support', free: 'Community', premium: 'Priority' },
              ].map((item, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: i < 5 ? '1px solid #f1f5f9' : 'none', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{item.label}</span>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <span style={{ color: '#94a3b8', minWidth: '90px', textAlign: 'right' }}>{item.free}</span>
                    <span style={{ color: '#8b5cf6', fontWeight: '600', minWidth: '90px', textAlign: 'right' }}>{item.premium}</span>
                  </div>
                </div>
              ))}
            </div>

            {isPremium ? (
              <div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <span style={{
                    padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                    background: '#f5f3ff', color: '#8b5cf6', border: '1px solid #e9d5ff',
                  }}>
                    <i className="fas fa-crown" style={{ marginRight: '6px' }}></i> Premium Active
                  </span>
                  {profile?.plan_expires && (
                    <span style={{ fontSize: '12px', color: '#64748b', padding: '6px 0' }}>
                      Expires: {profile.plan_expires}
                    </span>
                  )}
                </div>
                <button onClick={handleDowngrade} disabled={planLoading} style={{
                  padding: '10px 20px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca',
                  borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <i className="fas fa-arrow-down"></i> Downgrade to Free
                </button>
              </div>
            ) : (
              <div>
                {/* Plan Selection */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  <div onClick={() => setSelectedPlan('monthly')} style={{
                    padding: '16px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
                    border: `2px solid ${selectedPlan === 'monthly' ? '#2563eb' : '#e2e8f0'}`,
                    background: selectedPlan === 'monthly' ? '#eff6ff' : '#fff',
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Monthly</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>$9</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>/month</div>
                  </div>
                  <div onClick={() => setSelectedPlan('yearly')} style={{
                    padding: '16px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
                    border: `2px solid ${selectedPlan === 'yearly' ? '#2563eb' : '#e2e8f0'}`,
                    background: selectedPlan === 'yearly' ? '#eff6ff' : '#fff',
                    transition: 'all 0.2s', position: 'relative',
                  }}>
                    <span style={{
                      position: 'absolute', top: '-8px', right: '-8px',
                      background: '#10b981', color: '#fff', fontSize: '9px', fontWeight: '700',
                      padding: '3px 8px', borderRadius: '10px',
                    }}>SAVE 44%</span>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Yearly</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>$60</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>/year ($5/mo)</div>
                  </div>
                </div>

                <button onClick={handleUpgrade} disabled={planLoading} style={{
                  width: '100%', padding: '14px',
                  background: planLoading ? '#94a3b8' : 'linear-gradient(135deg, #2563eb, #3b82f6)',
                  color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700',
                  cursor: planLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                }}>
                  {planLoading ? (
                    <><i className="fas fa-spinner fa-spin"></i> Processing...</>
                  ) : (
                    <><i className="fas fa-crown"></i> Upgrade to Premium {selectedPlan === 'yearly' ? '($60/yr)' : '($9/mo)'}</>
                  )}
                </button>

                <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '11px', color: '#94a3b8' }}>
                  <i className="fas fa-shield-halved" style={{ marginRight: '4px' }}></i>
                  Instant activation. Cancel anytime.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Change Password */}
        <div className="settings-card">
          <h3><i className="fas fa-lock" style={{ color: '#f59e0b', marginRight: '8px' }}></i> Change Password</h3>
          <form onSubmit={changePassword} style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label>Current Password</label>
              <input type="password" required value={pwForm.old_password}
                onChange={e => setPwForm({ ...pwForm, old_password: e.target.value })} />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" required minLength="8" value={pwForm.new_password}
                onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })} />
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Minimum 8 characters</span>
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" required value={pwForm.confirmPassword}
                onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary" disabled={pwLoading} style={{ width: '100%' }}>
              {pwLoading ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Changing...</> : 'Change Password'}
            </button>
          </form>
        </div>

        {/* API Key */}
        <div className="settings-card">
          <h3><i className="fas fa-key" style={{ color: '#8b5cf6', marginRight: '8px' }}></i> API Key</h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '12px', marginBottom: '16px' }}>
            Your API key is used to authenticate requests from your websites to MDefender. Keep it secure and never share it publicly.
          </p>
          <div style={{
            padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: '8px', fontSize: '13px', fontFamily: "'Fira Code', Consolas, monospace",
            color: '#2563eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '16px',
          }}>
            {profile?.api_key || 'No key generated'}
          </div>
          <button onClick={async () => {
            if (!confirm('Regenerate API key? Your old key will stop working immediately.')) return
            try { await api.regenerateApiKey(); fetchProfile() } catch (err) { alert(err.message) }
          }} style={{
            padding: '10px 20px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a',
            borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <i className="fas fa-arrow-rotate-right"></i> Regenerate API Key
          </button>
        </div>
      </div>
    </>
  )
}
