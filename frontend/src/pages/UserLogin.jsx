import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/api'

export default function UserLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.userLogin(email, password)
      if (data.status === 'success') {
        localStorage.setItem('mdefender_user_token', data.token)
        navigate('/user/dashboard')
      } else {
        setError(data.message || 'Invalid credentials')
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
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: '#0f172a',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <style>{`
        body::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
          background: radial-gradient(ellipse at 20% 50%, rgba(102,126,234,0.12) 0%, transparent 50%),
                      radial-gradient(ellipse at 80% 20%, rgba(16,185,129,0.08) 0%, transparent 50%),
                      radial-gradient(ellipse at 50% 80%, rgba(118,75,162,0.1) 0%, transparent 50%);
          animation: bgShift 20s ease-in-out infinite alternate; pointer-events: none; z-index: 0; }
        @keyframes bgShift { 0% { transform: translate(0,0) rotate(0deg); } 100% { transform: translate(2%,2%) rotate(3deg); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .ulogin-card { background: #ffffff; border-radius: 20px; padding: 44px 36px 36px; box-shadow: 0 25px 80px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.06); width: 100%; max-width: 420px; position: relative; z-index: 1; animation: fadeInUp 0.6s ease forwards; }
        .ulogin-header { text-align: center; margin-bottom: 32px; }
        .ulogin-header .logo-wrap { width: 64px; height: 64px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; box-shadow: 0 8px 24px rgba(102,126,234,0.3); }
        .ulogin-header .logo-wrap i { font-size: 30px; color: white; }
        .ulogin-header h1 { color: #0f172a; font-size: 24px; font-weight: 700; letter-spacing: -0.3px; }
        .ulogin-header p { color: #64748b; font-size: 13px; margin-top: 4px; font-weight: 400; }
        .ulogin-form .form-group { margin-bottom: 20px; position: relative; }
        .ulogin-form .form-group .input-icon { position: absolute; left: 14px; top: 38px; color: #94a3b8; font-size: 15px; pointer-events: none; transition: color 0.2s; }
        .ulogin-form .form-group:focus-within .input-icon { color: #667eea; }
        .ulogin-form label { display: block; margin-bottom: 6px; color: #475569; font-weight: 500; font-size: 13px; }
        .ulogin-form input[type="email"], .ulogin-form input[type="password"] {
          width: 100%; padding: 12px 14px 12px 40px; border: 2px solid #e2e8f0; border-radius: 10px;
          font-size: 14px; transition: all 0.25s; box-sizing: border-box; background: #f8fafc;
          color: #0f172a; font-family: inherit;
        }
        .ulogin-form input::placeholder { color: #94a3b8; font-size: 13px; }
        .ulogin-form input:focus { outline: none; border-color: #667eea; background: white; box-shadow: 0 0 0 4px rgba(102,126,234,0.1); }
        .btn-ulogin {
          width: 100%; padding: 13px; background: linear-gradient(135deg, #667eea, #764ba2);
          color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 600;
          cursor: pointer; transition: all 0.25s; display: flex; align-items: center;
          justify-content: center; gap: 8px; position: relative; overflow: hidden;
        }
        .btn-ulogin::after { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%); transform: translateX(-100%); transition: transform 0.6s; }
        .btn-ulogin:hover::after { transform: translateX(100%); }
        .btn-ulogin:hover { transform: translateY(-1px); box-shadow: 0 8px 30px rgba(102,126,234,0.35); }
        .btn-ulogin:active { transform: translateY(0); }
        .btn-ulogin.loading { pointer-events: none; opacity: 0.8; }
        .btn-ulogin .spinner { display: none; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
        .btn-ulogin.loading .spinner { display: inline-block; }
        .btn-ulogin.loading .btn-text { display: none; }
        .ulogin-error { display: none; background: #fef2f2; color: #dc2626; padding: 12px 14px; border-radius: 10px; margin-top: 16px; text-align: center; font-size: 13px; font-weight: 500; border: 1px solid #fecaca; align-items: center; justify-content: center; gap: 8px; }
        .ulogin-error.show { display: flex; }
        .ulogin-footer { text-align: center; margin-top: 24px; color: #94a3b8; font-size: 13px; }
        .ulogin-footer a { color: #667eea; text-decoration: none; font-weight: 600; }
        .ulogin-footer a:hover { text-decoration: underline; }
        .success-msg { display: none; background: #f0fdf4; color: #16a34a; padding: 12px 14px; border-radius: 10px; margin-top: 16px; text-align: center; font-size: 13px; font-weight: 500; border: 1px solid #bbf7d0; align-items: center; justify-content: center; gap: 8px; }
        .success-msg.show { display: flex; }
        @media (max-width: 480px) {
          .ulogin-card { padding: 28px 20px !important; }
        }
      `}</style>

      <div className="ulogin-card">
        <div className="ulogin-header">
          <div className="logo-wrap">
            <i className="fas fa-shield-halved"></i>
          </div>
          <h1>Welcome Back</h1>
          <p>Sign in to your MDefender Pro account</p>
        </div>
        <form onSubmit={handleSubmit} className="ulogin-form" autoComplete="off">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <i className="fas fa-envelope input-icon"></i>
            <input type="email" id="email" placeholder="Enter your email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <i className="fas fa-lock input-icon"></i>
            <input type="password" id="password" placeholder="Enter your password" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button type="submit" className={`btn-ulogin ${loading ? 'loading' : ''}`}>
            <span className="spinner"></span>
            <span className="btn-text"><i className="fas fa-arrow-right-to-bracket"></i> Sign In</span>
          </button>
          <div className={`ulogin-error ${error ? 'show' : ''}`}>
            <i className="fas fa-circle-exclamation"></i>
            <span>{error}</span>
          </div>
          <div className={`success-msg ${window.location.search.includes('registered=true') ? 'show' : ''}`}>
            <i className="fas fa-check-circle"></i>
            <span>Account created successfully! Please sign in.</span>
          </div>
        </form>
        <div className="ulogin-footer">
          Don&apos;t have an account? <Link to="/register">Create one</Link>
        </div>
        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <Link to="/" style={{ color: '#64748b', fontSize: '12px', textDecoration: 'none' }}>
            <i className="fas fa-arrow-left" style={{ marginRight: '4px' }}></i> Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
