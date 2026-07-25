import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import theme from '../../utils/theme'
import api from '../../api/api'

export default function ForgotPassword() {
  const { dark } = useTheme()
  const s = theme(dark)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('loading')
    try {
      const data = await api.forgotPassword(email)
      setStatus('success')
      setMessage(data.message || 'Password reset link sent!')
    } catch (err) {
      setStatus('error')
      setMessage(err.message || 'Something went wrong')
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
        .fp-card { border-radius: 16px; padding: 40px 36px 36px; box-shadow: ${dark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.04)'}; border: 1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}; width: 100%; max-width: 420px; animation: fadeSlideIn 0.5s ease forwards; background: ${dark ? '#1e293b' : '#fff'}; }
        .fp-card input:focus { outline: none; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); background: ${dark ? '#0f172a' : '#fff'} !important; }
        .fp-card input::placeholder { color: ${dark ? '#334155' : '#94a3b8'}; font-size: 13px; }
        .fp-submit {
          width: 100%; padding: 13px; background: linear-gradient(135deg, #4f46e5, #6366f1);
          color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.2s; display: flex; align-items: center;
          justify-content: center; gap: 8px; letter-spacing: 0.01em;
        }
        .fp-submit:hover { box-shadow: 0 4px 16px rgba(99,102,241,0.35); transform: translateY(-1px); }
        .fp-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .fp-submit .spinner { display: none; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
        .fp-submit.loading .spinner { display: inline-block; }
        .fp-submit.loading .btn-text { display: none; }
      `}</style>

      <div className="fp-card">
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
                <i className="fas fa-envelope-open-text" style={{ fontSize: 22, color: '#10b981' }}></i>
              </div>
              <h2 style={{ color: s.text, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Check your email</h2>
              <p style={{ color: dark ? '#64748b' : '#64748b', fontSize: 14, marginBottom: 24 }}>{message}</p>
              <Link to="/user/login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 14px', textDecoration: 'none', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 600 }}>
                <i className="fas fa-arrow-left"></i> Back to Sign In
              </Link>
            </>
          ) : (
            <>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: dark ? 'rgba(99,102,241,0.1)' : '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <i className="fas fa-key" style={{ fontSize: 22, color: '#6366f1' }}></i>
              </div>
              <h2 style={{ color: s.text, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Forgot your password?</h2>
              <p style={{ color: dark ? '#64748b' : '#64748b', fontSize: 14, marginBottom: 4 }}>Enter your email and we&apos;ll send you a reset link.</p>
            </>
          )}
        </div>

        {status !== 'success' && (
          <form onSubmit={handleSubmit} autoComplete="off">
            <div style={{ position: 'relative', marginBottom: 18 }}>
              <label style={{ display: 'block', marginBottom: 6, color: dark ? '#94a3b8' : '#475569', fontWeight: 500, fontSize: 13 }}>Email Address</label>
              <i className="fas fa-envelope" style={{ position: 'absolute', left: 14, top: 38, color: dark ? '#475569' : '#94a3b8', fontSize: 14, pointerEvents: 'none' }}></i>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email" required style={inputStyle} />
            </div>

            {status === 'error' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13, fontWeight: 500, background: dark ? 'rgba(239,68,68,0.08)' : '#fef2f2', color: '#ef4444', border: `1px solid ${dark ? 'rgba(239,68,68,0.15)' : '#fecaca'}` }}>
                <i className="fas fa-exclamation-circle" style={{ fontSize: 13 }}></i> {message}
              </div>
            )}

            <button type="submit" className={`fp-submit ${status === 'loading' ? 'loading' : ''}`} disabled={status === 'loading'}>
              <span className="spinner"></span>
              <span className="btn-text">Send Reset Link</span>
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
