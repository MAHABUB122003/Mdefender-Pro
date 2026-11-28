import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, Users, Globe, CheckCircle2, AlertTriangle, ArrowRight, LogIn, Lock } from 'lucide-react'
import api from '../api/api'

export default function AcceptTeamInvite() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState(null)
  const [error, setError] = useState('')
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [currentEmail, setCurrentEmail] = useState(() => (
    typeof localStorage !== 'undefined' ? (localStorage.getItem('mdefender_user_email') || '') : ''
  ))

  const isLoggedIn = typeof localStorage !== 'undefined' && Boolean(localStorage.getItem('mdefender_access'))

  useEffect(() => {
    if (isLoggedIn) {
      api.getUserProfile()
        .then((res) => {
          const u = res?.data?.user || res?.data || res?.user || res
          if (u?.email) setCurrentEmail(u.email)
        })
        .catch(() => {})
    }
  }, [isLoggedIn])

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing invitation token.')
      setLoading(false)
      return
    }
    api.verifyTeamInvite(token)
      .then((res) => {
        const data = res?.data || res
        setInvite(data)
        if (data?.name) setFullName(data.name)
      })
      .catch((err) => {
        setError(err?.message || 'This invitation link is invalid or has expired.')
      })
      .finally(() => setLoading(false))
  }, [token])

  const handleSwitchAccount = async (targetPath) => {
    try { await api.logout() } catch {}
    if (api.clearTokens) api.clearTokens()
    navigate(targetPath)
  }

  const handleAccept = async () => {
    setAccepting(true)
    setError('')
    try {
      const res = await api.acceptTeamInvite(token)
      const ownerId = res?.data?.owner_id
      if (ownerId) {
        localStorage.setItem('mdefender_workspace_owner', ownerId)
      }
      setAccepted(true)
      setTimeout(() => {
        window.location.href = '/user/dashboard'
      }, 1000)
    } catch (err) {
      setError(err?.message || 'Failed to accept invitation.')
    } finally {
      setAccepting(false)
    }
  }

  const handleCompleteSignup = async (e) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters (include uppercase, lowercase, and a number).')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setAccepting(true)
    setError('')
    try {
      if (isLoggedIn) {
        try { await api.logout() } catch {}
        if (api.clearTokens) api.clearTokens()
      }
      const res = await api.completeTeamInviteSignup({
        token,
        full_name: fullName.trim() || invite?.name || '',
        password,
      })
      const payload = res?.data || res
      if (payload?.access_token) {
        localStorage.setItem('mdefender_access', payload.access_token)
      }
      if (payload?.refresh_token) {
        localStorage.setItem('mdefender_refresh', payload.refresh_token)
      }
      if (payload?.csrf_token) {
        localStorage.setItem('mdefender_csrf', payload.csrf_token)
      }
      if (payload?.user?.email) {
        localStorage.setItem('mdefender_user_email', payload.user.email)
      }
      if (payload?.user?.name) {
        localStorage.setItem('mdefender_user_name', payload.user.name)
      }
      if (payload?.owner_id) {
        localStorage.setItem('mdefender_workspace_owner', payload.owner_id)
      }
      setAccepted(true)
      setTimeout(() => {
        window.location.href = '/user/dashboard'
      }, 1000)
    } catch (err) {
      setError(err?.message || 'Could not complete account setup.')
    } finally {
      setAccepting(false)
    }
  }

  const isEmailMismatch = Boolean(
    isLoggedIn && currentEmail && invite?.email &&
    currentEmail.toLowerCase() !== invite.email.toLowerCase()
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F7F6F1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: '#FFFFFF',
        border: '1px solid #D9E1DC',
        borderRadius: '18px',
        padding: '32px',
        boxShadow: '0 12px 36px rgba(16, 32, 30, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: '#0B2522',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Users size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#10201E' }}>
              Workspace Team Invitation
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#60716B' }}>
              MDefender Pro Security &amp; Management
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: '#60716B', fontSize: '13px', fontWeight: 600 }}>
            Verifying secure invitation token...
          </div>
        ) : accepted ? (
          <div style={{ padding: '20px', borderRadius: '12px', background: '#F0FDF4', border: '1px solid #BBF7D0', textAlign: 'center' }}>
            <CheckCircle2 size={32} color="#15803D" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#10201E' }}>Welcome to the Team!</div>
            <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '4px' }}>
              Redirecting you to the workspace dashboard...
            </div>
          </div>
        ) : error && !invite ? (
          <div style={{ padding: '20px', borderRadius: '12px', background: '#FEF2F2', border: '1px solid #FECACA', textAlign: 'center' }}>
            <AlertTriangle size={28} color="#DC2626" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#991B1B' }}>Invitation Unavailable</div>
            <p style={{ fontSize: '12.5px', color: '#7F1D1D', margin: '6px 0 16px' }}>{error}</p>
            <Link to="/user/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
              borderRadius: '8px', background: '#0B2522', color: '#FFFFFF', textDecoration: 'none',
              fontSize: '13px', fontWeight: 700
            }}>
              Go to Login
            </Link>
          </div>
        ) : invite && (
          <div>
            <div style={{
              background: '#FAFBF9',
              border: '1px solid #D9E1DC',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '18px'
            }}>
              <div style={{ fontSize: '12px', color: '#60716B', fontWeight: 600 }}>Invited By</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#10201E', marginTop: '2px' }}>
                {invite.owner_name} ({invite.owner_email})
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#60716B', fontWeight: 700, textTransform: 'uppercase' }}>Assigned Role</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px', fontSize: '12.5px', fontWeight: 700, color: '#15803D' }}>
                    <ShieldCheck size={14} />
                    <span>{invite.role_title}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#60716B', fontWeight: 700, textTransform: 'uppercase' }}>Site Scope</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px', fontSize: '12.5px', fontWeight: 700, color: '#10201E' }}>
                    <Globe size={14} />
                    <span>{invite.scope}</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '12px', fontSize: '12px', color: '#475569' }}>
                Invited email: <strong>{invite.email}</strong>
              </div>
            </div>

            {error && (
              <div style={{
                marginBottom: '14px', padding: '10px 12px', borderRadius: '8px',
                background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B',
                fontSize: '12.5px', fontWeight: 600
              }}>
                {error}
              </div>
            )}

            {!invite.account_exists ? (
              <form onSubmit={handleCompleteSignup} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#10201E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={14} color="#15803D" />
                  <span>Set Your Password &amp; Join Workspace</span>
                </div>
                {isEmailMismatch && (
                  <div style={{
                    padding: '9px 11px', borderRadius: '8px', background: '#FFFBEB',
                    border: '1px solid #FDE68A', color: '#92400E', fontSize: '12px', fontWeight: 600
                  }}>
                    Currently signed in as <strong>{currentEmail}</strong>. Completing setup will switch to <strong>{invite.email}</strong>.
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    style={{
                      width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px',
                      border: '1px solid #D9E1DC', fontSize: '13px', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Create Password (min 8 chars, upper, lower &amp; number)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    required
                    style={{
                      width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px',
                      border: '1px solid #D9E1DC', fontSize: '13px', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    style={{
                      width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px',
                      border: '1px solid #D9E1DC', fontSize: '13px', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={accepting}
                  style={{
                    width: '100%', marginTop: '4px', padding: '12px 18px', borderRadius: '10px', border: 'none',
                    background: '#0B2522', color: '#FFFFFF', fontSize: '14px', fontWeight: 700,
                    cursor: accepting ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  <span>{accepting ? 'Creating Account & Joining...' : 'Create Account & Join Workspace'}</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            ) : isEmailMismatch ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{
                  padding: '10px 12px', borderRadius: '8px',
                  background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E',
                  fontSize: '12.5px', fontWeight: 600
                }}>
                  You are currently signed in as <strong>{currentEmail}</strong>. Switch to <strong>{invite.email}</strong> to accept this invitation.
                </div>
                <button
                  type="button"
                  onClick={() => handleSwitchAccount(`/user/login?redirect=${encodeURIComponent('/team/accept?token=' + token)}`)}
                  style={{
                    width: '100%', padding: '12px 18px', borderRadius: '10px', border: 'none',
                    background: '#0B2522', color: '#FFFFFF', fontSize: '14px', fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  <LogIn size={16} />
                  <span>Switch Account &amp; Log In as {invite.email}</span>
                </button>
              </div>
            ) : isLoggedIn ? (
              <button
                type="button"
                onClick={handleAccept}
                disabled={accepting}
                style={{
                  width: '100%', padding: '12px 18px', borderRadius: '10px', border: 'none',
                  background: '#0B2522', color: '#FFFFFF', fontSize: '14px', fontWeight: 700,
                  cursor: accepting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <span>{accepting ? 'Joining Workspace...' : 'Accept & Join Workspace'}</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{
                  padding: '10px 12px', borderRadius: '8px',
                  background: '#F0F9FF', border: '1px solid #BAE6FD', color: '#0369A1',
                  fontSize: '12px', fontWeight: 600, lineHeight: 1.5
                }}>
                  An MDefender account already exists for <strong>{invite.email}</strong>. Sign in with your existing password to join this workspace.
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/user/login?redirect=${encodeURIComponent('/team/accept?token=' + token)}`)}
                  style={{
                    width: '100%', padding: '12px 18px', borderRadius: '10px', border: 'none',
                    background: '#0B2522', color: '#FFFFFF', fontSize: '14px', fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  <LogIn size={16} />
                  <span>Log In as {invite.email} to Accept</span>
                </button>
                <Link
                  to={`/forgot-password?email=${encodeURIComponent(invite.email)}`}
                  style={{
                    textAlign: 'center', fontSize: '12.5px', fontWeight: 700,
                    color: '#475569', textDecoration: 'none', padding: '4px'
                  }}
                >
                  Forgot password? Reset it here
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
