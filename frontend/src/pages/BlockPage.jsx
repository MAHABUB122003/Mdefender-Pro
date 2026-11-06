import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function BlockPage() {
  const [searchParams] = useSearchParams();

  // Dynamic parameters or sensible fallback defaults
  const domain = searchParams.get('domain') || window.location.hostname || 'mahabubur.shop';
  const rayId = searchParams.get('ray_id') || searchParams.get('ref_id') || 'MDEF-2070BF20';
  const ip = searchParams.get('ip') || '103.120.45.241';
  const ruleName = searchParams.get('rule') || 'Pre-Flight WAAP: SQL & NoSQL Injection Guard';
  const timestamp = searchParams.get('timestamp') || new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  const [copied, setCopied] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportEmail, setReportEmail] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const handleCopy = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(rayId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReportSubmit = (e) => {
    e.preventDefault();
    setReportSubmitted(true);
    setTimeout(() => {
      setIsReportOpen(false);
      setReportSubmitted(false);
      setReportEmail('');
      setReportNote('');
    }, 1800);
  };

  return (
    <div className="bp-root">
      <style>{`
        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html, body {
          width: 100%;
          min-height: 100%;
          background-color: #ffffff;
        }

        .bp-root {
          width: 100%;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", Arial, sans-serif;
          color: #333333;
          -webkit-font-smoothing: antialiased;
        }

        .bp-content-wrap {
          max-width: 900px;
          width: 100%;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* Top Heading Section */
        .bp-header-section {
          padding-top: 52px;
          padding-bottom: 28px;
        }

        .bp-policy-pill {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #555555;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          padding: 4px 12px;
          border-radius: 9999px;
          margin-bottom: 12px;
        }

        .bp-title {
          font-size: 38px;
          font-weight: 400;
          color: #333333;
          margin: 0 0 8px 0;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .bp-subtitle {
          font-size: 16px;
          font-weight: 400;
          color: #666666;
          margin: 0;
          line-height: 1.4;
        }

        .bp-domain {
          color: #333333;
          font-weight: 500;
        }

        /* Center Full-Width Gray Section with Browser Mockup */
        .bp-mockup-section {
          width: 100%;
          background-color: #eeeeee;
          border-top: 1px solid #e2e2e2;
          border-bottom: 1px solid #e2e2e2;
          padding: 48px 24px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .bp-browser-mockup {
          max-width: 720px;
          width: 100%;
          background: #ffffff;
          border-radius: 6px;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
          overflow: hidden;
          border: 1px solid #dcdcdc;
        }

        .bp-browser-header {
          background: #8a8a8a;
          height: 38px;
          display: flex;
          align-items: center;
          padding: 0 14px;
          gap: 6px;
        }

        .bp-browser-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ffffff;
          opacity: 0.85;
          display: inline-block;
        }

        .bp-browser-address-bar {
          margin-left: 14px;
          background: rgba(255, 255, 255, 0.3);
          height: 20px;
          border-radius: 3px;
          width: 38%;
          max-width: 220px;
        }

        .bp-browser-body {
          height: 270px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
        }

        .bp-badge-circle {
          width: 94px;
          height: 94px;
          border-radius: 50%;
          background-color: #bd2426;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 18px rgba(189, 36, 38, 0.22);
        }

        .bp-badge-circle svg {
          width: 44px;
          height: 44px;
          stroke: #ffffff;
          stroke-width: 3.4;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        /* Bottom 2 Columns */
        .bp-columns-section {
          padding-top: 48px;
          padding-bottom: 36px;
        }

        .bp-columns-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 52px;
        }

        @media (max-width: 740px) {
          .bp-columns-grid {
            grid-template-columns: 1fr;
            gap: 28px;
          }
        }

        .bp-col-heading {
          font-size: 18px;
          font-weight: 500;
          color: #333333;
          margin: 0 0 12px 0;
          line-height: 1.3;
        }

        .bp-col-desc {
          font-size: 14px;
          line-height: 1.65;
          color: #555555;
          margin: 0;
        }

        .bp-attack-pill {
          margin-top: 14px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #fee2e2;
          border: 1px solid #fca5a5;
          border-radius: 4px;
          font-size: 12px;
          color: #991b1b;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
        }

        .bp-action-tools {
          margin-top: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .bp-btn-contact {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #2b2b2b;
          color: #ffffff;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .bp-btn-contact:hover {
          background: #111111;
        }

        .bp-btn-copy {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .bp-btn-copy:hover {
          background: #e5e7eb;
          color: #111111;
        }

        /* Footer Metadata */
        .bp-footer-section {
          border-top: 1px solid #e2e2e2;
          padding: 26px 0 36px 0;
        }

        .bp-footer-meta {
          font-size: 13px;
          color: #777777;
          line-height: 1.8;
          text-align: center;
        }

        .bp-footer-meta strong {
          color: #222222;
        }

        .bp-meta-dot {
          margin: 0 10px;
          color: #9ca3af;
        }

        .bp-ip-mono {
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
          color: #374151;
          font-weight: 500;
        }

        /* Modal Styles */
        .bp-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }

        .bp-modal-card {
          background: #ffffff;
          border-radius: 8px;
          max-width: 480px;
          width: 100%;
          padding: 24px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
      `}</style>

      {/* Top Heading Section */}
      <header className="bp-header-section">
        <div className="bp-content-wrap">
          <span className="bp-policy-pill">MDEFENDER PRO &bull; EDGE POLICY ENFORCEMENT</span>
          <h1 className="bp-title">Access Restricted by Security Policy</h1>
          <p className="bp-subtitle">
            Your connection to <span className="bp-domain">{domain}</span> was flagged and intercepted by automated threat protection.
          </p>
        </div>
      </header>

      {/* Center Full-Width Gray Section with Browser Mockup */}
      <section className="bp-mockup-section">
        <div className="bp-browser-mockup">
          <div className="bp-browser-header" aria-hidden="true">
            <span className="bp-browser-dot"></span>
            <span className="bp-browser-dot"></span>
            <span className="bp-browser-dot"></span>
            <span className="bp-browser-address-bar"></span>
          </div>
          <div className="bp-browser-body">
            <div className="bp-badge-circle" role="img" aria-label="Blocked Access">
              <svg viewBox="0 0 24 24" fill="none">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Explanations */}
      <main className="bp-columns-section">
        <div className="bp-content-wrap">
          <div className="bp-columns-grid">
            {/* Left Column */}
            <div>
              <h2 className="bp-col-heading">Why have I been blocked?</h2>
              <p className="bp-col-desc">
                This website is using a security service to protect itself from online attacks. The action you just performed triggered the security solution. There are several actions that could trigger this block including submitting a certain word or phrase, a SQL command or malformed data.
              </p>
              <div className="bp-attack-pill">
                <span>Violation:</span>
                <strong>{ruleName}</strong>
              </div>
            </div>

            {/* Right Column */}
            <div>
              <h2 className="bp-col-heading">What can I do to resolve this?</h2>
              <p className="bp-col-desc">
                You can email the site owner to let them know you were blocked. Please include what you were doing when this page came up and the MDefender Ray ID found at the bottom of this page.
              </p>
              <div className="bp-action-tools">
                <button
                  type="button"
                  className="bp-btn-contact"
                  onClick={() => setIsReportOpen(true)}
                >
                  Contact Site Administrator
                </button>
                <button
                  type="button"
                  className="bp-btn-copy"
                  onClick={handleCopy}
                  style={copied ? { borderColor: '#10b981', color: '#10b981' } : {}}
                >
                  {copied ? 'Copied!' : 'Copy Ray ID'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Metadata */}
      <footer className="bp-footer-section">
        <div className="bp-content-wrap">
          <div className="bp-footer-meta">
            <div>
              <span>MDefender Ray ID: <strong>{rayId}</strong></span>
              <span className="bp-meta-dot">&bull;</span>
              <span>Your IP: <span className="bp-ip-mono">{ip}</span></span>
              <span className="bp-meta-dot">&bull;</span>
              <span>Performance &amp; security by <strong>MDefender Pro</strong></span>
            </div>
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#888888' }}>
              <span>Timestamp: {timestamp}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Report False Positive Modal */}
      {isReportOpen && (
        <div className="bp-modal-overlay" onClick={() => setIsReportOpen(false)}>
          <div className="bp-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
              Report False Positive / Request Access
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              Your report will be sent to the security team of <strong>{domain}</strong> along with Ray ID <code>{rayId}</code>.
            </p>
            {reportSubmitted ? (
              <div style={{ padding: '16px', background: '#ecfdf5', color: '#065f46', borderRadius: '6px', fontSize: '13px', fontWeight: 500, textAlign: 'center' }}>
                Report sent successfully! The administrator will review your incident.
              </div>
            ) : (
              <form onSubmit={handleReportSubmit}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Your Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={reportEmail}
                    onChange={(e) => setReportEmail(e.target.value)}
                    placeholder="user@example.com"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    What were you doing when blocked?
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    placeholder="Describe your actions so the administrator can verify your request..."
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsReportOpen(false)}
                    style={{ padding: '7px 14px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontSize: '13px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '7px 16px', borderRadius: '4px', border: 'none', background: '#1e293b', color: '#ffffff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                  >
                    Send Incident Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
