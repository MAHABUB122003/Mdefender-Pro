import { useState } from 'react'
import api from '../api/api'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.login(username, password)
      if (data.status === 'success') {
        onLogin(data.token)
      } else {
        setError(data.message || 'Invalid credentials')
      }
    } catch (err) {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', background: '#0f172a', position: 'relative', overflow: 'hidden',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      <style>{`
        body::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
          background: radial-gradient(ellipse at 20% 50%, rgba(37,99,235,0.12) 0%, transparent 50%),
                      radial-gradient(ellipse at 80% 20%, rgba(16,185,129,0.08) 0%, transparent 50%),
                      radial-gradient(ellipse at 50% 80%, rgba(99,102,241,0.1) 0%, transparent 50%);
          animation: bgShift 20s ease-in-out infinite alternate; pointer-events: none; z-index: 0; }
        @keyframes bgShift { 0% { transform: translate(0,0) rotate(0deg); } 100% { transform: translate(2%,2%) rotate(3deg); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .login-card { background: #ffffff; border-radius: 20px; padding: 44px 36px 36px; box-shadow: 0 25px 80px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.06); width: 100%; max-width: 420px; position: relative; z-index: 1; animation: fadeInUp 0.6s ease forwards; }
        .login-header { text-align: center; margin-bottom: 32px; }
        .login-header .logo-wrap { width: 64px; height: 64px; background: linear-gradient(135deg, #2563eb, #3b82f6); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; box-shadow: 0 8px 24px rgba(37,99,235,0.3); }
        .login-header .logo-wrap i { font-size: 30px; color: white; }
        .login-header h1 { color: #0f172a; font-size: 24px; font-weight: 700; letter-spacing: -0.3px; }
        .login-header p { color: #64748b; font-size: 13px; margin-top: 4px; font-weight: 400; }
        .login-form .form-group { margin-bottom: 20px; position: relative; }
        .login-form .form-group .input-icon { position: absolute; left: 14px; top: 38px; color: #94a3b8; font-size: 15px; pointer-events: none; transition: color 0.2s; }
        .login-form .form-group:focus-within .input-icon { color: #2563eb; }
        .login-form label { display: block; margin-bottom: 6px; color: #475569; font-weight: 500; font-size: 13px; }
        .login-form input[type="text"], .login-form input[type="password"] {
          width: 100%; padding: 12px 14px 12px 40px; border: 2px solid #e2e8f0; border-radius: 10px;
          font-size: 14px; transition: all 0.25s; box-sizing: border-box; background: #f8fafc;
          color: #0f172a; font-family: inherit;
        }
        .login-form input::placeholder { color: #94a3b8; font-size: 13px; }
        .login-form input:focus { outline: none; border-color: #2563eb; background: white; box-shadow: 0 0 0 4px rgba(37,99,235,0.1); }
        .login-form .form-options { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .login-form .checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; color: #64748b; font-size: 13px; font-weight: 500; user-select: none; }
        .login-form .checkbox-label input[type="checkbox"] { width: 16px; height: 16px; accent-color: #2563eb; border-radius: 4px; cursor: pointer; }
        .login-form .forgot-link { font-size: 13px; color: #2563eb; text-decoration: none; font-weight: 500; transition: color 0.2s; }
        .login-form .forgot-link:hover { color: #1d4ed8; text-decoration: underline; }
        .btn-login {
          width: 100%; padding: 13px; background: linear-gradient(135deg, #2563eb, #3b82f6);
          color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 600;
          cursor: pointer; transition: all 0.25s; display: flex; align-items: center;
          justify-content: center; gap: 8px; position: relative; overflow: hidden;
        }
        .btn-login::after { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%); transform: translateX(-100%); transition: transform 0.6s; }
        .btn-login:hover::after { transform: translateX(100%); }
        .btn-login:hover { transform: translateY(-1px); box-shadow: 0 8px 30px rgba(37,99,235,0.35); }
        .btn-login:active { transform: translateY(0); }
        .btn-login.loading { pointer-events: none; opacity: 0.8; }
        .btn-login .spinner { display: none; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
        .btn-login.loading .spinner { display: inline-block; }
        .btn-login.loading .btn-text { display: none; }
        .error-message { display: none; background: #fef2f2; color: #dc2626; padding: 12px 14px; border-radius: 10px; margin-top: 16px; text-align: center; font-size: 13px; font-weight: 500; border: 1px solid #fecaca; align-items: center; justify-content: center; gap: 8px; }
        .error-message.show { display: flex; }
        .login-footer { text-align: center; margin-top: 24px; color: #94a3b8; font-size: 12px; }
        .login-footer a { color: #64748b; text-decoration: none; }
        .login-footer a:hover { color: #2563eb; }
      `}</style>
      <div className="login-card">
        <div className="login-header">
          <div className="logo-wrap">
            <i className="fas fa-shield-halved"></i>
          </div>
          <h1>MDefender Pro</h1>
          <p>Web Application Firewall Admin Panel</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form" autoComplete="off">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <i className="fas fa-user input-icon"></i>
            <input type="text" id="username" placeholder="Enter your username" required autoFocus value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <i className="fas fa-lock input-icon"></i>
            <input type="password" id="password" placeholder="Enter your password" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button type="submit" className={`btn-login ${loading ? 'loading' : ''}`}>
            <span className="spinner"></span>
            <span className="btn-text"><i className="fas fa-arrow-right-to-bracket"></i> Sign In</span>
          </button>
          <div className="form-options">
            <label className="checkbox-label">
              <input type="checkbox" defaultChecked />
              Remember me
            </label>
            <a href="#" className="forgot-link">Forgot password?</a>
          </div>
          <div className={`error-message ${error ? 'show' : ''}`}>
            <i className="fas fa-circle-exclamation"></i>
            <span>{error}</span>
          </div>
        </form>
        <div className="login-footer">
          &copy; 2026 MDefender Pro &mdash; <a href="/connect">Secure your website</a>
        </div>
      </div>
    </div>
  )
}
