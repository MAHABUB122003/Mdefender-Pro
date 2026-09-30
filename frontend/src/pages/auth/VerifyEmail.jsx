import { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import theme from '../../utils/theme'
import api from '../../api/api'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { dark } = useTheme()
  const s = theme(dark)

  const [status, setStatus] = useState('initializing') // 'initializing', 'verifying', 'success', 'error', 'waiting_manual'
  const [message, setMessage] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [redirectCountdown, setRedirectCountdown] = useState(3)

  const token = searchParams.get('token') || searchParams.get('dev_token') || ''
  const email = searchParams.get('email') || ''
  const hasAttemptedRef = useRef(false)

  // Auto-verification on page load if token is present
  useEffect(() => {
    if (token && !hasAttemptedRef.current) {
      hasAttemptedRef.current = true
      performAutoVerification(token)
    } else if (!token) {
      setStatus('waiting_manual')
    }
  }, [token])

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  // Redirect countdown when verified successfully
  useEffect(() => {
    if (status !== 'success') return
    if (redirectCountdown <= 0) {
      navigate('/user/login?verified=true')
      return
    }
    const t = setTimeout(() => setRedirectCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [status, redirectCountdown, navigate])

  const performAutoVerification = async (verifyToken) => {
    setStatus('verifying')
    setLoading(true)

    // Small intentional smooth UX delay (600ms) for cybersecurity scan feeling
    await new Promise(r => setTimeout(r, 600))

    try {
      const data = await api.verifyEmail(verifyToken)
      setStatus('success')
      setMessage(data.message || 'Email verified successfully! Your account is now fully protected.')
    } catch (err) {
      setStatus('error')
      const msg = err.message || 'Invalid or expired verification link.'
      if (msg.includes('expired')) {
        setMessage('This verification link has expired. Please request a fresh one below.')
      } else if (msg.includes('already been used')) {
        setMessage('This link has already been used. You can proceed to log in directly.')
      } else if (msg.includes('Too many')) {
        setMessage('Too many failed attempts. Please wait a few minutes before retrying.')
        setCooldown(120)
      } else {
        setMessage(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email || cooldown > 0 || loading) return
    setLoading(true)
    try {
      const data = await api.resendVerification(email)
      setMessage(data.message || 'New verification email sent! Please check your inbox.')
      setCooldown(90)
    } catch (err) {
      const msg = err.message || 'Failed to resend verification email.'
      setMessage(msg)
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
      padding: 20,
      background: dark ? '#0a0e1a' : '#f8fafc',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      <style>{`
        @keyframes fadeSlideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes pulseGlow { 0%, 100% { opacity:0.3; transform:scale(1); } 50% { opacity:0.6; transform:scale(1.05); } }
        @keyframes checkPop { 0% { transform:scale(0); } 70% { transform:scale(1.15); } 100% { transform:scale(1); } }
        @keyframes scanSweep { 0% { top: 0%; opacity: 0.8; } 100% { top: 100%; opacity: 0.2; } }

        .v-card {
          border-radius: 20px;
          width: 100%;
          max-width: 440px;
          background: ${dark ? 'rgba(15, 23, 42, 0.92)' : '#ffffff'};
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
          box-shadow: ${dark ? '0 20px 50px rgba(0,0,0,0.6)' : '0 10px 40px rgba(0,0,0,0.06)'};
          animation: fadeSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards;
          position: relative;
          z-index: 2;
          overflow: hidden;
          text-align: center;
          padding: 44px 36px 36px;
        }

        .btn-action {
          width: 100%;
          padding: 13px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: none;
          text-decoration: none;
        }
        .btn-action.primary {
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          color: #ffffff;
          box-shadow: 0 4px 16px rgba(99,102,241,0.35);
        }
        .btn-action.primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(99,102,241,0.45);
        }
        .btn-action.success {
          background: linear-gradient(135deg, #10b981, #059669);
          color: #ffffff;
          box-shadow: 0 4px 16px rgba(16,185,129,0.35);
        }
        .btn-action.success:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(16,185,129,0.45);
        }
        .btn-action:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>

      {/* Decorative Glow */}
      <div style={{
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
        top: '-100px',
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        animation: 'pulseGlow 6s ease-in-out infinite'
      }}></div>

      <div className="v-card">
        {/* Logo */}
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 26 }}>
          <div style={{
            width: 36,
            height: 36,
            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
          }}>
            <i className="fas fa-shield-halved" style={{ fontSize: 16, color: '#fff' }}></i>
          </div>
          <span style={{ fontSize: 17, fontWeight: 800, color: s.text, letterSpacing: '-0.3px' }}>MDefender Pro</span>
        </Link>

        {/* ================= 1. VERIFYING IN PROGRESS (AUTO-VERIFY) ================= */}
        {(status === 'initializing' || status === 'verifying') && (
          <div>
            <div style={{
              width: 76,
              height: 76,
              borderRadius: 22,
              background: dark ? 'rgba(99,102,241,0.12)' : '#eef2ff',
              border: '1.5px solid rgba(99,102,241,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 22px',
              position: 'relative'
            }}>
              <i className="fas fa-shield-halved" style={{ fontSize: 32, color: '#6366f1' }}></i>
              <div style={{
                position: 'absolute',
                inset: -5,
                borderRadius: 26,
                border: '2px solid #6366f1',
                borderTopColor: 'transparent',
                animation: 'spin 1s linear infinite'
              }}></div>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 6,
              background: dark ? 'rgba(99,102,241,0.15)' : '#eef2ff',
              color: '#6366f1',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: 12
            }}>
              <i className="fas fa-key"></i> HMAC-SHA256 Token Validation
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 800, color: s.text, letterSpacing: '-0.4px', marginBottom: 8 }}>
              Verifying Security Identity
            </h1>
            <p style={{ fontSize: 13.5, color: s.textSecondary, lineHeight: 1.6, margin: 0 }}>
              Authenticating your verification token and arming zero-trust protection...
            </p>
          </div>
        )}

        {/* ================= 2. SUCCESS STATE ================= */}
        {status === 'success' && (
          <div>
            <div style={{
              width: 76,
              height: 76,
              borderRadius: 22,
              background: dark ? 'rgba(16,185,129,0.12)' : '#ecfdf5',
              border: '1.5px solid rgba(16,185,129,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              animation: 'checkPop 0.5s ease-out'
            }}>
              <i className="fas fa-check" style={{ fontSize: 34, color: '#10b981' }}></i>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 20,
              background: dark ? 'rgba(16,185,129,0.15)' : '#ecfdf5',
              border: `1px solid ${dark ? 'rgba(16,185,129,0.3)' : '#a7f3d0'}`,
              color: '#10b981',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: 12
            }}>
              <i className="fas fa-shield-check"></i> Account Verified & Protected
            </div>

            <h1 style={{ fontSize: 23, fontWeight: 800, color: s.text, letterSpacing: '-0.4px', marginBottom: 8 }}>
              Email Confirmed!
            </h1>
            <p style={{ fontSize: 13.5, color: s.textSecondary, lineHeight: 1.6, marginBottom: 24 }}>
              {message}
            </p>

            <Link to="/user/login?verified=true" className="btn-action success">
              <span>Continue to Dashboard</span>
              <i className="fas fa-arrow-right" style={{ fontSize: 12 }}></i>
            </Link>

            <div style={{ fontSize: 12, color: s.textSecondary, marginTop: 14 }}>
              Auto-redirecting in <strong style={{ color: '#10b981' }}>{redirectCountdown}s</strong>...
            </div>
          </div>
        )}

        {/* ================= 3. ERROR / EXPIRED LINK STATE ================= */}
        {status === 'error' && (
          <div>
            <div style={{
              width: 76,
              height: 76,
              borderRadius: 22,
              background: dark ? 'rgba(239,68,68,0.12)' : '#fef2f2',
              border: '1.5px solid rgba(239,68,68,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <i className="fas fa-xmark" style={{ fontSize: 34, color: '#ef4444' }}></i>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 20,
              background: dark ? 'rgba(239,68,68,0.15)' : '#fef2f2',
              border: `1px solid ${dark ? 'rgba(239,68,68,0.3)' : '#fecaca'}`,
              color: '#ef4444',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: 12
            }}>
              <i className="fas fa-triangle-exclamation"></i> Link Expired or Invalid
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 800, color: s.text, letterSpacing: '-0.4px', marginBottom: 8 }}>
              Verification Failed
            </h1>
            <p style={{ fontSize: 13.5, color: s.textSecondary, lineHeight: 1.6, marginBottom: 24 }}>
              {message}
            </p>

            {email && (
              <button
                onClick={handleResend}
                disabled={cooldown > 0 || loading}
                className="btn-action primary"
                style={{ marginBottom: 12 }}
              >
                <i className="fas fa-paper-plane" style={{ fontSize: 13 }}></i>
                <span>{cooldown > 0 ? `Resend available in ${cooldown}s` : 'Send Fresh Verification Link'}</span>
              </button>
            )}

            <Link to="/user/login" style={{
              display: 'inline-block',
              fontSize: 13,
              fontWeight: 600,
              color: '#6366f1',
              textDecoration: 'none',
              marginTop: 10
            }}>
              <i className="fas fa-arrow-left" style={{ marginRight: 6 }}></i>
              Return to Sign In
            </Link>
          </div>
        )}

        {/* ================= 4. WAITING / MANUAL VISIT ================= */}
        {status === 'waiting_manual' && (
          <div>
            <div style={{
              width: 76,
              height: 76,
              borderRadius: 22,
              background: dark ? 'rgba(99,102,241,0.12)' : '#eef2ff',
              border: '1.5px solid rgba(99,102,241,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <i className="fas fa-envelope-circle-check" style={{ fontSize: 32, color: '#6366f1' }}></i>
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 800, color: s.text, letterSpacing: '-0.4px', marginBottom: 8 }}>
              Check Your Email Inbox
            </h1>
            <p style={{ fontSize: 13.5, color: s.textSecondary, lineHeight: 1.6, marginBottom: 20 }}>
              Please click the confirmation link sent to your email to automatically activate your protected account.
            </p>

            {email && (
              <div style={{
                padding: '10px 16px',
                borderRadius: 10,
                background: dark ? 'rgba(255,255,255,0.04)' : '#f1f5f9',
                border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                fontSize: 14,
                fontWeight: 600,
                color: '#6366f1',
                marginBottom: 20
              }}>
                {email}
              </div>
            )}

            {email && (
              <button
                onClick={handleResend}
                disabled={cooldown > 0 || loading}
                className="btn-action primary"
                style={{ marginBottom: 12 }}
              >
                <span>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Verification Link'}</span>
              </button>
            )}

            <div style={{ marginTop: 16 }}>
              <Link to="/user/login" style={{ color: '#6366f1', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
                <i className="fas fa-arrow-left" style={{ marginRight: 6 }}></i> Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
