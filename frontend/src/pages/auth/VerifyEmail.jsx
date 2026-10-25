import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Mail,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import api from '../../api/api';
import AuthSplitLayout from '../../components/AuthSplitLayout';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tokenParam = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';
  const planParam = searchParams.get('plan') || '';
  const cycleParam = searchParams.get('cycle') || 'monthly';

  // 6 Individual Boxes State - strictly empty boxes for genuine verification
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  const [targetEmail, setTargetEmail] = useState(emailParam);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle', 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading] = useState(false);
  const hasAutoAttemptedRef = useRef(false);

  // Auto-verification if 64-char magic token is passed via magic link
  useEffect(() => {
    if (tokenParam && tokenParam.length >= 20 && !hasAutoAttemptedRef.current) {
      hasAutoAttemptedRef.current = true;
      handleTokenVerification(tokenParam);
    }
  }, [tokenParam]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleTokenVerification = async (verifyToken) => {
    setStatus('verifying');
    setLoading(true);
    try {
      const data = await api.verifyEmail(verifyToken, targetEmail);
      setStatus('success');
      setMessage(data.message || 'Email successfully verified! Your security workspace is ready.');
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Invalid or expired verification token. Please enter your 6-digit code.');
    } finally {
      setLoading(false);
    }
  };

  // Handle single digit change
  const handleDigitChange = (index, value) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    const newDigits = [...digits];

    if (cleaned.length === 0) {
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    if (cleaned.length > 1) {
      handlePaste(cleaned);
      return;
    }

    newDigits[index] = cleaned;
    setDigits(newDigits);

    if (index < 5 && cleaned) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Backspace moves to previous box
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  // Paste support across all 6 boxes
  const handlePaste = (pastedText) => {
    const raw = (pastedText || '').replace(/[^0-9]/g, '').slice(0, 6);
    if (!raw) return;

    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < raw.length; i++) {
      newDigits[i] = raw[i];
    }
    setDigits(newDigits);

    const nextIndex = Math.min(raw.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleOtpSubmit = async (e) => {
    if (e) e.preventDefault();
    const fullCode = digits.join('');
    if (fullCode.length < 6) {
      setStatus('error');
      setMessage('Please enter all 6 digits of your verification code.');
      return;
    }

    setStatus('verifying');
    setLoading(true);
    setMessage('');

    try {
      const targetToken = fullCode.length === 6 ? fullCode : (tokenParam || fullCode);
      const data = await api.verifyEmail(targetToken, targetEmail);
      setStatus('success');
      setMessage(data.message || 'Verification complete! Your account is now fully active.');
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'The code entered is invalid or has expired. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || loading || !targetEmail) return;
    setLoading(true);
    try {
      const data = await api.resendVerification(targetEmail.trim().toLowerCase());
      setMessage(data.message || 'A fresh 6-digit verification code has been dispatched to your email.');
      setDigits(['', '', '', '', '', '']);
      setStatus('idle');
      setCountdown(60);
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Failed to resend code. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  const formattedCountdown = `00:${countdown < 10 ? '0' : ''}${countdown}`;

  return (
    <AuthSplitLayout>
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
            background: status === 'success' ? '#E8F3EC' : 'transparent',
            border: status === 'success' ? '1px solid #CFE2D4' : 'none',
            boxShadow: status === 'success' ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          {status === 'success' ? (
            <ShieldCheck size={22} strokeWidth={2.4} style={{ color: '#28745D' }} />
          ) : (
            <img
              src="/assets/mdefender_logo.png"
              alt="MDefender Pro Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          )}
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
          VERIFY YOUR EMAIL
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
          {status === 'success' ? 'Email verified.' : 'Enter your verification code.'}
        </h1>

        <p
          style={{
            fontSize: '13px',
            lineHeight: 1.5,
            color: '#60716B',
            margin: 0,
          }}
        >
          {status === 'success'
            ? 'Your email has been authenticated. You can now access your workspace.'
            : targetEmail
            ? `We sent a 6-digit code to ${targetEmail}.`
            : 'We sent a 6-digit code to your email address.'}
        </p>
      </div>

      {/* Success State Screen */}
      {status === 'success' ? (
        <div>
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
              marginBottom: '20px',
              lineHeight: 1.5,
            }}
          >
            <CheckCircle2 size={16} style={{ color: '#28745D', flexShrink: 0 }} />
            <span>{message || 'Email verified successfully! Your account is active.'}</span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/user/login?verified=true')}
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
              cursor: 'pointer',
              boxShadow: '0 8px 16px rgba(11, 37, 34, 0.14)',
              transition: 'all 0.18s ease',
            }}
          >
            <span>Continue to sign in</span>
            <ArrowRight size={15} strokeWidth={2.4} />
          </button>
        </div>
      ) : (
        <>
          {/* Highlighted Inbox Notice */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #D9E1DC',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '7px',
                background: '#E8F3EC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#28745D',
                flexShrink: 0,
              }}
            >
              <Mail size={15} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#10201E' }}>
                Check your inbox
              </div>
              <div style={{ fontSize: '11px', color: '#60716B', marginTop: '1px' }}>
                {countdown > 0 ? (
                  <span>Code valid for <strong>{formattedCountdown}</strong></span>
                ) : (
                  <span style={{ color: '#E8792F', fontWeight: 600 }}>Code expired. Please click resend below.</span>
                )}
              </div>
            </div>
          </div>

          {/* Error Box */}
          {status === 'error' && (
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
              <span>{message}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Six Individual OTP Boxes: 44 × 48px desktop, gap 7px, radius 8px, border 1px solid #CBD8CF, digit 20px */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#10201E',
                  marginBottom: '8px',
                }}
              >
                6-digit verification code
              </label>

              <div
                className="otp-box-grid"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '7px',
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  handlePaste(e.clipboardData.getData('text'));
                }}
              >
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="otp-single-box"
                    autoFocus={index === 0}
                    style={{
                      width: '44px',
                      height: '48px',
                      borderRadius: '8px',
                      border: '1px solid #CBD8CF',
                      background: '#FFFFFF',
                      fontSize: '20px',
                      fontWeight: 700,
                      textAlign: 'center',
                      color: '#10201E',
                      outline: 'none',
                      transition: 'all 0.15s ease',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Primary CTA Button: height 45px */}
            <button
              type="submit"
              disabled={loading || digits.join('').length < 6}
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
                cursor: loading || digits.join('').length < 6 ? 'not-allowed' : 'pointer',
                boxShadow: '0 8px 16px rgba(11, 37, 34, 0.14)',
                transition: 'all 0.18s ease',
                opacity: loading || digits.join('').length < 6 ? 0.75 : 1,
              }}
            >
              <span>{loading ? 'Verifying...' : 'Verify email'}</span>
              {!loading && <ArrowRight size={15} strokeWidth={2.4} />}
            </button>
          </form>

          {/* Resend Code Action */}
          <div
            style={{
              marginTop: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '11px',
            }}
          >
            <span style={{ color: '#60716B' }}>Didn't receive the code?</span>
            {countdown > 0 ? (
              <span style={{ color: '#87948D', fontWeight: 600 }}>
                Resend in {formattedCountdown}
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#E8792F',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '11px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#BD642B')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#E8792F')}
              >
                Resend code
              </button>
            )}
          </div>

          {/* Different Email or Back Actions */}
          <div
            style={{
              marginTop: '14px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            {isEditingEmail ? (
              <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '4px' }}>
                <input
                  type="email"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder="New email address"
                  className="auth-input-field"
                  style={{
                    flex: 1,
                    height: '38px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD8CF',
                    background: '#FFFFFF',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setIsEditingEmail(false)}
                  style={{
                    padding: '0 10px',
                    height: '38px',
                    borderRadius: '8px',
                    border: '1px solid #D9E1DC',
                    background: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#10201E',
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingEmail(true)}
                style={{
                  background: 'none',
                  border: '1px solid #D9E1DC',
                  borderRadius: '7px',
                  padding: '5px 12px',
                  color: '#60716B',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#10201E';
                  e.currentTarget.style.color = '#10201E';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#D9E1DC';
                  e.currentTarget.style.color = '#60716B';
                }}
              >
                Use a different email
              </button>
            )}

            <Link
              to="/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#60716B',
                textDecoration: 'none',
                marginTop: '4px',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#E8792F')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#60716B')}
            >
              <ArrowLeft size={12} strokeWidth={2.4} />
              <span>Back to registration</span>
            </Link>
          </div>
        </>
      )}

      <style>{`
        .otp-single-box:focus {
          border-color: #28745D !important;
          box-shadow: 0 0 0 3px rgba(40, 116, 93, 0.13) !important;
        }
        .auth-primary-btn:hover:not(:disabled) {
          background-color: #153B34 !important;
          transform: translateY(-1px) !important;
        }
        @media (max-width: 480px) {
          .otp-single-box {
            width: 42px !important;
            height: 46px !important;
            font-size: 18px !important;
          }
          .otp-box-grid {
            gap: 5px !important;
          }
        }
      `}</style>
    </AuthSplitLayout>
  );
}
