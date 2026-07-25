import { useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import theme from '../../utils/theme'
import api from '../../api/api'

export default function ResetPassword() {
  const { dark } = useTheme()
  const s = theme(dark)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState([])
  const [showPw, setShowPw] = useState(false)

  const pwRequirements = [
    { label: 'At least 12 characters', test: v => v.length >= 12 },
    { label: 'One uppercase letter', test: v => /[A-Z]/.test(v) },
    { label: 'One lowercase letter', test: v => /[a-z]/.test(v) },
    { label: 'One number', test: v => /\d/.test(v) },
    { label: 'One special character', test: v => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(v) },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setMessage('Passwords do not match')
      setStatus('error')
      return
    }
    const failed = pwRequirements.filter(r => !r.test(password))
    if (failed.length > 0) {
      setErrors(failed.map(r => r.label))
      return
    }
    setErrors([])
    setStatus('loading')
    try {
      const data = await api.resetPassword(token, password, confirmPassword)
      setStatus('success')
      setMessage(data.message || 'Password reset successful!')
      setTimeout(() => navigate('/user/login'), 3000)
    } catch (err) {
      setStatus('error')
      setMessage(err.message || 'Reset failed')
    }
  }

  if (!token) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, background: dark ? '#0f172a' : '#f8fafc',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}>
        <style>{`
          @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
          .rp-card-invalid { border-radius: 16px; padding: 40px 36px; text-align: center; box-shadow: ${dark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.04)'}; border: 1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}; max-width: 420px; width: 100%; animation: fadeSlideIn 0.5s ease forwards; background: ${dark ? '#1e293b' : '#fff'}; }
          .rp-invalid-btn { display: inline-flex; align-items: center; gap: 8px; padding: 13px 20px; background: linear-gradient(135deg, #4f46e5, #6366f1); color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; text-decoration: none; cursor: pointer; transition: all 0.2s; }
          .rp-invalid-btn:hover { box-shadow: 0 4px 16px rgba(99,102,241,0.35); }
        `}</style>
        <div className="rp-card-invalid">
          <div style={{ width: 56, height: 56, borderRadius: 14, background: dark ? 'rgba(239,68,68,0.1)' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <i className="fas fa-link-slash" style={{ fontSize: 22, color: '#ef4444' }}></i>
          </div>
          <h2 style={{ color: s.text, fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Invalid Reset Link</h2>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>This password reset link is invalid or missing.</p>
          <Link to="/auth/forgot-password" className="rp-invalid-btn">
            <i className="fas fa-key" style={{ fontSize: 13 }}></i> Request New Link
          </Link>
        </div>
      </div>
    )
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
        .rp-card { border-radius: 16px; padding: 40px 36px 36px; box-shadow: ${dark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.04)'}; border: 1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}; width: 100%; max-width: 420px; animation: fadeSlideIn 0.5s ease forwards; background: ${dark ? '#1e293b' : '#fff'}; }
        .rp-card input:focus { outline: none; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); background: ${dark ? '#0f172a' : '#fff'} !important; }
        .rp-card input::placeholder { color: ${dark ? '#334155' : '#94a3b8'}; font-size: 13px; }
        .rp-submit {
          width: 100%; padding: 13px; background: linear-gradient(135deg, #4f46e5, #6366f1);
          color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.2s; display: flex; align-items: center;
          justify-content: center; gap: 8px; letter-spacing: 0.01em;
        }
        .rp-submit:hover { box-shadow: 0 4px 16px rgba(99,102,241,0.35); transform: translateY(-1px); }
        .rp-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .rp-submit .spinner { display: none; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
        .rp-submit.loading .spinner { display: inline-block; }
        .rp-submit.loading .btn-text { display: none; }
        .rp-pw-toggle {
          position: absolute; right: 12px; top: 38px; background: none; border: none;
          color: ${dark ? '#64748b' : '#94a3b8'}; cursor: pointer; padding: 4px;
          display: flex; align-items: center; transition: color 0.2s;
        }
        .rp-pw-toggle:hover { color: #6366f1; }
      `}</style>

      <div className="rp-card">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #4f46e5, #6366f1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-shield-halved" style={{ fontSize: 16, color: '#fff' }}></i>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: s.text, letterSpacing: '-0.3px' }}>MDefender Pro</span>
          </Link>

          {status === 'success' ? (
            <>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: dark ? 'rgba(16,185,129,0.1)' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <i className="fas fa-check" style={{ fontSize: 24, color: '#10b981' }}></i>
              </div>
              <h2 style={{ color: s.text, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Password Reset!</h2>
              <p style={{ color: '#64748b', fontSize: 14, marginBottom: 8 }}>{message}</p>
              <p style={{ color: dark ? '#475569' : '#94a3b8', fontSize: 13 }}>Redirecting to login...</p>
            </>
          ) : (
            <>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: dark ? 'rgba(99,102,241,0.1)' : '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <i className="fas fa-lock" style={{ fontSize: 22, color: '#6366f1' }}></i>
              </div>
              <h2 style={{ color: s.text, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Set New Password</h2>
              <p style={{ color: '#64748b', fontSize: 14, marginBottom: 0 }}>Choose a strong password for your account.</p>
            </>
          )}
        </div>

        {status !== 'success' && (
          <form onSubmit={handleSubmit} autoComplete="off">
            <div style={{ position: 'relative', marginBottom: 18 }}>
              <label style={{ display: 'block', marginBottom: 6, color: dark ? '#94a3b8' : '#475569', fontWeight: 500, fontSize: 13 }}>New Password</label>
              <i className="fas fa-lock" style={{ position: 'absolute', left: 14, top: 38, color: dark ? '#475569' : '#94a3b8', fontSize: 14, pointerEvents: 'none' }}></i>
              <input type={showPw ? 'text' : 'password'} value={password}
                onChange={e => { setPassword(e.target.value); setErrors([]); }}
                placeholder="Enter new password" required style={inputStyle} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="rp-pw-toggle">
                <i className={showPw ? 'fas fa-eye-slash' : 'fas fa-eye'} style={{ fontSize: 15 }}></i>
              </button>
            </div>

            <div style={{ position: 'relative', marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, color: dark ? '#94a3b8' : '#475569', fontWeight: 500, fontSize: 13 }}>Confirm Password</label>
              <i className="fas fa-lock" style={{ position: 'absolute', left: 14, top: 38, color: dark ? '#475569' : '#94a3b8', fontSize: 14, pointerEvents: 'none' }}></i>
              <input type={showPw ? 'text' : 'password'} value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password" required style={inputStyle} />
            </div>

            <div style={{ marginBottom: 18, padding: 12, borderRadius: 8, background: dark ? 'rgba(99,102,241,0.05)' : '#f1f5f9', border: `1px solid ${dark ? 'rgba(99,102,241,0.08)' : '#e2e8f0'}` }}>
              {pwRequirements.map((req, i) => {
                const met = password.length > 0 && req.test(password)
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < pwRequirements.length - 1 ? 6 : 0 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: met ? '#10b981' : 'transparent', border: met ? 'none' : `2px solid ${dark ? '#334155' : '#cbd5e1'}`, transition: 'all 0.2s' }}>
                      {met && <i className="fas fa-check" style={{ fontSize: 9, color: '#fff' }}></i>}
                    </div>
                    <span style={{ fontSize: 12, color: met ? '#10b981' : (dark ? '#475569' : '#94a3b8'), fontWeight: met ? 600 : 400, transition: 'all 0.2s' }}>{req.label}</span>
                  </div>
                )
              })}
            </div>

            {status === 'error' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13, fontWeight: 500, background: dark ? 'rgba(239,68,68,0.08)' : '#fef2f2', color: '#ef4444', border: `1px solid ${dark ? 'rgba(239,68,68,0.15)' : '#fecaca'}` }}>
                <i className="fas fa-exclamation-circle" style={{ fontSize: 13 }}></i> {message}
              </div>
            )}

            <button type="submit" className={`rp-submit ${status === 'loading' ? 'loading' : ''}`} disabled={status === 'loading'}>
              <span className="spinner"></span>
              <span className="btn-text"><i className="fas fa-key" style={{ fontSize: 13 }}></i> Reset Password</span>
            </button>
          </form>
        )}

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link to="/user/login" style={{ color: '#6366f1', fontSize: 13, textDecoration: 'none', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i className="fas fa-arrow-left" style={{ fontSize: 11 }}></i> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
