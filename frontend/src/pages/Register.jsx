import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Shield,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import api from '../api/api';
import AuthSplitLayout from '../components/AuthSplitLayout';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planParam = searchParams.get('plan') || '';
  const cycleParam = searchParams.get('cycle') || 'monthly';

  // Form States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Real-time mismatch detection
  const isMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleGoogleLogin = async () => {
    try {
      const data = await api.getGoogleAuthUrl();
      if (data.url) window.location.href = data.url;
    } catch {
      setError('Google Single Sign-On is currently in configuration.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please provide a valid personal or enterprise email address.');
      return;
    }

    const hasMin = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password);

    if (!hasMin || !hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      setError('High Security Policy: Password must have at least 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    if (!agreeTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.register({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirm_password: confirmPassword,
      });

      if (data.status === 'success' || data.success) {
        // Transition to OTP verification screen - strictly require user to check inbox
        const verifyQuery = new URLSearchParams({
          email: email.trim().toLowerCase(),
          name: fullName.trim(),
          ...(planParam ? { plan: planParam, cycle: cycleParam } : {}),
        }).toString();

        navigate(`/verify-email?${verifyQuery}`);
      } else {
        setError(data.message || data.detail || 'Registration failed. Please try again.');
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('already exists')) {
        setError('An account with this email address already exists. Please sign in instead.');
      } else {
        setError(msg || 'Too many attempts or registration unavailable. Please wait a moment.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout>
      {/* Security icon box: 38 × 38px, radius 10px, background #E8EEE8, color #10201E */}
      {/* Brand logo container */}
      <div style={{ marginBottom: '18px' }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <img
            src="/assets/mdefender_logo.png"
            alt="MDefender Pro Logo"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
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
          START PROTECTED
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
          Create your security workspace.
        </h1>

        <p
          style={{
            fontSize: '13px',
            lineHeight: 1.5,
            color: '#60716B',
            margin: 0,
          }}
        >
          Use your personal email to create a secure workspace.
        </p>
      </div>

      {/* Error Box */}
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

      {/* Form: Field-to-field gap 17px */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '17px' }}>
        {/* Full Name */}
        <div>
          <label
            htmlFor="reg-fullname"
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 700,
              color: '#10201E',
              marginBottom: '8px',
            }}
          >
            Full name
          </label>
          <input
            id="reg-fullname"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Alex Morgan"
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

        {/* Email Address */}
        <div>
          <label
            htmlFor="reg-email"
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
            id="reg-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          <label
            htmlFor="reg-password"
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 700,
              color: '#10201E',
              marginBottom: '8px',
            }}
          >
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
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
          {/* Real-time Strong Password Checklist */}
          {password.length > 0 ? (
            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                { label: '8+ chars', valid: password.length >= 8 },
                { label: 'Uppercase (A-Z)', valid: /[A-Z]/.test(password) },
                { label: 'Lowercase (a-z)', valid: /[a-z]/.test(password) },
                { label: 'Number (0-9)', valid: /\d/.test(password) },
                { label: 'Special symbol (!@#$)', valid: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password) },
              ].map((req, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '5px',
                    background: req.valid ? '#E8F3EC' : '#FFF4ED',
                    border: `1px solid ${req.valid ? '#CFE2D4' : '#F2C7A7'}`,
                    color: req.valid ? '#28745D' : '#A34F22',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span>{req.valid ? '✓' : '•'}</span>
                  <span>{req.label}</span>
                </span>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: '#60716B', marginTop: '5px' }}>
              Requires 8+ characters, uppercase, lowercase, number, and special character.
            </div>
          )}
        </div>

        {/* Re-enter Password with Inline Mismatch Detection */}
        <div>
          <label
            htmlFor="reg-confirm-password"
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 700,
              color: '#10201E',
              marginBottom: '8px',
            }}
          >
            Re-enter password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="reg-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              required
              className="auth-input-field"
              style={{
                width: '100%',
                height: '44px',
                padding: '0 40px 0 13px',
                borderRadius: '8px',
                border: isMismatch ? '1px solid #F2C7A7' : '1px solid #CBD8CF',
                background: isMismatch ? '#FFF4ED' : '#FFFFFF',
                fontSize: '13px',
                color: '#10201E',
                outline: 'none',
                transition: 'all 0.15s ease',
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
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
              {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {isMismatch && (
            <div
              style={{
                fontSize: '11px',
                color: '#A34F22',
                fontWeight: 600,
                marginTop: '5px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <AlertCircle size={12} style={{ color: '#A34F22' }} />
              <span>Passwords do not match.</span>
            </div>
          )}
        </div>

        {/* Terms Checkbox */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '1px' }}>
          <input
            id="agree-terms"
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            style={{
              width: '15px',
              height: '15px',
              borderRadius: '4px',
              accentColor: '#0B2522',
              marginTop: '1px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          />
          <label
            htmlFor="agree-terms"
            style={{
              fontSize: '10.5px',
              color: '#60716B',
              lineHeight: 1.45,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            By creating an account, you agree to our{' '}
            <Link
              to="/docs"
              style={{ color: '#E8792F', textDecoration: 'none', fontWeight: 600 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#BD642B')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#E8792F')}
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              to="/docs"
              style={{ color: '#E8792F', textDecoration: 'none', fontWeight: 600 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#BD642B')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#E8792F')}
            >
              Privacy Policy
            </Link>
            .
          </label>
        </div>

        {/* Primary CTA Button: height 45px, background #0B2522, text 12px weight 700 */}
        <button
          type="submit"
          disabled={loading || isMismatch}
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
            cursor: loading || isMismatch ? 'not-allowed' : 'pointer',
            boxShadow: '0 8px 16px rgba(11, 37, 34, 0.14)',
            transition: 'all 0.18s ease',
            marginTop: '2px',
            opacity: loading || isMismatch ? 0.75 : 1,
          }}
        >
          <span>{loading ? 'Creating workspace...' : 'Create account'}</span>
          {!loading && <ArrowRight size={15} strokeWidth={2.4} />}
        </button>

        {/* Divider: margin 26px 0 18px */}
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

        {/* Google Button */}
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
      </form>

      {/* Bottom Switcher: Already have an account? Sign in */}
      <div
        style={{
          marginTop: '27px',
          textAlign: 'center',
          fontSize: '11px',
          color: '#60716B',
        }}
      >
        <span>Already have an account? </span>
        <Link
          to={`/user/login${planParam ? `?plan=${planParam}&cycle=${cycleParam}` : ''}`}
          style={{
            fontWeight: 700,
            color: '#E8792F',
            textDecoration: 'none',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#BD642B')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#E8792F')}
        >
          Sign in
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
