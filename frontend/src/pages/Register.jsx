import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import theme from '../utils/theme'
import api from '../api/api'

export default function Register() {
  const navigate = useNavigate()
  const { dark } = useTheme()
  const s = theme(dark)

  // Form States
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Post-Registration "Check Your Inbox" State
  const [registrationComplete, setRegistrationComplete] = useState(false)
  const [verificationToken, setVerificationToken] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  // Password Security Criteria
  const passwordChecks = useMemo(() => [
    { label: '8+ Characters', pass: password.length >= 8 },
    { label: 'Uppercase (A-Z)', pass: /[A-Z]/.test(password) },
    { label: 'Lowercase (a-z)', pass: /[a-z]/.test(password) },
    { label: 'Number (0-9)', pass: /\d/.test(password) },
    { label: 'Special Symbol (!@#...)', pass: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) },
  ], [password])

  const passedCount = passwordChecks.filter(c => c.pass).length
  const strengthPercent = Math.min(100, Math.round((passedCount / 5) * 100))

  const strengthLabel = useMemo(() => {
    if (password.length === 0) return { text: '', color: '#94a3b8' }
    if (passedCount <= 2) return { text: 'Weak', color: '#ef4444' }
    if (passedCount <= 4) return { text: 'Good', color: '#f59e0b' }
    return { text: 'Strong & Secure', color: '#10b981' }
  }, [passedCount, password.length])

  const isPasswordMatch = confirmPassword.length > 0 && password === confirmPassword

  const handleGoogleLogin = async () => {
    try {
      const data = await api.getGoogleAuthUrl()
      if (data.url) window.location.href = data.url
    } catch {
      setError('Google sign-in is not configured')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!fullName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (!agreeTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy.')
      return
    }

    setLoading(true)
    try {
      const data = await api.register({
        full_name: fullName.trim(),
        username: username.trim() || undefined,
        email: email.trim().toLowerCase(),
        password,
        confirm_password: confirmPassword,
      })

      if (data.status === 'success' || data.success) {
        setVerificationToken(data.verification_token || '')
        setRegistrationComplete(true)
        setResendCooldown(60)
      } else {
        setError(data.message || data.detail || 'Registration failed. Please try again.')
      }
    } catch (err) {
      setError(err.message || 'Unable to connect to the authentication server.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || resendLoading) return
    setResendLoading(true)
    setResendMessage('')
    try {
      const data = await api.resendVerification(email.trim().toLowerCase())
      setResendMessage(data.message || 'Fresh confirmation link sent to your inbox!')
      setResendCooldown(60)
      if (data.verification_token) {
        setVerificationToken(data.verification_token)
      }
    } catch (err) {
      setResendMessage(err.message || 'Failed to resend. Please try again in a moment.')
    } finally {
      setResendLoading(false)
    }
  }

  const getEmailProviderUrl = () => {
    const domain = email.split('@')[1]?.toLowerCase() || ''
    if (domain.includes('gmail')) return 'https://mail.google.com'
    if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live')) return 'https://outlook.live.com'
    if (domain.includes('yahoo')) return 'https://mail.yahoo.com'
    if (domain.includes('proton')) return 'https://mail.proton.me'
    return 'https://mail.google.com'
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 14px 12px 42px',
    border: `1.5px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
    borderRadius: 10,
    fontSize: 14,
    transition: 'all 0.2s',
    boxSizing: 'border-box',
    background: dark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
    color: s.text,
    fontFamily: 'inherit',
    outline: 'none',
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '30px 20px',
      background: dark ? '#0a0e1a' : '#f8fafc',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      <style>{`
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseGlow { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.06); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes mailBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }

        .auth-card {
          border-radius: 20px;
          padding: 40px 36px 36px;
          box-shadow: ${dark ? '0 10px 50px rgba(0,0,0,0.6)' : '0 4px 30px rgba(0,0,0,0.06)'};
          border: 1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
          width: 100%;
          max-width: 460px;
          position: relative;
          z-index: 2;
          animation: fadeSlideIn 0.4s ease forwards;
          background: ${dark ? 'rgba(15, 23, 42, 0.92)' : '#ffffff'};
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .field-wrap {
          position: relative;
          margin-bottom: 16px;
        }
        .field-wrap label {
          display: block;
          margin-bottom: 6px;
          color: ${dark ? '#cbd5e1' : '#475569'};
          font-weight: 600;
          font-size: 13px;
        }
        .field-wrap .icon {
          position: absolute;
          left: 14px;
          top: 36px;
          color: ${dark ? '#475569' : '#94a3b8'};
          font-size: 14px;
          pointer-events: none;
          transition: color 0.2s;
        }
        .field-wrap:focus-within .icon {
          color: #6366f1;
        }
        .field-wrap input:focus {
          outline: none;
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.18);
          background: ${dark ? '#0f172a' : '#fff'} !important;
        }

        .auth-submit {
          width: 100%;
          padding: 13px;
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 14.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 16px rgba(99,102,241,0.35);
        }
        .auth-submit:hover:not(:disabled) {
          box-shadow: 0 6px 22px rgba(99,102,241,0.45);
          transform: translateY(-1px);
        }
        .auth-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .auth-submit .spinner {
          display: none;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        .auth-submit.loading .spinner {
          display: inline-block;
        }
        .auth-submit.loading .btn-text {
          display: none;
        }

        .google-btn {
          width: 100%;
          padding: 11px;
          background: ${dark ? 'rgba(255,255,255,0.03)' : '#fff'};
          color: ${dark ? '#e2e8f0' : '#374151'};
          border: 1.5px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .google-btn:hover {
          background: ${dark ? 'rgba(255,255,255,0.06)' : '#f9fafb'};
          border-color: ${dark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'};
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 18px 0;
        }
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
        }
        .divider span {
          font-size: 12px;
          color: ${dark ? '#64748b' : '#94a3b8'};
          font-weight: 500;
        }

        .sec-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          background: ${dark ? 'rgba(16,185,129,0.1)' : '#ecfdf5'};
          color: #10b981;
          border: 1px solid ${dark ? 'rgba(16,185,129,0.2)' : '#a7f3d0'};
        }
      `}</style>

      {/* Background Decorative Glow */}
      <div style={{
        position: 'absolute',
        top: '-100px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0) 70%)',
        pointerEvents: 'none',
        animation: 'pulseGlow 6s ease-in-out infinite'
      }}></div>

      <div className="auth-card">
        {/* ================= STAGE 1: REGISTRATION FORM ================= */}
        {!registrationComplete ? (
          <>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 16 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(99,102,241,0.3)'
                }}>
                  <i className="fas fa-shield-halved" style={{ fontSize: 17, color: '#fff' }}></i>
                </div>
                <span style={{ fontSize: 18, fontWeight: 800, color: s.text, letterSpacing: '-0.3px' }}>MDefender Pro</span>
              </Link>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <span className="sec-badge"><i className="fas fa-lock" style={{ fontSize: 10 }}></i> 256-Bit SSL Encrypted</span>
              </div>

              <h1 style={{ color: s.text, fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px', margin: '0 0 6px 0' }}>
                Create your account
              </h1>
              <p style={{ color: dark ? '#94a3b8' : '#64748b', fontSize: 13, margin: 0 }}>
                Deploy AI Web Defense & DDoS Mitigation in minutes.
              </p>
            </div>

            {/* Google Fast Sign-Up */}
            <button onClick={handleGoogleLogin} className="google-btn" type="button">
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Sign up with Google
            </button>

            <div className="divider"><span>or register with email</span></div>

            <form onSubmit={handleSubmit} autoComplete="off">
              {/* Full Name */}
              <div className="field-wrap">
                <label htmlFor="reg-fullname">Full Name *</label>
                <i className="fas fa-user icon"></i>
                <input
                  type="text"
                  id="reg-fullname"
                  placeholder="e.g. Mahabub Rahman"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Email */}
              <div className="field-wrap">
                <label htmlFor="reg-email">Work Email *</label>
                <i className="fas fa-envelope icon"></i>
                <input
                  type="email"
                  id="reg-email"
                  placeholder="name@company.com"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Password */}
              <div className="field-wrap" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label htmlFor="reg-password" style={{ margin: 0 }}>Password *</label>
                  {password.length > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: strengthLabel.color }}>
                      {strengthLabel.text}
                    </span>
                  )}
                </div>
                <i className="fas fa-lock icon"></i>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="reg-password"
                  placeholder="Create a secure password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: 35, background: 'none', border: 'none', color: dark ? '#64748b' : '#94a3b8', cursor: 'pointer', fontSize: 13 }}
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>

              {/* Real-Time Password Strength Meter */}
              {password.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    height: 4,
                    borderRadius: 2,
                    background: dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                    overflow: 'hidden',
                    marginBottom: 8
                  }}>
                    <div style={{
                      width: `${strengthPercent}%`,
                      height: '100%',
                      background: strengthLabel.color,
                      transition: 'all 0.3s ease'
                    }}></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px' }}>
                    {passwordChecks.map((chk, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11,
                        color: chk.pass ? '#10b981' : dark ? '#64748b' : '#94a3b8',
                        fontWeight: chk.pass ? 600 : 400
                      }}>
                        <i className={`fas ${chk.pass ? 'fa-check' : 'fa-circle-dot'}`} style={{ fontSize: 9 }}></i>
                        <span>{chk.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirm Password */}
              <div className="field-wrap">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label htmlFor="reg-confirm-password" style={{ margin: 0 }}>Confirm Password *</label>
                  {confirmPassword.length > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: isPasswordMatch ? '#10b981' : '#ef4444' }}>
                      {isPasswordMatch ? '✓ Passwords Match' : '✗ Do not match'}
                    </span>
                  )}
                </div>
                <i className="fas fa-shield-check icon"></i>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="reg-confirm-password"
                  placeholder="Re-enter your password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', right: 12, top: 35, background: 'none', border: 'none', color: dark ? '#64748b' : '#94a3b8', cursor: 'pointer', fontSize: 13 }}
                >
                  <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>

              {/* Terms Checkbox */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '14px 0 18px 0' }}>
                <input
                  id="agree-terms"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={e => setAgreeTerms(e.target.checked)}
                  style={{ marginTop: 3, accentColor: '#6366f1', cursor: 'pointer' }}
                />
                <label htmlFor="agree-terms" style={{ fontSize: 12, color: dark ? '#94a3b8' : '#64748b', lineHeight: 1.4, cursor: 'pointer' }}>
                  I agree to the <Link to="/docs" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>Terms of Service</Link> and <Link to="/docs" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</Link>.
                </label>
              </div>

              {/* Error Alert */}
              {error && (
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 8,
                  marginBottom: 16,
                  fontSize: 13,
                  fontWeight: 500,
                  background: dark ? 'rgba(239,68,68,0.08)' : '#fef2f2',
                  color: '#ef4444',
                  border: `1px solid ${dark ? 'rgba(239,68,68,0.2)' : '#fecaca'}`
                }}>
                  <i className="fas fa-circle-exclamation" style={{ marginTop: 2, flexShrink: 0 }}></i>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className={`auth-submit ${loading ? 'loading' : ''}`}
                disabled={loading || password.length < 8 || !isPasswordMatch}
              >
                <span className="spinner"></span>
                <span className="btn-text">
                  <span>Create Protected Account</span>
                  <i className="fas fa-arrow-right" style={{ fontSize: 13, marginLeft: 6 }}></i>
                </span>
              </button>
            </form>

            {/* Bottom Link to Sign In */}
            <div style={{ textAlign: 'center', marginTop: 22, color: dark ? '#94a3b8' : '#64748b', fontSize: 13 }}>
              Already registered?{' '}
              <Link to="/user/login" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 700 }}>
                Sign In to Dashboard
              </Link>
            </div>
          </>
        ) : (
          /* ================= STAGE 2: "CHECK YOUR INBOX" SCREEN ================= */
          <div style={{ textAlign: 'center' }}>
            {/* Animated Mail Shield Icon */}
            <div style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(79,70,229,0.25))',
              border: '1.5px solid rgba(99,102,241,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              animation: 'mailBounce 2s ease-in-out infinite'
            }}>
              <i className="fas fa-envelope-circle-check" style={{ fontSize: 32, color: '#6366f1' }}></i>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 20,
              background: dark ? 'rgba(16,185,129,0.1)' : '#ecfdf5',
              border: `1px solid ${dark ? 'rgba(16,185,129,0.2)' : '#a7f3d0'}`,
              color: '#10b981',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 12
            }}>
              <i className="fas fa-check"></i> Account Created Successfully
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 800, color: s.text, letterSpacing: '-0.5px', marginBottom: 10 }}>
              Verify your email address
            </h2>

            <p style={{ fontSize: 14, color: s.textSecondary, lineHeight: 1.6, marginBottom: 8 }}>
              We sent a cryptographic verification link to:
            </p>

            <div style={{
              padding: '10px 16px',
              borderRadius: 10,
              background: dark ? 'rgba(255,255,255,0.04)' : '#f1f5f9',
              border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
              fontSize: 14.5,
              fontWeight: 700,
              color: '#6366f1',
              marginBottom: 24,
              display: 'inline-block',
              wordBreak: 'break-all'
            }}>
              <i className="fas fa-envelope" style={{ marginRight: 8 }}></i>
              {email}
            </div>

            {/* Direct Open Mail Provider Button */}
            <a
              href={getEmailProviderUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="auth-submit"
              style={{ textDecoration: 'none', marginBottom: 14 }}
            >
              <i className="fas fa-arrow-up-right-from-square"></i>
              <span>Open Email Inbox</span>
            </a>

            {/* Sandbox / Direct Test Action */}
            {verificationToken && (
              <div style={{
                marginBottom: 18,
                padding: '12px 14px',
                borderRadius: 10,
                background: dark ? 'rgba(99,102,241,0.08)' : '#eef2ff',
                border: `1px dashed ${dark ? 'rgba(99,102,241,0.3)' : '#c7d2fe'}`,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', marginBottom: 4 }}>
                  Instant Simulation (Development Mode)
                </div>
                <Link
                  to={`/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    color: '#4f46e5',
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: 'underline'
                  }}
                >
                  <i className="fas fa-bolt"></i> Click to Auto-Verify Account Instantly
                </Link>
              </div>
            )}

            {/* Resend Verification Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendCooldown > 0 || resendLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendCooldown > 0 ? (dark ? '#64748b' : '#94a3b8') : '#6366f1',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: resendCooldown > 0 ? 'default' : 'pointer',
                  padding: '6px 12px'
                }}
              >
                {resendLoading ? (
                  <span>Sending new link...</span>
                ) : resendCooldown > 0 ? (
                  <span>Resend link available in {resendCooldown}s</span>
                ) : (
                  <span><i className="fas fa-rotate-right" style={{ marginRight: 6 }}></i> Didn&apos;t receive it? Resend email</span>
                )}
              </button>

              {resendMessage && (
                <div style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: resendMessage.includes('sent') ? '#10b981' : '#ef4444',
                  background: resendMessage.includes('sent') ? (dark ? 'rgba(16,185,129,0.1)' : '#f0fdf4') : (dark ? 'rgba(239,68,68,0.1)' : '#fef2f2'),
                  padding: '8px 12px',
                  borderRadius: 8
                }}>
                  {resendMessage}
                </div>
              )}
            </div>

            {/* Change Email or Back to Sign In */}
            <div style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 12.5,
              color: s.textSecondary
            }}>
              <button
                type="button"
                onClick={() => setRegistrationComplete(false)}
                style={{ background: 'none', border: 'none', color: s.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <i className="fas fa-pen" style={{ fontSize: 10 }}></i> Wrong email? Edit
              </button>

              <Link to="/user/login" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
                Return to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
