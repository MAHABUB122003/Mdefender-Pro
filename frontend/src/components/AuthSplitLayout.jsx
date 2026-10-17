import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

export default function AuthSplitLayout({ children }) {
  return (
    <div
      style={{
        minHeight: 'calc(100vh - 76px)',
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        background: '#F7F6F1',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* ================= LEFT BRAND PANEL (45.5% Desktop) ================= */}
      <div
        className="hidden lg:flex"
        style={{
          width: '45.5%',
          minHeight: '100vh',
          background: '#0B2522',
          color: '#ffffff',
          padding: 'clamp(48px, 6vw, 92px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* Subtle Geometric Shapes: #153B34 and #1C3026 */}
        <div
          style={{
            position: 'absolute',
            bottom: '-240px',
            right: '-240px',
            width: '680px',
            height: '680px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #153B34 0%, transparent 70%)',
            opacity: 0.65,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            left: '-120px',
            width: '440px',
            height: '440px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #1C3026 0%, transparent 65%)',
            opacity: 0.8,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '18%',
            right: '12%',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            border: '1px solid rgba(232, 121, 47, 0.18)',
            pointerEvents: 'none',
          }}
        />

        {/* Top Brand Logo */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
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
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}
            >
              <img
                src="/assets/mdefender_logo.png"
                alt="MDefender Pro Logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <span
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-0.02em',
              }}
            >
              MDefender <span style={{ color: '#E8792F', fontWeight: 800 }}>Pro</span>
            </span>
          </Link>
        </div>

        {/* Middle Typography Block */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '480px', margin: 'auto 0', padding: '32px 0' }}>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#E8792F',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: '20px',
            }}
          >
            ENTERPRISE CYBERSECURITY
          </div>

          <h1
            style={{
              fontSize: 'clamp(48px, 4.8vw, 72px)',
              fontWeight: 550,
              lineHeight: 1.0,
              letterSpacing: '-0.075em',
              color: '#ffffff',
              marginBottom: '22px',
            }}
          >
            Confidence for<br />
            every website you run.
          </h1>

          <p
            style={{
              fontSize: '14px',
              lineHeight: 1.65,
              color: '#C4D4CA',
              marginBottom: '36px',
              maxWidth: '390px',
            }}
          >
            Protect your digital presence with one calm, intelligent workspace built for modern engineering teams.
          </p>

          {/* Security List: Gap 20px, text 12px, check icons 12-14px */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#E8EEE8' }}>
              <span style={{ color: '#28745D', fontWeight: 700, fontSize: '13px', lineHeight: 1 }}>✓</span>
              <span>Unified website visibility &amp; zero-day WAF</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#E8EEE8' }}>
              <span style={{ color: '#E8792F', fontWeight: 700, fontSize: '13px', lineHeight: 1 }}>✓</span>
              <span>&lt;0.12ms edge inspection latency</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#E8EEE8' }}>
              <span style={{ color: '#28745D', fontWeight: 700, fontSize: '13px', lineHeight: 1 }}>✓</span>
              <span>WordPress runtime protection &amp; auto-quarantine</span>
            </div>
          </div>
        </div>

        {/* Bottom Trust Text */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div
            style={{
              fontSize: '10px',
              color: '#B9C9C0',
              fontWeight: 500,
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#28745D',
              }}
            />
            <span>SOC-2 TYPE II READY • 99.99% GUARANTEED SLA</span>
          </div>
        </div>
      </div>

      {/* ================= RIGHT FORM PANEL (54.5% Desktop, 100% Mobile) ================= */}
      <div
        style={{
          width: '54.5%',
          minHeight: '100vh',
          background: '#F7F6F1',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          flexGrow: 1,
        }}
        className="auth-right-panel"
      >
        {/* Top-Left: Return to Homepage */}
        <div
          style={{
            position: 'absolute',
            top: '28px',
            left: 'clamp(20px, 4vw, 48px)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: 'calc(100% - clamp(40px, 8vw, 96px))',
          }}
        >
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#60716B',
              fontSize: '11.5px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#E8792F')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#60716B')}
          >
            <ArrowLeft size={14} strokeWidth={2.2} />
            <span>Back to homepage</span>
          </Link>

          {/* Compact Mobile Brand Mark */}
          <div className="flex lg:hidden">
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
              }}
            >
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '7px',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(11, 37, 34, 0.08)',
                }}
              >
                <img
                  src="/assets/mdefender_logo.png"
                  alt="MDefender Pro Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#10201E',
                }}
              >
                MDefender <span style={{ color: '#E8792F', fontWeight: 800 }}>Pro</span>
              </span>
            </Link>
          </div>
        </div>

        {/* Form Container: width 388px, starts ~125px from top */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: '125px',
            paddingBottom: '48px',
            paddingLeft: '20px',
            paddingRight: '20px',
            width: '100%',
          }}
        >
          <div
            className="auth-content-box"
            style={{
              width: '100%',
              maxWidth: '388px',
              position: 'relative',
            }}
          >
            {children}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .auth-right-panel {
            width: 100% !important;
          }
        }
        @media (max-width: 480px) {
          .auth-content-box {
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
