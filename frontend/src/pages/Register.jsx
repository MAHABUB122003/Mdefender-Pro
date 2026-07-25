import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import theme from '../utils/theme'
import api from '../api/api'

export default function Register() {
  const navigate = useNavigate()
  const { dark } = useTheme()
  const s = theme(dark)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const validatePassword = (pw) => {
    const errs = []
    if (pw.length < 12) errs.push('At least 12 characters')
    if (!/[A-Z]/.test(pw)) errs.push('One uppercase letter')
    if (!/[a-z]/.test(pw)) errs.push('One lowercase letter')
    if (!/\d/.test(pw)) errs.push('One number')
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw)) errs.push('One special character')
    return errs
  }

  const passwordErrors = validatePassword(password)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!fullName || !email || !password || !confirmPassword) {
      setError('All required fields must be filled')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (passwordErrors.length > 0) {
      setError('Password does not meet security requirements')
      return
    }
    setLoading(true)
    try {
      const data = await api.register({
        full_name: fullName,
        username: username || undefined,
        email,
        password,
        confirm_password: confirmPassword,
      })
      if (data.status === 'success') {
        navigate('/auth/verify-email?registered=true&email=' + encodeURIComponent(email))
      } else {
        setError(data.message || data.detail || 'Registration failed')
      }
    } catch (err) {
      setError(err.message || 'Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '13px 14px 13px 42px',
    border: `1.5px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`, borderRadius: 10,
    fontSize: 14, transition: 'all 0.2s', boxSizing: 'border-box',
    background: dark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
    color: s.text, fontFamily: 'inherit', outline: 'none',
  }

  const focusStyle = '0 0 0 3px rgba(99,102,241,0.15)'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: dark ? '#0f172a' : '#f8fafc', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }} className="reg-container">
      <style>{`
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .reg-card { border-radius: 16px; padding: 40px 36px 36px; box-shadow: ${dark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.04)'}; border: 1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}; width: 100%; max-width: 440px; position: relative; z-index: 1; animation: fadeSlideIn 0.5s ease forwards; background: ${dark ? '#1e293b' : '#fff'}; }
        .reg-card .field-wrap { position: relative; margin-bottom: 18px; }
        .reg-card .field-wrap label { display: block; margin-bottom: 6px; color: ${dark ? '#94a3b8' : '#475569'}; font-weight: 500; font-size: 13px; letter-spacing: 0.01em; }
        .reg-card .field-wrap .icon { position: absolute; left: 14px; top: 38px; color: ${dark ? '#475569' : '#94a3b8'}; font-size: 14px; pointer-events: none; transition: color 0.2s; }
        .reg-card .field-wrap:focus-within .icon { color: #6366f1; }
        .reg-card input:focus { outline: none; border-color: #6366f1 !important; box-shadow: ${focusStyle}; background: ${dark ? '#0f172a' : '#fff'} !important; }
        .reg-card input::placeholder { color: ${dark ? '#334155' : '#94a3b8'}; font-size: 13px; }
        .reg-submit {
          width: 100%; padding: 13px; background: linear-gradient(135deg, #4f46e5, #6366f1);
          color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.2s; display: flex; align-items: center;
          justify-content: center; gap: 8px; margin-top: 6px; letter-spacing: 0.01em;
        }
        .reg-submit:hover { box-shadow: 0 4px 16px rgba(99,102,241,0.35); transform: translateY(-1px); }
        .reg-submit:active { transform: translateY(0); }
        .reg-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .reg-submit .spinner { display: none; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
        .reg-submit.loading .spinner { display: inline-block; }
        .reg-submit.loading .btn-text { display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .pw-bar { height: 4px; border-radius: 2px; background: ${dark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}; margin-top: 8px; overflow: hidden; }
        .pw-bar-fill { height: 100%; border-radius: 2px; transition: all 0.3s ease; }
        .pw-req { font-size: 11px; padding: 1.5px 0; display: flex; align-items: center; gap: 5px; }
        .pw-req-ok { color: #10b981; }
        .pw-req-fail { color: ${dark ? '#64748b' : '#94a3b8'}; }
        .sec-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 500; background: ${dark ? 'rgba(16,185,129,0.08)' : '#f0fdf4'}; color: #10b981; border: 1px solid ${dark ? 'rgba(16,185,129,0.15)' : '#bbf7d0'}; }
        @media (max-width: 768px) {
          .reg-container { flex-direction: column !important; }
          .reg-left { padding: 32px 20px !important; min-height: auto !important; }
          .reg-right { padding: 20px 16px !important; }
          .reg-card { max-width: 100% !important; padding: 28px 20px !important; }
        }
      `}</style>

      <div className="reg-left" style={{
        flex: '0 0 420px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        padding: '48px 40px', background: dark
          ? 'linear-gradient(160deg, rgba(79,70,229,0.12), rgba(99,102,241,0.05))'
          : 'linear-gradient(160deg, rgba(79,70,229,0.06), rgba(99,102,241,0.02))',
        borderRight: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : '#e2e8f0'}`,
        position: 'relative',
      }}>
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'left', maxWidth: 320 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 32 }}>
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #4f46e5, #6366f1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-shield-halved" style={{ fontSize: 16, color: '#fff' }}></i>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: s.text, letterSpacing: '-0.3px' }}>MDefender Pro</span>
          </Link>

          <h1 style={{ fontSize: 26, fontWeight: 800, color: s.text, marginBottom: 12, lineHeight: 1.3, letterSpacing: '-0.5px' }}>
            Start protecting<br />your assets today
          </h1>
          <p style={{ color: dark ? '#64748b' : '#64748b', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
            Enterprise-grade WAF security powered by AI. Deploy in minutes, not months.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: 'fa-bolt', text: 'Real-time threat detection' },
              { icon: 'fa-shield-halved', text: 'Advanced DDoS protection' },
              { icon: 'fa-chart-line', text: 'Detailed analytics dashboard' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: dark ? 'rgba(99,102,241,0.1)' : '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`fas ${f.icon}`} style={{ fontSize: 12, color: '#6366f1' }}></i>
                </div>
                <span style={{ fontSize: 13, color: dark ? '#94a3b8' : '#475569', fontWeight: 500 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="reg-right" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', position: 'relative', overflow: 'auto' }}>
        <div className="reg-card" style={{ maxHeight: '100vh', overflowY: 'auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <span className="sec-badge"><i className="fas fa-lock" style={{ fontSize: 10 }}></i> Encrypted & Secure</span>
            </div>
            <h2 style={{ color: s.text, fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px' }}>Create your account</h2>
            <p style={{ color: dark ? '#64748b' : '#64748b', fontSize: 13, marginTop: 6 }}>Free plan includes 1 website protection</p>
          </div>

          <form onSubmit={handleSubmit} autoComplete="off">
            {[
              { id: 'fullName', type: 'text', label: 'Full Name', placeholder: 'John Doe', icon: 'fa-user', val: fullName, set: setFullName, req: true },
              { id: 'username', type: 'text', label: 'Username', placeholder: 'johndoe (optional)', icon: 'fa-at', val: username, set: setUsername, req: false },
              { id: 'email', type: 'email', label: 'Work Email', placeholder: 'john@company.com', icon: 'fa-envelope', val: email, set: setEmail, req: true },
              { id: 'password', type: 'password', label: 'Password', placeholder: 'Create a strong password', icon: 'fa-lock', val: password, set: setPassword, req: true },
              { id: 'confirmPassword', type: 'password', label: 'Confirm Password', placeholder: 'Re-enter password', icon: 'fa-lock', val: confirmPassword, set: setConfirmPassword, req: true },
            ].map(f => (
              <div key={f.id} className="field-wrap">
                <label htmlFor={f.id}>{f.label}{f.req && ' *'}</label>
                <i className={`fas ${f.icon} icon`}></i>
                <input
                  type={f.type} id={f.id} placeholder={f.placeholder}
                  required={f.req} value={f.val}
                  onChange={e => f.set(e.target.value)}
                  style={inputStyle}
                />
                {f.id === 'password' && password.length > 0 && (
                  <>
                    <div className="pw-bar">
                      <div className="pw-bar-fill" style={{
                        width: `${Math.max(0, 100 - passwordErrors.length * 20)}%`,
                        background: passwordErrors.length === 0 ? '#10b981' : passwordErrors.length <= 2 ? '#f59e0b' : '#ef4444',
                      }}></div>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      {[
                        { label: '12+ chars', ok: password.length >= 12 },
                        { label: 'Uppercase', ok: /[A-Z]/.test(password) },
                        { label: 'Lowercase', ok: /[a-z]/.test(password) },
                        { label: 'Number', ok: /\d/.test(password) },
                        { label: 'Special', ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
                      ].map((r, i) => (
                        <span key={i} className={`pw-req ${r.ok ? 'pw-req-ok' : 'pw-req-fail'}`} style={{ marginRight: 8, display: 'inline-flex' }}>
                          <i className={`fas ${r.ok ? 'fa-check' : 'fa-minus'}`} style={{ fontSize: 8 }}></i> {r.label}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}

            <button type="submit" className={`reg-submit ${loading ? 'loading' : ''}`} disabled={loading}>
              <span className="spinner"></span>
              <span className="btn-text">Create Account</span>
            </button>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, marginTop: 14, fontSize: 13, fontWeight: 500, background: dark ? 'rgba(239,68,68,0.08)' : '#fef2f2', color: '#ef4444', border: `1px solid ${dark ? 'rgba(239,68,68,0.15)' : '#fecaca'}` }}>
                <i className="fas fa-exclamation-circle" style={{ fontSize: 13 }}></i> {error}
              </div>
            )}
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, color: dark ? '#64748b' : '#64748b', fontSize: 13 }}>
            Already have an account? <Link to="/user/login" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
