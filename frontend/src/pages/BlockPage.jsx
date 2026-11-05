import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/api'

export default function BlockPage() {
  const [params] = useSearchParams()
  
  const attackType = params.get('attack_type') || 'Cross-Site Scripting (XSS)'
  const clientIp = params.get('client_ip') || '103.120.45.241'
  const realIp = params.get('real_ip') || clientIp
  const reason = params.get('reason') || 'Request blocked by active security rule (Pattern Match)'
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

  const handleCopyReferenceId = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(referenceId).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }).catch(() => {
        alert('Reference ID: ' + referenceId)
      })
    } else {
      alert('Reference ID: ' + referenceId)
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
          width: 100%;
          height: 100vh;
          max-height: 100vh;
          margin: 0;
          padding: 0;
          background-color: #ffffff;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #334155;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          box-sizing: border-box;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .cf-content-wrap {
          max-width: 820px;
          width: 100%;
          margin: 0 auto;
          padding: 0 20px;
          box-sizing: border-box;
        }

        /* Top Section */
        .cf-top-section {
          padding-top: 28px;
          padding-bottom: 16px;
          flex: 0 0 auto;
        }

        .cf-heading-wrap {
          margin-bottom: 16px;
        }

        .cf-main-title {
          font-size: 27px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 5px 0;
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
          color: #0f172a;
          font-weight: 600;
        }

        .cf-explainer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
        }

        .cf-explainer-col h2 {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 6px 0;
          line-height: 1.3;
        }

        .cf-explainer-col p {
          font-size: 13px;
          line-height: 1.6;
          color: #475569;
          margin: 0;
        }

        /* Center Banner */
        .cf-mockup-section {
          width: 100%;
          background-color: #eeeeee;
          border-top: 1px solid #e0e0e0;
          border-bottom: 1px solid #e0e0e0;
          padding: 24px 0;
          box-sizing: border-box;
          display: flex;
          justify-content: center;
          align-items: center;
          flex: 1 1 auto;
          min-height: 0;
        }

        .cf-browser-mockup {
          max-width: 780px;
          width: 100%;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.07);
          overflow: hidden;
          border: 1px solid #d4d4d4;
        }

        .cf-browser-header {
          background: #64748b;
          height: 32px;
          display: flex;
          align-items: center;
          padding: 0 14px;
          gap: 6px;
        }

        .cf-browser-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ffffff;
          opacity: 0.85;
          display: inline-block;
        }

        .cf-browser-address-bar {
          margin-left: 12px;
          background: rgba(255, 255, 255, 0.28);
          height: 18px;
          border-radius: 3px;
          width: 45%;
          max-width: 240px;
        }

        .cf-browser-body {
          height: 175px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
        }

        .cf-badge-circle {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          background-color: #bd2426;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 18px rgba(189, 36, 38, 0.25);
        }

        /* Bottom Section */
        .cf-bottom-section {
          padding-top: 16px;
          padding-bottom: 24px;
          flex: 0 0 auto;
        }

        .cf-tech-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 14px 28px;
          margin-bottom: 16px;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 24px;
          align-items: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }

        .cf-tech-label {
          font-size: 10.5px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }

        .cf-tech-value {
          font-size: 13.5px;
          font-weight: 600;
          color: #0f172a;
        }

        .cf-tech-mono {
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
        }

        .cf-action-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .cf-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          padding: 8.5px 22px;
          border-radius: 6px;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
        }

        .cf-btn-primary {
          background-color: #1e293b;
          color: #ffffff;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
        }

        .cf-btn-primary:hover {
          background-color: #0f172a;
        }

        .cf-btn-secondary {
          background-color: #ffffff;
          color: #334155;
          border-color: #cbd5e1;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        }

        .cf-btn-secondary:hover {
          background-color: #f8fafc;
          border-color: #94a3b8;
          color: #0f172a;
        }

        @media (max-height: 640px) or (max-width: 820px) {
          .cf-block-page-root {
            height: auto;
            max-height: none;
            overflow-y: auto;
          }
          .cf-explainer-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .cf-tech-card {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
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
          border-color: #0f172a;
        }
      `}</style>

      {/* Top Section */}
      <header className="cf-top-section">
        <div className="cf-content-wrap">
          <div className="cf-heading-wrap">
            <h1 className="cf-main-title">Access Restricted by Security Policy</h1>
            <p className="cf-main-subtitle">
              Your connection to <strong className="cf-site-host">{siteHost}</strong> was intercepted by automated security protection.
            </p>
          </div>
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
      </header>

      {/* Center Mockup Banner */}
      <section className="cf-mockup-section">
        <div className="cf-content-wrap" style={{ padding: 0 }}>
          <div className="cf-browser-mockup">
            <div className="cf-browser-header" aria-hidden="true">
              <span className="cf-browser-dot"></span>
              <span className="cf-browser-dot"></span>
              <span className="cf-browser-dot"></span>
              <span className="cf-browser-address-bar"></span>
            </div>
            <div className="cf-browser-body">
              <div className="cf-badge-circle" role="img" aria-label="Access Blocked">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Technical Section: Card & Buttons */}
      <footer className="cf-bottom-section">
        <div className="cf-content-wrap">
          <div className="cf-tech-card">
            <div>
              <div className="cf-tech-label">CLIENT IP ADDRESS</div>
              <div className="cf-tech-value cf-tech-mono">{clientIp}</div>
            </div>
            <div>
              <div className="cf-tech-label">INCIDENT REFERENCE ID</div>
              <div className="cf-tech-value cf-tech-mono">{referenceId}</div>
            </div>
            <div>
              <div className="cf-tech-label">TIMESTAMP (UTC)</div>
              <div className="cf-tech-value">{timestamp}</div>
            </div>
          </div>

          <div className="cf-action-row">
            <button type="button" className="cf-btn cf-btn-primary" onClick={() => window.location.href = '/'}>
              Return to Homepage
            </button>
            <button type="button" className="cf-btn cf-btn-secondary" onClick={handleCopyReferenceId}>
              {copied ? 'Copied!' : 'Copy Reference ID'}
            </button>
            <button type="button" className="cf-btn cf-btn-secondary" onClick={() => setReportModalOpen(true)}>
              Email Administrator
            </button>
          </div>
        </div>
      </footer>

      {/* Modal */}
      {reportModalOpen && (
        <div className="cf-modal-overlay" onClick={() => setReportModalOpen(false)}>
          <div className="cf-modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#bd2426' }}>
                Contact Security Operations
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
                  Incident Reference ID <strong>{referenceId}</strong> has been logged to the SOC team.
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
                    {submitting ? 'Submitting...' : 'Submit to SOC'}
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
