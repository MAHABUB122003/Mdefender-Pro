import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/api'

export default function BlockPage() {
  const [params] = useSearchParams()
  
  const attackType = params.get('attack_type') || 'Cross-Site Scripting (XSS)'
  const clientIp = params.get('client_ip') || '127.0.0.1'
  const realIp = params.get('real_ip') || clientIp
  const reason = params.get('reason') || 'Request intercepted by security policy'
  const timestamp = params.get('timestamp') || new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
  const referenceId = params.get('reference_id') || ('MDEF-' + Math.random().toString(36).substr(2, 8).toUpperCase())
  const targetUrl = params.get('url') || window.location.pathname
  const siteHost = params.get('host') || window.location.hostname || 'mahabubur.shop'

  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userComment, setUserComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCopyRayId = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(referenceId).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }).catch(() => {
        alert('Ray ID: ' + referenceId)
      })
    } else {
      alert('Ray ID: ' + referenceId)
    }
  }

  const handleReportSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')
    try {
      await api.reportFalsePositive({
        reference_id: referenceId,
        client_ip: realIp,
        url: targetUrl,
        payload: window.location.search || targetUrl,
        attack_type: attackType,
        reason: reason,
        user_email: userEmail,
        comments: userComment,
      })
      setSubmitted(true)
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit report. Please email the administrator.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="cf-block-page-root">
      <style>{`
        .cf-block-page-root {
          min-height: 100vh;
          width: 100%;
          background-color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", Arial, sans-serif;
          color: #475569;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .cf-wrap {
          max-width: 860px;
          width: 100%;
          margin: 0 auto;
          padding: 0 20px;
          box-sizing: border-box;
        }

        /* Top Header */
        .cf-top-header {
          padding-top: 22px;
          padding-bottom: 12px;
        }

        .cf-main-title {
          font-size: 25px;
          font-weight: 500;
          color: #1e293b;
          margin: 0 0 4px 0;
          letter-spacing: -0.015em;
          line-height: 1.25;
        }

        .cf-main-subtitle {
          font-size: 13.5px;
          font-weight: 400;
          color: #64748b;
          margin: 0;
        }

        .cf-site-host {
          color: #1e293b;
          font-weight: 600;
        }

        /* Mockup Band */
        .cf-mockup-section {
          width: 100%;
          background-color: #eeeeee;
          border-top: 1px solid #e0e0e0;
          border-bottom: 1px solid #e0e0e0;
          padding: 16px 20px;
          box-sizing: border-box;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .cf-browser-mockup {
          max-width: 540px;
          width: 100%;
          background: #ffffff;
          border-radius: 6px;
          box-shadow: 0 3px 12px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          border: 1px solid #dcdcdc;
        }

        .cf-browser-header {
          background: #8a8a8a;
          height: 30px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          gap: 5px;
        }

        .cf-browser-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ffffff;
          opacity: 0.85;
          display: inline-block;
        }

        .cf-browser-bar-input {
          margin-left: 10px;
          background: rgba(255, 255, 255, 0.3);
          height: 16px;
          border-radius: 3px;
          width: 35%;
          max-width: 180px;
        }

        .cf-browser-body {
          height: 145px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
        }

        .cf-badge-circle {
          width: 62px;
          height: 62px;
          border-radius: 50%;
          background-color: #bd2426;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(189, 36, 38, 0.2);
        }

        /* Explainer Section */
        .cf-explainer-section {
          padding-top: 18px;
          padding-bottom: 10px;
        }

        .cf-explainer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 36px;
        }

        .cf-explainer-col h2 {
          font-size: 15px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 6px 0;
          line-height: 1.3;
        }

        .cf-explainer-col p {
          font-size: 13px;
          line-height: 1.6;
          color: #475569;
          margin: 0;
        }

        /* Tech Strip */
        .cf-tech-strip {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px 16px;
          margin: 12px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 12.5px;
        }

        .cf-tech-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .cf-tech-label {
          color: #64748b;
          font-weight: 500;
        }

        .cf-tech-value {
          color: #1e293b;
          font-weight: 600;
        }

        .cf-tech-mono {
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
          color: #0f172a;
        }

        .cf-threat-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          background: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 4px;
          font-size: 11.5px;
          color: #991b1b;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        /* Action Row */
        .cf-action-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          margin: 10px 0 14px 0;
        }

        .cf-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 16px;
          border-radius: 5px;
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
        }

        .cf-btn-primary {
          background: #1e293b;
          color: #ffffff;
        }

        .cf-btn-primary:hover {
          background: #0f172a;
        }

        .cf-btn-secondary {
          background: #ffffff;
          color: #334155;
          border-color: #cbd5e1;
        }

        .cf-btn-secondary:hover {
          background: #f1f5f9;
        }

        /* Footer */
        .cf-footer-section {
          border-top: 1px solid #e2e8f0;
          padding: 10px 0 14px 0;
          text-align: center;
          font-size: 11.5px;
          color: #94a3b8;
        }

        .cf-footer-section strong {
          color: #475569;
        }

        @media (max-width: 740px) {
          .cf-explainer-grid {
            grid-template-columns: 1fr;
            gap: 18px;
          }
          .cf-main-title {
            font-size: 22px;
          }
          .cf-tech-strip {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
        }

        /* Modal */
        .cf-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .cf-modal-box {
          background: #ffffff;
          border-radius: 8px;
          padding: 26px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.25);
          text-align: left;
        }

        .cf-input {
          width: 100%;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #d1d5db;
          font-size: 13.5px;
          margin-bottom: 12px;
          box-sizing: border-box;
          outline: none;
        }
        .cf-input:focus {
          border-color: #1e293b;
        }
      `}</style>

      {/* Top Header */}
      <header className="cf-top-header">
        <div className="cf-wrap">
          <h1 className="cf-main-title">Access Restricted by Security Policy</h1>
          <p className="cf-main-subtitle">
            Your connection to <span className="cf-site-host">{siteHost}</span> was intercepted by automated security protection.
          </p>
        </div>
      </header>

      {/* Center Gray Mockup Band */}
      <section className="cf-mockup-section">
        <div className="cf-browser-mockup">
          <div className="cf-browser-header" aria-hidden="true">
            <span className="cf-browser-dot"></span>
            <span className="cf-browser-dot"></span>
            <span className="cf-browser-dot"></span>
            <span className="cf-browser-bar-input"></span>
          </div>
          <div className="cf-browser-body">
            <div className="cf-badge-circle" role="img" aria-label="Access Blocked">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Two Explainer Columns */}
      <section className="cf-explainer-section">
        <div className="cf-wrap">
          <div className="cf-explainer-grid">
            <div className="cf-explainer-col">
              <h2>Why was this request blocked?</h2>
              <p>
                This website employs MDefender Pro automated defense to safeguard infrastructure against malicious probes, automated abuse, and abnormal request patterns. Your interaction triggered an edge inspection security rule.
              </p>
            </div>
            <div className="cf-explainer-col">
              <h2>What can I do to resolve this?</h2>
              <p>
                If you believe this restriction was triggered by mistake, you can return to the homepage or notify the website administrator with your incident Reference ID and Client IP shown below.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Technical Details & Actions */}
      <main>
        <div className="cf-wrap">
          <div className="cf-tech-strip">
            <div className="cf-tech-item">
              <span className="cf-tech-label">Ray ID:</span>
              <span className="cf-tech-value cf-tech-mono">{referenceId}</span>
            </div>
            <div className="cf-tech-item">
              <span className="cf-tech-label">Your IP:</span>
              <span className="cf-tech-value cf-tech-mono">{clientIp}</span>
            </div>
            <div className="cf-tech-item">
              <span className="cf-tech-label">Threat Detected:</span>
              <span className="cf-threat-badge">{attackType}</span>
            </div>
            <div className="cf-tech-item">
              <span className="cf-tech-label">Timestamp:</span>
              <span className="cf-tech-value" style={{ fontSize: '11.5px' }}>{timestamp}</span>
            </div>
          </div>

          <div className="cf-action-row">
            <button type="button" className="cf-btn cf-btn-primary" onClick={() => window.location.href = '/'}>
              Return to Homepage
            </button>
            <button type="button" className="cf-btn cf-btn-secondary" onClick={handleCopyRayId}>
              {copied ? 'Copied!' : 'Copy Ray ID'}
            </button>
            <button type="button" className="cf-btn cf-btn-secondary" onClick={() => setReportModalOpen(true)}>
              Report False Positive
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="cf-footer-section">
        <div className="cf-wrap">
          <div>
            Performance &amp; security by <strong>MDefender Pro</strong> Enterprise WAF. Security incident logged and audited.
          </div>
        </div>
      </footer>

      {/* False Positive Report Modal */}
      {reportModalOpen && (
        <div className="cf-modal-overlay" onClick={() => setReportModalOpen(false)}>
          <div className="cf-modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#bd2426' }}>
                Report False Positive
              </h3>
              <button
                style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '20px', cursor: 'pointer' }}
                onClick={() => setReportModalOpen(false)}
              >
                &times;
              </button>
            </div>

            {submitted ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  &#10003;
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#111827' }}>Report Submitted</h4>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                  Incident Reference ID <strong>{referenceId}</strong> has been forwarded to the SOC administrators.
                </p>
                <button className="cf-btn cf-btn-primary" onClick={() => setReportModalOpen(false)} style={{ margin: '0 auto' }}>
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit}>
                <p style={{ fontSize: '12.5px', color: '#666666', marginBottom: '14px', lineHeight: 1.5 }}>
                  If your request was blocked erroneously, provide your email and details below for administrative review.
                </p>

                {errorMsg && (
                  <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fee2e2', color: '#991b1b', fontSize: '12.5px', marginBottom: '12px' }}>
                    {errorMsg}
                  </div>
                )}

                <div style={{ marginBottom: '4px', fontSize: '11.5px', fontWeight: 600, color: '#374151' }}>Incident Reference ID</div>
                <input type="text" className="cf-input" value={referenceId} disabled style={{ background: '#f9fafb', color: '#6b7280' }} />

                <div style={{ marginBottom: '4px', fontSize: '11.5px', fontWeight: 600, color: '#374151' }}>Your Email (Optional)</div>
                <input
                  type="email"
                  className="cf-input"
                  placeholder="contact@yourdomain.com"
                  value={userEmail}
                  onChange={e => setUserEmail(e.target.value)}
                />

                <div style={{ marginBottom: '4px', fontSize: '11.5px', fontWeight: 600, color: '#374151' }}>What were you trying to do?</div>
                <textarea
                  rows={3}
                  className="cf-input"
                  placeholder="Describe your actions before the block page appeared..."
                  value={userComment}
                  onChange={e => setUserComment(e.target.value)}
                  style={{ resize: 'vertical' }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                  <button type="button" className="cf-btn cf-btn-secondary" onClick={() => setReportModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="cf-btn cf-btn-primary" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
