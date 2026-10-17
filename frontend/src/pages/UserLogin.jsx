import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import api from '../api/api';
import userStore from '../utils/userStore';
import AuthSplitLayout from '../components/AuthSplitLayout';

export default function UserLogin({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const planParam = searchParams.get('plan') || '';
  const cycleParam = searchParams.get('cycle') || 'monthly';
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(searchParams.get('verified') === 'true');

  const getPostLoginUrl = () => {
    return planParam ? `/user/pricing?plan=${planParam}&cycle=${cycleParam}` : '/user/dashboard';
  };

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
        searchParams.delete('verified');
        setSearchParams(searchParams, { replace: true });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess, searchParams, setSearchParams]);

  const handleLoginSuccess = (user) => {
    if (user) {
      userStore.set('profile', user);
      if (user.plan) localStorage.setItem('mdefender_user_plan', user.plan);
      if (user.name) localStorage.setItem('mdefender_user_name', user.name);
      if (!userStore.get('dashboard')) {
        userStore.set('dashboard', {
          user,
          websites: [],
          total_requests: 0,
          blocked_threats: 0,
          requests_today: 0,
          recent_attacks: [],
          attack_types: ['SQL Injection', 'XSS', 'LFI', 'RCE', 'Bot Scan'],
          attack_counts: [0, 0, 0, 0, 0],
          daily_requests: [0, 0, 0, 0, 0, 0, 0],
        });
      }
    }
    userStore.prefetchUserData(api);
    if (onLoginSuccess && user) {
      onLoginSuccess(user);
    }
    navigate(getPostLoginUrl(), { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setShowSuccess(false);
    setLoading(true);
    try {
      if (mfaRequired) {
        const data = await api.verifyMFA(tempToken, mfaCode);
        if (data.status === 'success') {
          handleLoginSuccess(data.user);
        } else {
          setError(data.message || 'Invalid 6-digit verification code.');
        }
      } else {
        const data = await api.login(emailOrUsername, password, rememberMe);
        if (data.status === 'success') {
          handleLoginSuccess(data.user);
        } else if (data.mfa_required) {
          setMfaRequired(true);
          setTempToken(data.temp_token || '');
          setError('');
        } else if (data.email_not_verified) {
          navigate(`/auth/verify-email?email=${encodeURIComponent(emailOrUsername)}${planParam ? `&plan=${planParam}&cycle=${cycleParam}` : ''}`);
          return;
        } else {
          setError(data.message || 'Invalid email or password. Please try again.');
        }
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const data = await api.getGoogleAuthUrl();
      if (data.url) window.location.href = data.url;
    } catch {
      setError('Google Single Sign-On is currently in configuration.');
    }
  };

  return (
    <AuthSplitLayout>
      {/* Security icon box: 38 × 38px, radius 10px, background #E8EEE8, color #10201E */}
      <div style={{ marginBottom: '18px' }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: '#E8EEE8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10201E',
          }}
        >
          {mfaRequired ? <KeyRound size={17} strokeWidth={2.2} /> : <Lock size={17} strokeWidth={2.2} />}
        </div>
      </div>

      {/* Form Header */}
      <div style={{ marginBottom: '22px' }}>
        <div
          style={{
            fontSize: '10px',
            fontWeight: 700,
            color: '#E8792F',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: '7px',
          }}
        >
          {mfaRequired ? 'TWO-FACTOR AUTHENTICATION' : 'WELCOME BACK'}
        </div>

        <h1
          style={{
            fontSize: '31px',
            fontWeight: 600,
            letterSpacing: '-0.06em',
            color: '#10201E',
            lineHeight: 1.12,
            marginBottom: '8px',
          }}
        >
          {mfaRequired ? 'Enter security code.' : 'Sign in to your workspace.'}
        </h1>

        <p
          style={{
            fontSize: '13px',
            lineHeight: 1.5,
            color: '#60716B',
            margin: 0,
          }}
        >
          {mfaRequired
            ? 'Open your authenticator app and enter the 6-digit verification code.'
            : 'Access your websites, events, and protection controls.'}
        </p>
      </div>

      {/* Verified Success Box */}
      {showSuccess && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '8px',
            background: '#E8F3EC',
            border: '1px solid #CFE2D4',
            color: '#28745D',
            fontSize: '12px',
            fontWeight: 500,
            marginBottom: '16px',
            lineHeight: 1.5,
          }}
        >
          <CheckCircle2 size={15} style={{ color: '#28745D', flexShrink: 0 }} />
          <span>Email verified! You can now sign in to your workspace.</span>
        </div>
      )}

      {/* Error State Box */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '8px',
            background: '#FFF4ED',
            border: '1px solid #F2C7A7',
            color: '#A34F22',
            fontSize: '12px',
            fontWeight: 500,
            marginBottom: '16px',
          }}
        >
          <AlertCircle size={15} style={{ color: '#A34F22', flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Form: Field-to-field gap: 17px */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '17px' }}>
        {mfaRequired ? (
          <div>
            <label
              htmlFor="mfa-code"
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 700,
                color: '#10201E',
                marginBottom: '8px',
              }}
            >
              Authentication code
            </label>
            <input
              id="mfa-code"
              type="text"
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder="000000"
              required
              autoFocus
              className="auth-input-field"
              style={{
                width: '100%',
                height: '44px',
                padding: '0 13px',
                borderRadius: '8px',
                border: '1px solid #CBD8CF',
                background: '#FFFFFF',
                fontSize: '16px',
                letterSpacing: '0.2em',
                fontWeight: 700,
                textAlign: 'center',
                color: '#10201E',
                outline: 'none',
                transition: 'all 0.15s ease',
              }}
            />
          </div>
        ) : (
          <>
            {/* Email Address */}
            <div>
              <label
                htmlFor="login-email"
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#10201E',
                  marginBottom: '8px',
                }}
              >
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="you@example.com"
                required
                className="auth-input-field"
                style={{
                  width: '100%',
                  height: '44px',
                  padding: '0 13px',
                  borderRadius: '8px',
                  border: '1px solid #CBD8CF',
                  background: '#FFFFFF',
                  fontSize: '13px',
                  color: '#10201E',
                  outline: 'none',
                  transition: 'all 0.15s ease',
                }}
              />
            </div>

            {/* Password */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}
              >
                <label
                  htmlFor="login-password"
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#10201E',
                  }}
                >
                  Password
                </label>

                <Link
                  to="/forgot-password"
                  style={{
                    fontSize: '13px',
                    color: '#10201E',
                    textDecoration: 'none',
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#E8792F')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#10201E')}
                >
                  Forgot password?
                </Link>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  className="auth-input-field"
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '0 40px 0 13px',
                    borderRadius: '8px',
                    border: '1px solid #CBD8CF',
                    background: '#FFFFFF',
                    fontSize: '13px',
                    color: '#10201E',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                  }}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#60716B',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '-2px' }}>
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  width: '15px',
                  height: '15px',
                  borderRadius: '4px',
                  accentColor: '#0B2522',
                  cursor: 'pointer',
                }}
              />
              <label
                htmlFor="remember-me"
                style={{
                  fontSize: '12px',
                  color: '#10201E',
                  fontWeight: 500,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                Remember me for 30 days
              </label>
            </div>
          </>
        )}

        {/* Primary sign-in button: width 388px, height 45px, background #0B2522, text #FFFFFF, size 12px, weight 700, radius 8px, shadow 0 8px 16px rgba(11,37,34,.14), arrow 15px */}
        <button
          type="submit"
          disabled={loading}
          className="auth-primary-btn"
          style={{
            width: '100%',
            height: '45px',
            borderRadius: '8px',
            background: '#0B2522',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 8px 16px rgba(11, 37, 34, 0.14)',
            transition: 'all 0.18s ease',
            marginTop: '2px',
            opacity: loading ? 0.8 : 1,
          }}
        >
          <span>{loading ? 'Authenticating...' : mfaRequired ? 'Verify & Continue' : 'Sign in'}</span>
          {!loading && <ArrowRight size={15} strokeWidth={2.4} />}
        </button>

        {mfaRequired && (
          <button
            type="button"
            onClick={() => {
              setMfaRequired(false);
              setMfaCode('');
              setTempToken('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#60716B',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            ← Back to username &amp; password
          </button>
        )}

        {/* Divider: margin 26px 0 18px, 1px solid #D9E1DC, text 10px #87948D */}
        {!mfaRequired && (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                margin: '26px 0 18px 0',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: '#D9E1DC' }} />
              <span
                style={{
                  padding: '0 12px',
                  fontSize: '10px',
                  color: '#87948D',
                  fontWeight: 500,
                  textTransform: 'lowercase',
                }}
              >
                or continue with
              </span>
              <div style={{ flex: 1, height: '1px', background: '#D9E1DC' }} />
            </div>

            {/* Google button: height 43px, background #FFFFFF, border 1px solid #CBD8CF, radius 8px, text 12px weight 700, hover #F7FAF7 */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="auth-google-btn"
              style={{
                width: '100%',
                height: '43px',
                borderRadius: '8px',
                background: '#FFFFFF',
                border: '1px solid #CBD8CF',
                color: '#10201E',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </>
        )}
      </form>

      {/* Bottom account link: text 11px, color #60716B, link #E8792F, weight 700, margin-top 27px */}
      <div
        style={{
          marginTop: '27px',
          textAlign: 'center',
          fontSize: '11px',
          color: '#60716B',
        }}
      >
        <span>New to MDefender Pro? </span>
        <Link
          to={`/register${planParam ? `?plan=${planParam}&cycle=${cycleParam}` : ''}`}
          style={{
            fontWeight: 700,
            color: '#E8792F',
            textDecoration: 'none',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#BD642B')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#E8792F')}
        >
          Create an account
        </Link>
      </div>

      <style>{`
        .auth-input-field:focus {
          border-color: #E8792F !important;
          box-shadow: 0 0 0 3px rgba(232, 121, 47, 0.14) !important;
        }
        .auth-primary-btn:hover:not(:disabled) {
          background-color: #153B34 !important;
          transform: translateY(-1px) !important;
        }
        .auth-google-btn:hover {
          background-color: #F7FAF7 !important;
        }
      `}</style>
    </AuthSplitLayout>
  );
}
