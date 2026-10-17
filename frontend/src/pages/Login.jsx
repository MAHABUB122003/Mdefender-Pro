import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  User,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react';
import api from '../api/api';
import adminStore from '../utils/adminStore';
import userStore from '../utils/userStore';

export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.adminLogin(username, password);
      if (data.status === 'success') {
        const user = data.user || { role: 'super_admin', username };
        userStore.set('admin_profile', user);
        adminStore.prefetchAdminData(api);
        if (onLoginSuccess) {
          onLoginSuccess(user);
        }
        navigate('/admin/dashboard', { replace: true });
      } else {
        setError(data.message || data.detail || 'Invalid administrative credentials.');
      }
    } catch (err) {
      setError(err.message || 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#fafaf9',
        color: '#0f172a',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* Ambient Top Glows */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '600px',
          height: '550px',
          background: 'radial-gradient(circle at 80% 10%, rgba(254, 215, 170, 0.35), transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '500px',
          height: '450px',
          background: 'radial-gradient(circle at 15% 90%, rgba(209, 250, 229, 0.3), transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Top Header Bar */}
      <header
        style={{
          padding: '20px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)',
            }}
          >
            <Shield size={17} strokeWidth={2.4} />
          </div>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
            M Defender <span style={{ color: '#ea580c', fontWeight: 800 }}>Pro</span>
          </span>
        </Link>

        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13.5px',
            fontWeight: 500,
            color: '#64748b',
            textDecoration: 'none',
            padding: '6px 12px',
            borderRadius: '8px',
            transition: 'color 0.18s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
        >
          <ArrowLeft size={14} />
          <span>Back to home</span>
        </Link>
      </header>

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 20px 48px 20px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '430px',
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.02)',
            padding: 'clamp(28px, 5vw, 40px)',
            animation: 'adminFadeIn 0.3s ease-out',
          }}
        >
          {/* Card Top Pill Badge */}
          <div style={{ textAlign: 'center', marginBottom: '26px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '9999px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
                fontWeight: 600,
                color: '#475569',
                marginBottom: '16px',
              }}
            >
              <ShieldAlert size={13} style={{ color: '#ea580c' }} />
              <span>Super Admin Console</span>
            </div>

            <h1
              style={{
                fontSize: '25px',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.025em',
                marginBottom: '8px',
              }}
            >
              Admin Authentication
            </h1>
            <p
              style={{
                fontSize: '14px',
                color: '#64748b',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Restricted management console for fleet-wide WAF policies and tenant administration.
            </p>
          </div>

          {/* Error Notification */}
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 14px',
                borderRadius: '10px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '20px',
              }}
            >
              <AlertCircle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} autoComplete="off">
            {/* Username */}
            <div style={{ marginBottom: '18px' }}>
              <label
                htmlFor="admin-username"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '7px',
                }}
              >
                Username or Admin Email
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <User size={16} />
                </div>
                <input
                  id="admin-username"
                  type="text"
                  required
                  autoFocus
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 40px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '14px',
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#ea580c';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(234, 88, 12, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '24px' }}>
              <label
                htmlFor="admin-password"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '7px',
                }}
              >
                Admin Password
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Lock size={16} />
                </div>
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 40px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '14px',
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#ea580c';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(234, 88, 12, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '10px',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                fontSize: '14.5px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.16)',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.75 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#1e293b';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#0f172a';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTopColor: '#ffffff',
                      animation: 'adminSpin 0.6s linear infinite',
                    }}
                  />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Admin</span>
                  <ArrowRight size={15} strokeWidth={2.4} />
                </>
              )}
            </button>
          </form>

          {/* Bottom Switch to User Login */}
          <div
            style={{
              textAlign: 'center',
              marginTop: '24px',
              fontSize: '13px',
              color: '#64748b',
            }}
          >
            Not an administrator?{' '}
            <Link
              to="/user/login"
              style={{
                color: '#ea580c',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Switch to Customer Login
            </Link>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes adminFadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes adminSpin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
