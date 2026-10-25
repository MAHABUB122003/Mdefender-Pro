import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  KeyRound,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  Mail,
  Lock,
} from 'lucide-react';
import api from '../../api/api';
import AuthSplitLayout from '../../components/AuthSplitLayout';

export default function ForgotPassword() {
  const navigate = useNavigate();
  // Steps: 1 = Request Email, 2 = Verify 6-digit OTP, 3 = Enter New Password
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const [status, setStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  const [message, setMessage] = useState('');
  const [devOtp, setDevOtp] = useState('');

  // 60-second countdown timer for resend
  useEffect(() => {
    if (countdown <= 0 || step !== 2) return;
    const timer = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown, step]);

  const isMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const hasMin = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password);
  const isStrong = hasMin && hasUpper && hasLower && hasDigit && hasSpecial;

  // Handle single digit input
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

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

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

  // ─── STEP 1: Request 6-digit OTP ───
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    setMessage('');
    try {
      const data = await api.forgotPassword(email.trim().toLowerCase());
      setStatus('idle');
      setStep(2);
      setCountdown(60);
      setDigits(['', '', '', '', '', '']);
      setMessage(data.message || `A 6-digit verification code has been sent to ${email}.`);
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Unable to request password reset. Please try again.');
    }
  };

  // ─── Resend OTP Action ───
  const handleResendOtp = async () => {
    if (countdown > 0 || status === 'loading') return;
    setStatus('loading');
    setMessage('');
    try {
      const data = await api.forgotPassword(email.trim().toLowerCase());
      setStatus('idle');
      setCountdown(60);
      setDigits(['', '', '', '', '', '']);
      setMessage(data.message || 'A fresh 6-digit code has been dispatched to your email.');
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Failed to resend code. Please try again.');
    }
  };

  // ─── STEP 2: Verify 6-digit OTP ───
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const fullOtp = digits.join('');
    if (fullOtp.length < 6) {
      setStatus('error');
      setMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setStatus('loading');
    setMessage('');
    try {
      const data = await api.verifyResetOtp(email.trim().toLowerCase(), fullOtp);
      setStatus('idle');
      setStep(3); // Advance to Step 3: Set New Password
      setMessage(data.message || 'Code verified successfully. Please enter your new password.');
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Invalid or expired verification code. Please check and try again.');
    }
  };

  // ─── STEP 3: Reset Password ───
  const handleResetPassword = async (e) => {
    e.preventDefault();
    const fullOtp = digits.join('');

    if (!isStrong) {
      setStatus('error');
      setMessage('Password must contain at least 8 characters, including uppercase, lowercase, number, and special character.');
      return;
    }

    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }

    setStatus('loading');
    setMessage('');
    try {
      const data = await api.resetPassword({
        email: email.trim().toLowerCase(),
        otp: fullOtp,
        password,
        confirmPassword,
      });

      setStatus('success');
      setMessage(data.message || 'Password successfully updated! You can now log in.');
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Failed to update password. Please try again.');
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
          {status === 'success'
            ? 'SECURITY RECOVERY'
            : step === 1
            ? 'STEP 1 OF 3 • ACCOUNT RECOVERY'
            : step === 2
            ? 'STEP 2 OF 3 • CODE VERIFICATION'
            : 'STEP 3 OF 3 • SET NEW PASSWORD'}
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
          {status === 'success'
            ? 'Password updated.'
            : step === 1
            ? 'Reset your password.'
            : step === 2
            ? 'Enter verification code.'
            : 'Create new password.'}
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
            ? 'Your account credentials have been securely updated. You can now sign in.'
            : step === 1
            ? 'Enter your registered email address and we will send a 6-digit verification code.'
            : step === 2
            ? `We sent a 6-digit verification code to ${email}.`
            : 'Choose a secure password for your MDefender Pro account.'}
        </p>
      </div>

      {/* Success State View */}
      {status === 'success' ? (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: '8px',
              background: '#E8F3EC',
              border: '1px solid #CFE2D4',
              color: '#28745D',
              fontSize: '12.5px',
              fontWeight: 500,
              marginBottom: '20px',
              lineHeight: 1.5,
            }}
          >
            <CheckCircle2 size={16} style={{ color: '#28745D', flexShrink: 0 }} />
            <span>{message || 'Password successfully updated! Your account is secured.'}</span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/user/login?reset=true')}
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
            <span>Sign in with new password</span>
            <ArrowRight size={15} strokeWidth={2.4} />
          </button>
        </div>
      ) : (
        <>
          {/* Error Notification */}
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

          {/* ══════════════════════════════════════════════
              STEP 1: Enter Email
          ══════════════════════════════════════════════ */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '17px' }}>
              <div>
                <label
                  htmlFor="forgot-email"
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#10201E',
                    marginBottom: '8px',
                  }}
                >
                  Registered email address
                </label>
                <input
                  id="forgot-email"
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
                <div style={{ fontSize: '11px', color: '#60716B', marginTop: '6px' }}>
                  A 6-digit OTP will be dispatched to this email address.
                </div>
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
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
                  cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 16px rgba(11, 37, 34, 0.14)',
                  transition: 'all 0.18s ease',
                  marginTop: '2px',
                  opacity: status === 'loading' ? 0.8 : 1,
                }}
              >
                <span>{status === 'loading' ? 'Sending code...' : 'Send 6-digit OTP'}</span>
                {status !== 'loading' && <ArrowRight size={15} strokeWidth={2.4} />}
              </button>
            </form>
          )}

          {/* ══════════════════════════════════════════════
              STEP 2: Enter 6-digit OTP ONLY (With 60s Live Countdown)
          ══════════════════════════════════════════════ */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '17px' }}>
              {/* Highlighted Inbox Notice with Live 60-second Timer */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #D9E1DC',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: '#E8F3EC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#28745D',
                    flexShrink: 0,
                  }}
                >
                  <Mail size={14} strokeWidth={2.2} />
                </div>
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#10201E' }}>
                    Code sent to <strong>{email}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#60716B', marginTop: '1px' }}>
                    {countdown > 0 ? (
                      <span>Valid for <strong>{formattedCountdown}</strong></span>
                    ) : (
                      <span style={{ color: '#E8792F', fontWeight: 600 }}>Code expired. Click resend below.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Six Individual OTP Boxes */}
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
                      autoFocus={index === 0}
                      className="auth-input-field"
                      style={{
                        width: '44px',
                        height: '46px',
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

              {/* Verify Code Button */}
              <button
                type="submit"
                disabled={status === 'loading' || digits.join('').length < 6}
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
                  cursor: status === 'loading' || digits.join('').length < 6 ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 16px rgba(11, 37, 34, 0.14)',
                  transition: 'all 0.18s ease',
                  marginTop: '4px',
                  opacity: status === 'loading' || digits.join('').length < 6 ? 0.75 : 1,
                }}
              >
                <span>{status === 'loading' ? 'Verifying code...' : 'Verify Code & Continue'}</span>
                {status !== 'loading' && <ArrowRight size={15} strokeWidth={2.4} />}
              </button>

              {/* Resend Code Action with 60s countdown */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  marginTop: '2px',
                }}
              >
                <span style={{ color: '#60716B' }}>Didn't receive the OTP?</span>
                {countdown > 0 ? (
                  <span style={{ color: '#87948D', fontWeight: 600 }}>
                    Resend in {formattedCountdown}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={status === 'loading'}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#E8792F',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </form>
          )}

          {/* ══════════════════════════════════════════════
              STEP 3: Enter New Password & Confirm Password
          ══════════════════════════════════════════════ */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '17px' }}>
              {/* New Password */}
              <div>
                <label
                  htmlFor="reset-new-password"
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#10201E',
                    marginBottom: '8px',
                  }}
                >
                  New password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reset-new-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars with upper, lower, number, symbol"
                    required
                    autoFocus
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
                  <div style={{ marginTop: '7px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {[
                      { label: '8+ chars', valid: hasMin },
                      { label: 'Upper', valid: hasUpper },
                      { label: 'Lower', valid: hasLower },
                      { label: 'Number', valid: hasDigit },
                      { label: 'Symbol', valid: hasSpecial },
                    ].map((req, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: req.valid ? '#E8F3EC' : '#FFF4ED',
                          border: `1px solid ${req.valid ? '#CFE2D4' : '#F2C7A7'}`,
                          color: req.valid ? '#28745D' : '#A34F22',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <span>{req.valid ? '✓' : '•'}</span>
                        <span>{req.label}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: '#60716B', marginTop: '5px' }}>
                    Strict policy: 8+ chars, upper, lower, number, special symbol.
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label
                  htmlFor="reset-confirm-password"
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#10201E',
                    marginBottom: '8px',
                  }}
                >
                  Confirm new password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reset-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your new password"
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
                  <div style={{ fontSize: '11px', color: '#A34F22', fontWeight: 600, marginTop: '5px' }}>
                    Passwords do not match.
                  </div>
                )}
              </div>

              {/* Submit Reset Button */}
              <button
                type="submit"
                disabled={status === 'loading' || !isStrong || isMismatch}
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
                  cursor: status === 'loading' || !isStrong || isMismatch ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 16px rgba(11, 37, 34, 0.14)',
                  transition: 'all 0.18s ease',
                  marginTop: '2px',
                  opacity: status === 'loading' || !isStrong || isMismatch ? 0.75 : 1,
                }}
              >
                <span>{status === 'loading' ? 'Saving new password...' : 'Update Password & Secure Account'}</span>
                {status !== 'loading' && <ArrowRight size={15} strokeWidth={2.4} />}
              </button>
            </form>
          )}

          {/* Bottom Switcher: Back to sign in */}
          <div
            style={{
              marginTop: '24px',
              textAlign: 'center',
            }}
          >
            <Link
              to="/user/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#60716B',
                textDecoration: 'none',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#E8792F')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#60716B')}
            >
              <ArrowLeft size={13} strokeWidth={2.4} />
              <span>Back to sign in</span>
            </Link>
          </div>
        </>
      )}

      <style>{`
        .auth-input-field:focus {
          border-color: #E8792F !important;
          box-shadow: 0 0 0 3px rgba(232, 121, 47, 0.14) !important;
        }
        .auth-primary-btn:hover:not(:disabled) {
          background-color: #153B34 !important;
          transform: translateY(-1px) !important;
        }
      `}</style>
    </AuthSplitLayout>
  );
}
