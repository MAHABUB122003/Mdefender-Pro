import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import theme from '../../utils/theme'
import api from '../../api/api'

export default function VerifyEmail() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { dark } = useTheme()
  const s = theme(dark)
  const [status, setStatus] = useState('waiting')
  const [message, setMessage] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [tokenReady, setTokenReady] = useState(false)
  const [storedToken, setStoredToken] = useState('')

  const email = searchParams.get('email') || ''

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      setStoredToken(token)
      setTokenReady(true)
      setStatus('ready')
    } else {
      setStatus('waiting')
    }
  }, [searchParams])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const handleVerify = async () => {
    if (!storedToken || loading) return
    setLoading(true)
    setStatus('verifying')
    try {
      const data = await api.verifyEmail(storedToken)
      setStatus('success')
      setMessage(data.message || 'Email verified successfully!')
      setSearchParams({}, { replace: true })
    } catch (err) {
      setStatus('error')
      const msg = err.message || 'Invalid or expired verification link'
      if (msg.includes('expired')) {
        setMessage('This verification link has expired. Please request a new one.')
      } else if (msg.includes('already been used')) {
        setMessage('This link has already been used. Please request a new one if needed.')
      } else if (msg.includes('Too many')) {
        setMessage('Too many failed attempts. Please wait before trying again.')
        setCooldown(120)
      } else {
        setMessage(msg)
      }
    }
    setLoading(false)
  }

  const handleResend = async () => {
    if (!email || cooldown > 0 || loading) return
    setLoading(true)
    try {
      const data = await api.resendVerification(email)
      setStatus('sent')
      setMessage(data.message || 'New verification email sent!')
      setCooldown(90)
      setTokenReady(false)
      setStoredToken('')
      setSearchParams({ email }, { replace: true })
    } catch (err) {
      const msg = err.message || 'Failed to resend'
      if (msg.includes('Too many')) {
        setMessage('Rate limit exceeded. Please wait a few minutes before trying again.')
        setCooldown(180)
      } else {
        setMessage(msg)
      }
    }
    setLoading(false)
  }

  const iconBg = {
    waiting: dark ? 'rgba(99,102,241,0.1)' : '#eef2ff',
    ready: dark ? 'rgba(99,102,241,0.1)' : '#eef2ff',
    verifying: dark ? 'rgba(99,102,241,0.1)' : '#eef2ff',
    sent: dark ? 'rgba(16,185,129,0.1)' : '#ecfdf5',
    success: dark ? 'rgba(16,185,129,0.1)' : '#ecfdf5',
    error: dark ? 'rgba(239,68,68,0.1)' : '#fef2f2',
  }
  const iconColor = { waiting: '#6366f1', ready: '#6366f1', verifying: '#6366f1', sent: '#10b981', success: '#10b981', error: '#ef4444' }
  const iconAnim = status === 'verifying' ? { animation: 'float 2s ease-in-out infinite' } : status === 'success' ? { animation: 'checkBounce 0.5s cubic-bezier(0.16,1,0.3,1)' } : {}

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      background: dark
        ? 'linear-gradient(160deg, #0a0e1a 0%, #0f172a 40%, #111827 100%)'
        : 'linear-gradient(160deg, #f8fafc 0%, #f1f5f9 40%, #e2e8f0 100%)',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <style>{`
        @keyframes fadeSlideUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.8); } to { opacity:1; transform:scale(1); } }
        @keyframes pulseRing { 0% { transform:scale(1); opacity:0.6; } 100% { transform:scale(1.8); opacity:0; } }
        @keyframes checkBounce { 0% { transform:scale(0); } 50% { transform:scale(1.15); } 100% { transform:scale(1); } }
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
        @keyframes spin { to { transform:rotate(360deg); } }

        .v-panel {
          border-radius: 20px; width: 100%; max-width: 420px;
          animation: fadeSlideUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards;
          background: ${dark ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.92)'};
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border: 1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
          box-shadow: ${dark
            ? '0 4px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset'
            : '0 4px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(255,255,255,0.8) inset'};
          overflow: hidden; position: relative;
        }
        .v-panel::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg,#4f46e5,#7c3aed,#6366f1); }
        .v-icon { width:80px; height:80px; border-radius:20px; display:flex; align-items:center; justify-content:center; margin:0 auto 20px; position:relative; animation:scaleIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.15s both; }
        .v-icon .ring { position:absolute; inset:-4px; border-radius:24px; border:2px solid ${dark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'}; animation:pulseRing 2s ease-out infinite; }
        .v-btn {
          width:100%; padding:14px 24px; border:none; border-radius:12px;
          font-size:14px; font-weight:700; cursor:pointer;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
          display:flex; align-items:center; justify-content:center; gap:10px;
          position:relative; overflow:hidden;
        }
        .v-btn.primary { background:linear-gradient(135deg,#4f46e5,#6366f1,#7c3aed); color:#fff; box-shadow:0 4px 20px rgba(99,102,241,0.35); }
        .v-btn.primary:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 30px rgba(99,102,241,0.45); }
        .v-btn.success { background:linear-gradient(135deg,#10b981,#059669); color:#fff; box-shadow:0 4px 20px rgba(16,185,129,0.35); text-decoration:none; }
        .v-btn.success:hover { transform:translateY(-2px); box-shadow:0 8px 30px rgba(16,185,129,0.45); }
        .v-btn:active:not(:disabled) { transform:translateY(0); }
        .v-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
        .v-btn .spin { display:none; width:18px; height:18px; border:2.5px solid rgba(255,255,255,0.25); border-top-color:#fff; border-radius:50%; animation:spin 0.7s linear infinite; }
        .v-btn.loading .spin { display:inline-block; }
        .v-btn.loading .bt { display:none; }
        .v-secure-badge {
          display:inline-flex; align-items:center; gap:5px; padding:4px 10px;
          border-radius:6px; font-size:10px; font-weight:600; text-transform:uppercase;
          letter-spacing:0.5px;
        }
      `}</style>

      <div className="v-panel">
        <div style={{ padding: '44px 36px 36px', textAlign: 'center' }}>
          <Link to="/" style={{ display:'inline-flex', alignItems:'center', gap:10, textDecoration:'none', marginBottom:28 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#4f46e5,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(99,102,241,0.3)' }}>
              <i className="fas fa-shield-halved" style={{ fontSize:16, color:'#fff' }}></i>
            </div>
            <span style={{ fontSize:16, fontWeight:700, color:s.text, letterSpacing:'-0.3px' }}>MDefender Pro</span>
          </Link>

          {/* WAITING - No token in URL */}
          {status === 'waiting' && (
            <>
              <div className="v-icon">
                <div className="ring"></div>
                <div style={{ width:'100%', height:'100%', borderRadius:20, background:iconBg.waiting, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className="fas fa-envelope-circle-check" style={{ fontSize:32, color:iconColor.waiting }}></i>
                </div>
              </div>
              <h1 style={{ color:s.text, fontSize:20, fontWeight:800, letterSpacing:'-0.4px', marginBottom:8 }}>Verify Your Email</h1>
              <p style={{ color:'#64748b', fontSize:13, lineHeight:1.6, maxWidth:320, margin:'0 auto 4px' }}>
                Check your email and click the verification link to activate your account.
              </p>
              {email && (
                <p style={{ fontSize:13, fontWeight:600, color: dark ? '#e2e8f0' : '#1e293b', marginBottom:20 }}>
                  {email}
                </p>
              )}
              {!email && <div style={{ marginBottom:20 }}></div>}

              <button onClick={handleResend} disabled={!email || cooldown > 0 || loading} className={`v-btn primary ${loading ? 'loading' : ''}`}>
                <span className="spin"></span>
                <span className="bt">
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Send Verification Link'}
                </span>
              </button>
            </>
          )}

          {/* READY - Token available, waiting for user to confirm */}
          {status === 'ready' && (
            <>
              <div className="v-icon">
                <div className="ring"></div>
                <div style={{ width:'100%', height:'100%', borderRadius:20, background:iconBg.ready, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className="fas fa-shield-halved" style={{ fontSize:32, color:iconColor.ready }}></i>
                </div>
              </div>
              <h1 style={{ color:s.text, fontSize:20, fontWeight:800, letterSpacing:'-0.4px', marginBottom:8 }}>Confirm Your Identity</h1>
              <p style={{ color:'#64748b', fontSize:13, lineHeight:1.6, maxWidth:320, margin:'0 auto 4px' }}>
                Click the button below to verify your email address and activate your account.
              </p>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, margin:'16px 0' }}>
                <div className="v-secure-badge" style={{ background:dark?'rgba(99,102,241,0.1)':'#eef2ff', color:'#6366f1' }}>
                  <i className="fas fa-lock" style={{ fontSize:9 }}></i> Encrypted
                </div>
                <div className="v-secure-badge" style={{ background:dark?'rgba(16,185,129,0.1)':'#ecfdf5', color:'#10b981' }}>
                  <i className="fas fa-fingerprint" style={{ fontSize:9 }}></i> HMAC Verified
                </div>
              </div>

              <button onClick={handleVerify} disabled={loading} className={`v-btn primary ${loading ? 'loading' : ''}`} style={{ marginBottom:12 }}>
                <span className="spin"></span>
                <span className="bt">
                  <i className="fas fa-check-circle" style={{ fontSize:14 }}></i>
                  Confirm
                </span>
              </button>

              <button onClick={handleResend} disabled={!email || cooldown > 0 || loading}
                style={{ background:'none', border:'none', color:'#6366f1', fontSize:12, fontWeight:600, cursor:'pointer', padding:'8px 16px', borderRadius:8, transition:'all 0.2s' }}
                onMouseOver={e => e.target.style.background = dark ? 'rgba(99,102,241,0.1)' : '#eef2ff'}
                onMouseOut={e => e.target.style.background = 'none'}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Send a new link instead'}
              </button>
            </>
          )}

          {/* VERIFYING */}
          {status === 'verifying' && (
            <>
              <div className="v-icon">
                <div className="ring"></div>
                <div style={{ width:'100%', height:'100%', borderRadius:20, background:iconBg.verifying, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className="fas fa-shield-halved" style={{ fontSize:32, color:iconColor.verifying, ...iconAnim }}></i>
                </div>
              </div>
              <h1 style={{ color:s.text, fontSize:20, fontWeight:800, letterSpacing:'-0.4px', marginBottom:8 }}>Securing Your Account</h1>
              <p style={{ color:'#64748b', fontSize:13, lineHeight:1.6 }}>Validating cryptographic token and binding identity...</p>
              <div style={{ marginTop:20, width:32, height:32, margin:'20px auto 0', border:`3px solid ${dark ? 'rgba(99,102,241,0.15)' : '#e0e7ff'}`, borderTopColor:'#6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}></div>
            </>
          )}

          {/* SENT */}
          {status === 'sent' && (
            <>
              <div className="v-icon">
                <div style={{ width:'100%', height:'100%', borderRadius:20, background:iconBg.sent, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className="fas fa-check" style={{ fontSize:32, color:iconColor.sent, ...iconAnim }}></i>
                </div>
              </div>
              <h1 style={{ color:s.text, fontSize:20, fontWeight:800, letterSpacing:'-0.4px', marginBottom:8 }}>Email Sent</h1>
              <p style={{ color:'#64748b', fontSize:13, lineHeight:1.6, maxWidth:320, margin:'0 auto 4px' }}>
                A fresh verification link has been sent. Check your inbox and click the link.
              </p>
              {email && (
                <p style={{ fontSize:13, fontWeight:600, color: dark ? '#e2e8f0' : '#1e293b', marginBottom:20 }}>
                  {email}
                </p>
              )}

              {message && (
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:10, marginTop:14, fontSize:12, fontWeight:500, background:dark?'rgba(16,185,129,0.08)':'#f0fdf4', color:'#10b981', border:`1px solid ${dark?'rgba(16,185,129,0.15)':'#bbf7d0'}` }}>
                  <i className="fas fa-check-circle"></i> {message}
                </div>
              )}

              <button onClick={handleResend} disabled={!email || cooldown > 0 || loading} className={`v-btn primary ${loading ? 'loading' : ''}`} style={{ marginTop:16 }}>
                <span className="spin"></span>
                <span className="bt">
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Again'}
                </span>
              </button>
            </>
          )}

          {/* SUCCESS */}
          {status === 'success' && (
            <>
              <div className="v-icon">
                <div style={{ width:'100%', height:'100%', borderRadius:20, background:iconBg.success, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className="fas fa-check" style={{ fontSize:32, color:iconColor.success, ...iconAnim }}></i>
                </div>
              </div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:8, background:dark?'rgba(16,185,129,0.1)':'#ecfdf5', border:`1px solid ${dark?'rgba(16,185,129,0.2)':'#a7f3d0'}`, marginBottom:16 }}>
                <i className="fas fa-shield-check" style={{ fontSize:11, color:'#10b981' }}></i>
                <span style={{ fontSize:10, fontWeight:700, color:'#059669', textTransform:'uppercase', letterSpacing:'0.5px' }}>Verified & Secured</span>
              </div>
              <h1 style={{ color:s.text, fontSize:20, fontWeight:800, letterSpacing:'-0.4px', marginBottom:8 }}>Email Confirmed</h1>
              <p style={{ color:'#64748b', fontSize:13, lineHeight:1.6, marginBottom:24 }}>{message || 'Your identity has been verified. Your account is now protected.'}</p>
              <Link to="/user/login?verified=true" className="v-btn success">
                <i className="fas fa-arrow-right-to-bracket"></i> Sign In to Dashboard
              </Link>
            </>
          )}

          {/* ERROR */}
          {status === 'error' && (
            <>
              <div className="v-icon">
                <div style={{ width:'100%', height:'100%', borderRadius:20, background:iconBg.error, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className="fas fa-xmark" style={{ fontSize:32, color:iconColor.error }}></i>
                </div>
              </div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:8, background:dark?'rgba(239,68,68,0.1)':'#fef2f2', border:`1px solid ${dark?'rgba(239,68,68,0.2)':'#fecaca'}`, marginBottom:16 }}>
                <i className="fas fa-triangle-exclamation" style={{ fontSize:11, color:'#ef4444' }}></i>
                <span style={{ fontSize:10, fontWeight:700, color:'#dc2626', textTransform:'uppercase', letterSpacing:'0.5px' }}>Verification Failed</span>
              </div>
              <h1 style={{ color:s.text, fontSize:20, fontWeight:800, letterSpacing:'-0.4px', marginBottom:8 }}>Invalid or Expired Link</h1>
              <p style={{ color:'#64748b', fontSize:13, lineHeight:1.6, marginBottom:24 }}>{message || 'This verification link is invalid, expired, or has already been used.'}</p>
              <button onClick={handleResend} disabled={!email || cooldown > 0 || loading} className={`v-btn primary ${loading ? 'loading' : ''}`} style={{ background:'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow:'0 4px 20px rgba(239,68,68,0.3)' }}>
                <span className="spin"></span>
                <span className="bt">
                  <i className="fas fa-paper-plane" style={{ fontSize:13 }}></i>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Send New Verification Link'}
                </span>
              </button>
              {message && (
                <div style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'10px 14px', borderRadius:10, marginTop:14, fontSize:12, fontWeight:500, background:dark?'rgba(239,68,68,0.08)':'#fef2f2', color:'#ef4444', border:`1px solid ${dark?'rgba(239,68,68,0.15)':'#fecaca'}`, textAlign:'left' }}>
                  <i className="fas fa-exclamation-circle" style={{ flexShrink:0, marginTop:2 }}></i> {message}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 36px', borderTop:`1px solid ${dark?'rgba(255,255,255,0.04)':'#f1f5f9'}`, background:dark?'rgba(0,0,0,0.1)':'rgba(0,0,0,0.01)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <Link to="/user/login" style={{ color:'#6366f1', fontSize:12, textDecoration:'none', fontWeight:600, display:'inline-flex', alignItems:'center', gap:5 }}>
            <i className="fas fa-arrow-left" style={{ fontSize:10 }}></i> Sign In
          </Link>
          <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'#94a3b8' }}>
            <i className="fas fa-lock" style={{ fontSize:9 }}></i> End-to-End Encrypted
          </div>
        </div>
      </div>
    </div>
  )
}
