import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  KeyRound,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import api from '../../api/api';
import AuthSplitLayout from '../../components/AuthSplitLayout';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    setMessage('');
    try {
      const data = await api.forgotPassword(email.trim().toLowerCase());
      setStatus('success');
      setMessage(data.message || 'If an account exists for that email, a password reset link is on its way.');
    } catch {
      setStatus('success');
      setMessage('If an account exists for that email, a password reset link is on its way.');
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
            background: status === 'success' ? '#E8F3EC' : '#E8EEE8',
            border: `1px solid ${status === 'success' ? '#CFE2D4' : '#D4E1D6'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: status === 'success' ? '#28745D' : '#10201E',
          }}
        >
          {status === 'success' ? (
            <ShieldCheck size={18} strokeWidth={2.4} />
          ) : (
            <KeyRound size={17} strokeWidth={2.2} />
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
          ACCOUNT RECOVERY
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
          {status === 'success' ? 'Check your inbox.' : 'Reset your password securely.'}
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
            ? 'If an account exists for that email, a password reset link is on its way.'
            : 'Enter your account email and we will send a secure reset link.'}
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
            <span>If an account exists for that email, a password reset link is on its way.</span>
          </div>

          <Link
            to="/user/login"
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
              textDecoration: 'none',
              boxShadow: '0 8px 16px rgba(11, 37, 34, 0.14)',
              transition: 'all 0.18s ease',
            }}
          >
            <span>Back to sign in</span>
            <ArrowRight size={15} strokeWidth={2.4} />
          </Link>
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

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '17px' }}>
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
                Email address
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
                We never reveal whether an account exists.
              </div>
            </div>

            {/* Primary CTA Button: height 45px */}
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
              <span>{status === 'loading' ? 'Sending link...' : 'Send reset link'}</span>
              {status !== 'loading' && <ArrowRight size={15} strokeWidth={2.4} />}
            </button>
          </form>

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
