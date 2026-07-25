import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import theme from '../utils/theme'
import api from '../api/api'

export default function Login() {
  const { dark } = useTheme()
  const s = theme(dark)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.adminLogin(username, password)
      if (data.status === 'success') {
        window.location.href = '/admin/dashboard'
      } else {
        setError(data.message || data.detail || 'Invalid credentials')
      }
    } catch (err) {
      setError(err.message || 'Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, background: s.bg, position: 'relative', overflow: 'hidden',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      transition: 'background 0.3s',
    }}>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .admin-login-card { border-radius: 20px; padding: 44px 36px 36px; box-shadow: ${s.shadow}; border: 1px solid ${s.border}; width: 100%; max-width: 420px; position: relative; z-index: 1; animation: fadeInUp 0.6s ease forwards; background: ${s.bgCard}; }
        .admin-login-card input[type="text"], .admin-login-card input[type="password"] {
          width: 100%; padding: 12px 14px 12px 40px; border: 2px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}; border-radius: 10px;
          font-size: 14px; transition: all 0.25s; box-sizing: border-box; background: ${s.bgInput};
          color: ${s.text}; font-family: inherit;
        }
        .admin-login-card input::placeholder { color: ${s.textMuted}; font-size: 13px; }
        .admin-login-card input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99,102,241,0.1); }
        .admin-login-card label { display: block; margin-bottom: 6px; color: ${s.textSecondary}; font-weight: 500; font-size: 13px; }
        .admin-login-card .input-icon { position: absolute; left: 14px; top: 38px; color: ${s.textMuted}; font-size: 15px; pointer-events: none; transition: color 0.2s; }
        .admin-login-card .input-icon-wrap:focus-within .input-icon { color: #6366f1; }
        .admin-btn-login {
          width: 100%; padding: 13px; background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 600;
          cursor: pointer; transition: all 0.25s; display: flex; align-items: center;
          justify-content: center; gap: 8px; position: relative; overflow: hidden;
        }
        .admin-btn-login:hover { transform: translateY(-1px); box-shadow: 0 8px 30px rgba(99,102,241,0.35); }
        .admin-btn-login.loading { pointer-events: none; opacity: 0.8; }
        .admin-btn-login .spinner { display: none; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
        .admin-btn-login.loading .spinner { display: inline-block; }
        .admin-btn-login.loading .btn-text { display: none; }
        .admin-error { display: none; background: ${dark ? 'rgba(239,68,68,0.1)' : '#fef2f2'}; color: #ef4444; padding: 12px 14px; border-radius: 10px; margin-top: 16px; text-align: center; font-size: 13px; font-weight: 500; border: 1px solid ${dark ? 'rgba(239,68,68,0.2)' : '#fecaca'}; align-items: center; justify-content: center; gap: 8px; }
        .admin-error.show { display: flex; }
      `}</style>

      <div className="admin-login-card">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(99,102,241,0.3)' }}>
            <i className="fas fa-shield-halved" style={{ fontSize: 30, color: '#fff' }}></i>
          </div>
          <h1 style={{ color: s.text, fontSize: 24, fontWeight: 700, letterSpacing: '-0.3px' }}>MDefender Pro</h1>
          <p style={{ color: s.textSecondary, fontSize: 13, marginTop: 4 }}>Admin Panel Login</p>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off">
          <div style={{ marginBottom: 20, position: 'relative' }} className="input-icon-wrap">
            <label htmlFor="username">Username</label>
            <i className="fas fa-user input-icon"></i>
            <input type="text" id="username" placeholder="Enter your username" required autoFocus value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div style={{ marginBottom: 20, position: 'relative' }} className="input-icon-wrap">
            <label htmlFor="password">Password</label>
            <i className="fas fa-lock input-icon"></i>
            <input type="password" id="password" placeholder="Enter your password" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button type="submit" className={`admin-btn-login ${loading ? 'loading' : ''}`}>
            <span className="spinner"></span>
            <span className="btn-text"><i className="fas fa-arrow-right-to-bracket"></i> Sign In</span>
          </button>
          <div className={`admin-error ${error ? 'show' : ''}`}>
            <i className="fas fa-circle-exclamation"></i><span>{error}</span>
          </div>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, color: s.textMuted, fontSize: 12 }}>
          <Link to="/user/login" style={{ color: s.textMuted, textDecoration: 'none' }}>User Login</Link>
          {' · '}
          <Link to="/" style={{ color: s.textMuted, textDecoration: 'none' }}>Home</Link>
        </div>
      </div>
    </div>
  )
}
