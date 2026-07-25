import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import theme from '../utils/theme'
import api from '../api/api'

export default function UserLogin() {
  const navigate = useNavigate()
  const { dark } = useTheme()
  const s = theme(dark)
  const [searchParams, setSearchParams] = useSearchParams()
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaRequired, setMfaRequired] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(searchParams.get('verified') === 'true')
  const [rememberMe, setRememberMe] = useState(false)

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false)
        searchParams.delete('verified')
        setSearchParams(searchParams, { replace: true })
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [showSuccess, searchParams, setSearchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setShowSuccess(false)
    setLoading(true)
    try {
      if (mfaRequired) {
        const data = await api.verifyMFA(tempToken, mfaCode)
        if (data.status === 'success') {
          window.location.href = '/user/dashboard'
        } else {
          setError(data.message || 'Invalid verification code')
        }
      } else {
        const data = await api.login(emailOrUsername, password, rememberMe)
        if (data.status === 'success') {
          window.location.href = '/user/dashboard'
        } else if (data.mfa_required) {
          setMfaRequired(true)
          setTempToken(data.temp_token || '')
          setError('')
        } else if (data.email_not_verified) {
          navigate('/auth/verify-email')
          return
        } else {
          setError(data.message || 'Invalid credentials')
        }
      }
    } catch (err) {
      setError(err.message || 'Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const data = await api.getGoogleAuthUrl()
      if (data.url) window.location.href = data.url
    } catch {
      setError('Google sign-in is not configured')
    }
  }

  const inputStyle = {
    width: '100%', padding: '13px 14px 13px 42px',
    border: `1.5px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`, borderRadius: 10,
    fontSize: 14, transition: 'all 0.2s', boxSizing: 'border-box',
    background: dark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
    color: s.text, fontFamily: 'inherit', outline: 'none',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, background: dark ? '#0f172a' : '#f8fafc',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <style>{`
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .login-card { border-radius: 16px; padding: 40px 36px 36px; box-shadow: ${dark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.04)'}; border: 1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}; width: 100%; max-width: 420px; position: relative; z-index: 1; animation: fadeSlideIn 0.5s ease forwards; background: ${dark ? '#1e293b' : '#fff'}; }
        .login-card .field-wrap { position: relative; margin-bottom: 18px; }
        .login-card .field-wrap label { display: block; margin-bottom: 6px; color: ${dark ? '#94a3b8' : '#475569'}; font-weight: 500; font-size: 13px; }
        .login-card .field-wrap .icon { position: absolute; left: 14px; top: 38px; color: ${dark ? '#475569' : '#94a3b8'}; font-size: 14px; pointer-events: none; transition: color 0.2s; }
        .login-card .field-wrap:focus-within .icon { color: #6366f1; }
        .login-card input:focus { outline: none; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); background: ${dark ? '#0f172a' : '#fff'} !important; }
        .login-card input::placeholder { color: ${dark ? '#334155' : '#94a3b8'}; font-size: 13px; }
        .login-submit {
          width: 100%; padding: 13px; background: linear-gradient(135deg, #4f46e5, #6366f1);
          color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.2s; display: flex; align-items: center;
          justify-content: center; gap: 8px; letter-spacing: 0.01em;
        }
        .login-submit:hover { box-shadow: 0 4px 16px rgba(99,102,241,0.35); transform: translateY(-1px); }
        .login-submit:active { transform: translateY(0); }
        .login-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .login-submit .spinner { display: none; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
        .login-submit.loading .spinner { display: inline-block; }
        .login-submit.loading .btn-text { display: none; }
        .mfa-input {
          width: 100%; padding: 16px; text-align: center; font-size: 28px; font-weight: 700;
          letter-spacing: 12px; border: 1.5px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
          border-radius: 12px; background: ${dark ? 'rgba(255,255,255,0.03)' : '#f8fafc'};
          color: s.text; font-family: "'SF Mono', 'Fira Code', Consolas, monospace"; outline: none;
          transition: all 0.2s; margin-bottom: 8px;
        }
        .mfa-input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); background: ${dark ? '#0f172a' : '#fff'} !important; }
        .divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}; }
        .divider span { font-size: 12px; color: ${dark ? '#475569' : '#94a3b8'}; font-weight: 500; }
        .google-btn { width: 100%; padding: 12px; background: ${dark ? 'rgba(255,255,255,0.03)' : '#fff'}; color: ${dark ? '#e2e8f0' : '#374151'}; border: 1.5px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}; border-radius: 10px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .google-btn:hover { background: ${dark ? 'rgba(255,255,255,0.06)' : '#f9fafb'}; border-color: ${dark ? 'rgba(255,255,255,0.12)' : '#d1d5db'}; }
        .sec-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 500; background: ${dark ? 'rgba(16,185,129,0.08)' : '#f0fdf4'}; color: #10b981; border: 1px solid ${dark ? 'rgba(16,185,129,0.15)' : '#bbf7d0'}; }
      `}</style>

      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #4f46e5, #6366f1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}>
              <i className="fas fa-shield-halved" style={{ fontSize: 18, color: '#fff' }}></i>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: s.text, letterSpacing: '-0.3px' }}>MDefender Pro</span>
          </Link>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <span className="sec-badge"><i className="fas fa-lock" style={{ fontSize: 10 }}></i> 256-bit Encrypted</span>
          </div>

          <h1 style={{ color: s.text, fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px' }}>
            {mfaRequired ? 'Two-Factor Verification' : 'Welcome back'}
          </h1>
          <p style={{ color: dark ? '#64748b' : '#64748b', fontSize: 13, marginTop: 6 }}>
            {mfaRequired
              ? 'Enter the 6-digit code from your authenticator app'
              : 'Sign in to your security dashboard'}
          </p>
        </div>

        {showSuccess && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, marginBottom: 18, fontSize: 13, fontWeight: 500, background: dark ? 'rgba(16,185,129,0.08)' : '#f0fdf4', color: '#10b981', border: `1px solid ${dark ? 'rgba(16,185,129,0.15)' : '#bbf7d0'}` }}>
            <i className="fas fa-check-circle" style={{ fontSize: 13 }}></i> Email verified! You can now sign in.
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          {!mfaRequired ? (
            <>
              <div className="field-wrap">
                <label htmlFor="email">Email or Username</label>
                <i className="fas fa-envelope icon"></i>
                <input type="text" id="email" placeholder="Enter your email or username"
                  required autoFocus value={emailOrUsername}
                  onChange={e => setEmailOrUsername(e.target.value)} style={inputStyle} />
              </div>
              <div className="field-wrap">
                <label htmlFor="password">Password</label>
                <i className="fas fa-lock icon"></i>
                <input type="password" id="password" placeholder="Enter your password"
                  required value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: dark ? '#94a3b8' : '#64748b', fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                    style={{ width: 15, height: 15, accentColor: '#6366f1' }} />
                  Remember me
                </label>
                <Link to="/auth/forgot-password" style={{ color: '#6366f1', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>
                  Forgot password?
                </Link>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: dark ? 'rgba(99,102,241,0.1)' : '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <i className="fas fa-mobile-screen-button" style={{ fontSize: 22, color: '#6366f1' }}></i>
              </div>
              <input
                type="text" className="mfa-input" placeholder="000000"
                required autoFocus value={mfaCode}
                onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
              />
              <p style={{ color: dark ? '#64748b' : '#94a3b8', fontSize: 12, marginTop: 4 }}>
                Open your authenticator app to view the code
              </p>
            </div>
          )}

          <button type="submit" className={`login-submit ${loading ? 'loading' : ''}`} disabled={loading}>
            <span className="spinner"></span>
            <span className="btn-text">
              {mfaRequired ? 'Verify & Sign In' : 'Sign In'}
            </span>
          </button>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, marginTop: 14, fontSize: 13, fontWeight: 500, background: dark ? 'rgba(239,68,68,0.08)' : '#fef2f2', color: '#ef4444', border: `1px solid ${dark ? 'rgba(239,68,68,0.15)' : '#fecaca'}` }}>
              <i className="fas fa-exclamation-circle" style={{ fontSize: 13 }}></i> {error}
            </div>
          )}
        </form>

        {!mfaRequired && (
          <>
            <div className="divider"><span>or</span></div>
            <button onClick={handleGoogleLogin} className="google-btn" type="button">
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>

            <div style={{ textAlign: 'center', marginTop: 24, color: dark ? '#64748b' : '#64748b', fontSize: 13 }}>
              Don&apos;t have an account? <Link to="/register" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>Create one</Link>
            </div>
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <Link to="/" style={{ color: dark ? '#475569' : '#94a3b8', fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <i className="fas fa-arrow-left" style={{ fontSize: 10 }}></i> Back to home
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
