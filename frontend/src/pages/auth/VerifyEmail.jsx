import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import theme from '../../utils/theme'
import api from '../../api/api'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const { dark } = useTheme()
  const s = theme(dark)
  const [status, setStatus] = useState('verifying')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      api.verifyEmail(token)
        .then(data => {
          setStatus('success')
          setMessage(data.message || 'Email verified successfully!')
        })
        .catch(err => {
          setStatus('error')
          setMessage(err.message || 'Invalid or expired verification link')
        })
    } else {
      setStatus('waiting')
    }
  }, [searchParams])

  const handleResend = async (e) => {
    e.preventDefault()
    if (!email) return
    setResending(true)
    setResendSuccess(false)
    try {
      const data = await api.resendVerification(email)
      setMessage(data.message || 'Verification email sent!')
      setResendSuccess(true)
      setStatus('resent')
    } catch (err) {
      setMessage(err.message || 'Failed to resend verification email')
    }
    setResending(false)
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
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .verify-card { border-radius: 16px; padding: 40px 36px 36px; box-shadow: ${dark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.04)'}; border: 1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}; width: 100%; max-width: 420px; animation: fadeSlideIn 0.5s ease forwards; background: ${dark ? '#1e293b' : '#fff'}; }
        .verify-submit {
          width: 100%; padding: 13px; background: linear-gradient(135deg, #4f46e5, #6366f1);
          color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.2s; display: flex; align-items: center;
          justify-content: center; gap: 8px; letter-spacing: 0.01em;
        }
        .verify-submit:hover { box-shadow: 0 4px 16px rgba(99,102,241,0.35); transform: translateY(-1px); }
        .verify-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .verify-submit .spinner { display: none; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
        .verify-submit.loading .spinner { display: inline-block; }
        .verify-submit.loading .btn-text { display: none; }
        .icon-circle { width: 64px; height: 64px; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
      `}</style>

      <div className="verify-card">
        <div style={{ textAlign: 'center' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 24 }}>
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #4f46e5, #6366f1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-shield-halved" style={{ fontSize: 16, color: '#fff' }}></i>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: s.text, letterSpacing: '-0.3px' }}>MDefender Pro</span>
          </Link>

          {/* Verifying State */}
          {status === 'verifying' && (
            <>
              <div style={{ animation: 'spin 1s linear infinite', width: 48, height: 48, border: `3px solid ${dark ? 'rgba(99,102,241,0.15)' : '#e0e7ff'}`, borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 20px' }}></div>
              <h2 style={{ color: s.text, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Verifying your email</h2>
              <p style={{ color: dark ? '#64748b' : '#64748b', fontSize: 14 }}>Please wait while we confirm your email address...</p>
            </>
          )}

          {/* Success State */}
          {status === 'success' && (
            <>
              <div className="icon-circle" style={{ background: dark ? 'rgba(16,185,129,0.1)' : '#f0fdf4' }}>
                <i className="fas fa-check" style={{ fontSize: 28, color: '#10b981' }}></i>
              </div>
              <h2 style={{ color: s.text, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Email Verified</h2>
              <p style={{ color: dark ? '#64748b' : '#64748b', fontSize: 14, marginBottom: 24 }}>{message}</p>
              <Link to="/user/login?verified=true" style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none', textAlign: 'center', padding: '13px 14px', fontWeight: 600, background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>
                <i className="fas fa-arrow-right-to-bracket"></i> Sign In to Dashboard
              </Link>
            </>
          )}

          {/* Error State */}
          {status === 'error' && (
            <>
              <div className="icon-circle" style={{ background: dark ? 'rgba(239,68,68,0.1)' : '#fef2f2' }}>
                <i className="fas fa-xmark" style={{ fontSize: 28, color: '#ef4444' }}></i>
              </div>
              <h2 style={{ color: s.text, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Verification Failed</h2>
              <p style={{ color: dark ? '#64748b' : '#64748b', fontSize: 14, marginBottom: 8 }}>{message}</p>
              <p style={{ color: dark ? '#475569' : '#94a3b8', fontSize: 13, marginBottom: 24 }}>Enter your email below to receive a new verification link.</p>

              <form onSubmit={handleResend} autoComplete="off">
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <i className="fas fa-envelope" style={{ position: 'absolute', left: 14, top: 14, color: dark ? '#475569' : '#94a3b8', fontSize: 14, pointerEvents: 'none' }}></i>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email" required style={inputStyle} />
                </div>
                <button type="submit" className={`verify-submit ${resending ? 'loading' : ''}`} disabled={resending}>
                  <span className="spinner"></span>
                  <span className="btn-text">Resend Verification Email</span>
                </button>
                {message && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, marginTop: 14, fontSize: 13, fontWeight: 500, background: dark ? 'rgba(239,68,68,0.08)' : '#fef2f2', color: '#ef4444', border: `1px solid ${dark ? 'rgba(239,68,68,0.15)' : '#fecaca'}` }}>
                    <i className="fas fa-exclamation-circle" style={{ fontSize: 13 }}></i> {message}
                  </div>
                )}
              </form>
            </>
          )}

          {/* Waiting / Resent State */}
          {(status === 'waiting' || status === 'resent') && (
            <>
              <div className="icon-circle" style={{ background: dark ? 'rgba(99,102,241,0.1)' : '#eef2ff' }}>
                <i className="fas fa-envelope-open-text" style={{ fontSize: 28, color: '#6366f1' }}></i>
              </div>
              <h2 style={{ color: s.text, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Check your inbox</h2>
              <p style={{ color: dark ? '#64748b' : '#64748b', fontSize: 14, marginBottom: 6 }}>
                {message || 'We\'ve sent a verification link to your email address.'}
              </p>
              <p style={{ color: dark ? '#475569' : '#94a3b8', fontSize: 13, marginBottom: 24 }}>
                Click the link in the email to verify your account. The link expires in 15 minutes.
              </p>

              {resendSuccess && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, marginBottom: 18, fontSize: 13, fontWeight: 500, background: dark ? 'rgba(16,185,129,0.08)' : '#f0fdf4', color: '#10b981', border: `1px solid ${dark ? 'rgba(16,185,129,0.15)' : '#bbf7d0'}` }}>
                  <i className="fas fa-check-circle" style={{ fontSize: 13 }}></i> Verification email sent successfully!
                </div>
              )}

              <form onSubmit={handleResend} autoComplete="off">
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <i className="fas fa-envelope" style={{ position: 'absolute', left: 14, top: 14, color: dark ? '#475569' : '#94a3b8', fontSize: 14, pointerEvents: 'none' }}></i>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email to resend" required style={inputStyle} />
                </div>
                <button type="submit" className={`verify-submit ${resending ? 'loading' : ''}`} disabled={resending}
                  style={{ background: dark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', color: dark ? '#e2e8f0' : '#475569' }}>
                  <span className="spinner"></span>
                  <span className="btn-text">Resend Verification Email</span>
                </button>
              </form>
            </>
          )}

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}` }}>
            <Link to="/user/login" style={{ color: '#6366f1', fontSize: 13, textDecoration: 'none', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <i className="fas fa-arrow-left" style={{ fontSize: 11 }}></i> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
