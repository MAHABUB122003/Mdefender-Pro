import React, { useState } from 'react';
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
        :root {
            --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", Arial, sans-serif;
            --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", "Courier New", monospace;
            --text-main: #333333;
            --text-sub: #555555;
            --text-muted: #777777;
            --bg-gray: #eeeeee;
            --browser-bar: #8a8a8a;
            --alert-red: #bd2426;
        }

        *,
        *::before,
        *::after {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html,
        body {
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: #ffffff;
            font-family: var(--font-family);
            color: var(--text-main);
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        .bp-root {
            width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background-color: #ffffff;
            overflow: hidden;
        }

        .content-wrap {
            max-width: 1100px;
            width: 100%;
            margin: 0 auto;
            padding: 0 36px;
        }

        /* Top Heading Section */
        .header-section {
            padding-top: 18px;
            padding-bottom: 12px;
        }

        .policy-pill {
            display: inline-block;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #555555;
            background: #f3f4f6;
            border: 1px solid #e5e7eb;
            padding: 3px 12px;
            border-radius: 9999px;
            margin-bottom: 6px;
        }

        .blocked-title {
            font-size: 40px;
            font-weight: 400;
            color: #333333;
            margin: 0 0 6px 0;
            letter-spacing: -0.02em;
            line-height: 1.15;
        }

        .blocked-subtitle {
            font-size: 16px;
            font-weight: 400;
            color: #666666;
            margin: 0;
            line-height: 1.35;
        }

        .blocked-domain {
            color: #333333;
            font-weight: 500;
        }

        /* Center Full-Width Gray Section with Browser Mockup */
        .mockup-section {
            width: 100%;
            background-color: var(--bg-gray);
            border-top: 1px solid #dcdcdc;
            border-bottom: none;
            padding: 38px 36px 0 36px;
            display: flex;
            justify-content: center;
            align-items: flex-end;
        }

        .browser-mockup {
            max-width: 980px;
            width: 100%;
            background: #ffffff;
            border-top-left-radius: 10px;
            border-top-right-radius: 10px;
            border-bottom-left-radius: 0px;
            border-bottom-right-radius: 0px;
            box-shadow: 0 -4px 22px rgba(0, 0, 0, 0.06);
            overflow: hidden;
            border: 1px solid #dcdcdc;
            border-bottom: none;
        }

        .browser-header {
            background: var(--browser-bar);
            height: 38px;
            display: flex;
            align-items: center;
            padding: 0 16px;
            gap: 8px;
        }

        .browser-dot {
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: #ffffff;
            opacity: 0.85;
            display: inline-block;
        }

        .browser-address-bar {
            margin-left: 16px;
            background: rgba(255, 255, 255, 0.3);
            height: 20px;
            border-radius: 3px;
            width: 38%;
            max-width: 240px;
        }

        .browser-body {
            height: 305px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
        }

        .block-badge-circle {
            width: 104px;
            height: 104px;
            border-radius: 50%;
            background-color: var(--alert-red);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 6px 22px rgba(189, 36, 38, 0.25);
        }

        .block-badge-circle svg {
            width: 48px;
            height: 48px;
            stroke: #ffffff;
            stroke-width: 3.4;
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        /* Bottom 2 Columns */
        .columns-section {
            padding-top: 18px;
            padding-bottom: 18px;
        }

        .columns-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 52px;
        }

        @media (max-width: 740px) {
            .columns-grid {
                grid-template-columns: 1fr;
                gap: 16px;
            }
            html, body, .bp-root {
                overflow: auto;
            }
        }

        .col-heading {
            font-size: 18px;
            font-weight: 500;
            color: #333333;
            margin: 0 0 6px 0;
            line-height: 1.3;
        }

        .col-desc {
            font-size: 14px;
            line-height: 1.55;
            color: #555555;
            margin: 0;
        }

        .attack-pill {
            margin-top: 10px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 3px 10px;
            background: #fee2e2;
            border: 1px solid #fca5a5;
            border-radius: 4px;
            font-size: 12px;
            color: #991b1b;
            font-family: var(--font-mono);
        }

        .action-tools {
            margin-top: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }

        .btn-contact {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 7px 15px;
            background: #2b2b2b;
            color: #ffffff;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 500;
            border: none;
            cursor: pointer;
            transition: background 0.15s ease;
        }

        .btn-contact:hover {
            background: #111111;
        }

        .btn-copy {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 7px 15px;
            background: #f3f4f6;
            color: #374151;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .btn-copy:hover {
            background: #e5e7eb;
            color: #111111;
        }

        /* Footer Metadata */
        .footer-section {
            border-top: 1px solid #e2e2e2;
            padding: 10px 0 12px 0;
            background: #fafafa;
        }

        .footer-meta {
            font-size: 12.5px;
            color: var(--text-muted);
            line-height: 1.4;
            text-align: center;
        }

        .footer-meta strong {
            color: #222222;
        }

        .meta-dot {
            margin: 0 8px;
            color: #9ca3af;
        }

        .ip-mono {
            font-family: var(--font-mono);
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
      <header className="header-section">
        <div className="content-wrap">
          <span className="policy-pill">MDEFENDER PRO &bull; EDGE POLICY ENFORCEMENT</span>
          <h1 className="blocked-title">Access Restricted by Security Policy</h1>
          <p className="blocked-subtitle">
            Your connection to <span className="blocked-domain">{domain}</span> was flagged and intercepted by automated threat protection.
          </p>
        </div>
      </header>

      {/* Center Full-Width Gray Section with Browser Mockup Connected to Bottom Background */}
      <section className="mockup-section">
        <div className="browser-mockup">
          <div className="browser-header" aria-hidden="true">
            <span className="browser-dot"></span>
            <span className="browser-dot"></span>
            <span className="browser-dot"></span>
            <span className="browser-address-bar"></span>
          </div>
          <div className="browser-body">
            <div className="block-badge-circle" role="img" aria-label="Blocked Access">
              <svg viewBox="0 0 24 24" fill="none">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Explanations */}
      <main className="columns-section">
        <div className="content-wrap">
          <div className="columns-grid">
            {/* Left Column */}
            <div>
              <h2 className="col-heading">Why have I been blocked?</h2>
              <p className="col-desc">
                This website is using a security service to protect itself from online attacks. The action you just performed triggered the security solution. There are several actions that could trigger this block including submitting a certain word or phrase, a SQL command or malformed data.
              </p>
              <div className="attack-pill">
                <span>Violation:</span>
                <strong>{ruleName}</strong>
              </div>
            </div>

            {/* Right Column */}
            <div>
              <h2 className="col-heading">What can I do to resolve this?</h2>
              <p className="col-desc">
                You can email the site owner to let them know you were blocked. Please include what you were doing when this page came up and the MDefender Ray ID found at the bottom of this page.
              </p>
              <div className="action-tools">
                <button
                  type="button"
                  className="btn-contact"
                  onClick={() => setIsReportOpen(true)}
                >
                  Contact Site Administrator
                </button>
                <button
                  type="button"
                  className="btn-copy"
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
      <footer className="footer-section">
        <div className="content-wrap">
          <div className="footer-meta">
            <div>
              <span>MDefender Ray ID: <strong id="rayIdVal">{rayId}</strong></span>
              <span className="meta-dot">&bull;</span>
              <span>Your IP: <span className="ip-mono">{ip}</span></span>
              <span className="meta-dot">&bull;</span>
              <span>Performance &amp; security by <strong>MDefender Pro</strong></span>
            </div>
            <div style={{ marginTop: '2px', fontSize: '11.5px', color: '#888888' }}>
              <span>Timestamp: <span>{timestamp}</span></span>
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
