import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/api'

export default function Register() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!name || !email || !password || !confirmPassword) {
      setError('All fields are required')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const data = await api.register({ name, email, password })
      if (data.status === 'success') {
        navigate('/user/login?registered=true')
      } else {
        setError(data.message || 'Registration failed')
      }
    } catch (err) {
      setError(err.message || 'Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#0f172a',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }} className="reg-container">
      <style>{`
        body::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
          background: radial-gradient(ellipse at 20% 50%, rgba(37,99,235,0.12) 0%, transparent 50%),
                      radial-gradient(ellipse at 80% 20%, rgba(16,185,129,0.08) 0%, transparent 50%),
                      radial-gradient(ellipse at 50% 80%, rgba(99,102,241,0.1) 0%, transparent 50%);
          pointer-events: none; z-index: 0; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .reg-card { background: #ffffff; border-radius: 20px; padding: 44px 36px 36px; box-shadow: 0 25px 80px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.06); width: 100%; max-width: 420px; position: relative; z-index: 1; animation: fadeInUp 0.6s ease forwards; }
        .reg-form .form-group { margin-bottom: 20px; position: relative; }
        .reg-form .input-icon { position: absolute; left: 14px; top: 38px; color: #94a3b8; font-size: 15px; pointer-events: none; transition: color 0.2s; }
        .reg-form .form-group:focus-within .input-icon { color: #2563eb; }
        .reg-form label { display: block; margin-bottom: 6px; color: #475569; font-weight: 500; font-size: 13px; }
        .reg-form input[type="text"], .reg-form input[type="email"], .reg-form input[type="password"] {
          width: 100%; padding: 12px 14px 12px 40px; border: 2px solid #e2e8f0; border-radius: 10px;
          font-size: 14px; transition: all 0.25s; box-sizing: border-box; background: #f8fafc;
          color: #0f172a; font-family: inherit;
        }
        .reg-form input::placeholder { color: #94a3b8; font-size: 13px; }
        .reg-form input:focus { outline: none; border-color: #2563eb; background: white; box-shadow: 0 0 0 4px rgba(37,99,235,0.1); }
        .btn-register {
          width: 100%; padding: 13px; background: linear-gradient(135deg, #2563eb, #3b82f6);
          color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 600;
          cursor: pointer; transition: all 0.25s; display: flex; align-items: center;
          justify-content: center; gap: 8px; position: relative; overflow: hidden;
        }
        .btn-register:hover { transform: translateY(-1px); box-shadow: 0 8px 30px rgba(37,99,235,0.35); }
        .btn-register:active { transform: translateY(0); }
        .btn-register.loading { pointer-events: none; opacity: 0.8; }
        .btn-register .spinner { display: none; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
        .btn-register.loading .spinner { display: inline-block; }
        .btn-register.loading .btn-text { display: none; }
        .error-msg { display: none; background: #fef2f2; color: #dc2626; padding: 12px 14px; border-radius: 10px; margin-top: 16px; text-align: center; font-size: 13px; font-weight: 500; border: 1px solid #fecaca; align-items: center; justify-content: center; gap: 8px; }
        .error-msg.show { display: flex; }
        .login-link { text-align: center; margin-top: 20px; color: #94a3b8; font-size: 13px; }
        .login-link a { color: #2563eb; text-decoration: none; font-weight: 600; }
        .login-link a:hover { text-decoration: underline; }
        @media (max-width: 768px) {
          .reg-container { flex-direction: column !important; }
          .reg-left { padding: 40px 20px !important; min-height: auto !important; }
          .reg-left h1 { font-size: 24px !important; }
          .reg-right { padding: 24px 20px !important; }
          .reg-card { max-width: 100% !important; padding: 28px 20px !important; }
        }
      `}</style>

      {/* Left branding panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px',
        background: 'linear-gradient(135deg, rgba(102,126,234,0.15), rgba(118,75,162,0.15))',
        position: 'relative',
      }} className="reg-left">
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '400px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            margin: '0 auto 32px',
            boxShadow: '0 12px 40px rgba(102,126,234,0.4)',
          }}>
            <i className="fas fa-shield-halved" style={{ color: '#fff' }}></i>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#fff', marginBottom: '16px', letterSpacing: '-0.5px' }}>
            MDefender Pro
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: '1.7' }}>
            Join hundreds of websites protected by AI-powered WAF security. Get started in minutes.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        position: 'relative',
      }} className="reg-right">
        <div className="reg-card">
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ color: '#0f172a', fontSize: '24px', fontWeight: '700' }}>Create Account</h2>
            <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>Start protecting your website today</p>
          </div>
          <form onSubmit={handleSubmit} className="reg-form" autoComplete="off">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <i className="fas fa-user input-icon"></i>
              <input type="text" id="name" placeholder="Enter your full name" required autoFocus value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <i className="fas fa-envelope input-icon"></i>
              <input type="email" id="email" placeholder="Enter your email" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <i className="fas fa-lock input-icon"></i>
              <input type="password" id="password" placeholder="Create a password" required value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <i className="fas fa-lock input-icon"></i>
              <input type="password" id="confirmPassword" placeholder="Confirm your password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>
            <button type="submit" className={`btn-register ${loading ? 'loading' : ''}`}>
              <span className="spinner"></span>
              <span className="btn-text"><i className="fas fa-user-plus"></i> Create Account</span>
            </button>
            <div className={`error-msg ${error ? 'show' : ''}`}>
              <i className="fas fa-circle-exclamation"></i>
              <span>{error}</span>
            </div>
          </form>
          <div className="login-link">
            Already have an account? <Link to="/user/login">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
