import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/api'

export default function BlockPage() {
  const [params] = useSearchParams()
  
  const attackType = params.get('attack_type') || 'Suspicious Request Pattern'
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
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .cf-wrap {
          max-width: 920px;
          width: 100%;
          margin: 0 auto;
          padding: 0 24px;
          box-sizing: border-box;
        }

        .cf-top-section {
          padding-top: 44px;
          padding-bottom: 34px;
        }

        .cf-top-header {
          margin-bottom: 26px;
        }

        .cf-main-title {
          font-size: 34px;
          font-weight: 500;
          color: #1e293b;
          margin: 0 0 8px 0;
          letter-spacing: -0.02em;
          line-height: 1.25;
        }

        .cf-main-subtitle {
          font-size: 15px;
          font-weight: 400;
          color: #64748b;
          margin: 0;
          line-height: 1.5;
        }

        .cf-site-host {
          color: #1e293b;
          font-weight: 600;
        }

        .cf-explainer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
        }

        .cf-explainer-col h2 {
          font-size: 17.5px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 10px 0;
          line-height: 1.3;
        }

        .cf-explainer-col p {
          font-size: 14px;
          line-height: 1.65;
          color: #475569;
          margin: 0;
        }

        .cf-mockup-section {
          width: 100%;
          background-color: #eeeeee;
          border-top: 1px solid #e0e0e0;
          border-bottom: 1px solid #e0e0e0;
          padding: 44px 24px;
          box-sizing: border-box;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .cf-browser-mockup {
          max-width: 720px;
          width: 100%;
          background: #ffffff;
          border-radius: 6px;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
          overflow: hidden;
          border: 1px solid #dcdcdc;
        }

        .cf-browser-header {
          background: #8a8a8a;
          height: 38px;
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

        .cf-browser-bar-input {
          margin-left: 14px;
          background: rgba(255, 255, 255, 0.3);
          height: 20px;
          border-radius: 3px;
          width: 38%;
          max-width: 220px;
        }

        .cf-browser-body {
          height: 260px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
        }

        .cf-badge-circle {
          width: 94px;
          height: 94px;
          border-radius: 50%;
          background-color: #bd2426;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 18px rgba(189, 36, 38, 0.22);
        }

        .cf-bottom-section {
          padding-top: 36px;
          padding-bottom: 30px;
        }

        .cf-tech-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 18px 24px;
          margin-bottom: 24px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .cf-tech-label {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }

        .cf-tech-value {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
        }

        .cf-tech-mono {
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
          font-size: 13.5px;
          color: #0f172a;
        }

        .cf-action-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }

        .cf-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 20px;
          border-radius: 6px;
          font-size: 13.5px;
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

        .cf-footer-section {
          margin-top: auto;
          border-top: 1px solid #e2e8f0;
          padding: 20px 0 28px 0;
          text-align: center;
          font-size: 12.5px;
          color: #94a3b8;
        }

        .cf-footer-section strong {
          color: #475569;
        }

        @media (max-width: 740px) {
          .cf-explainer-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .cf-main-title {
            font-size: 26px;
          }
          .cf-mockup-section {
            padding: 28px 16px;
          }
          .cf-browser-body {
            height: 200px;
          }
          .cf-badge-circle {
            width: 74px;
            height: 74px;
          }
          .cf-tech-card {
            grid-template-columns: 1fr;
            gap: 14px;
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
          padding: 28px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.25);
          text-align: left;
        }

        .cf-input {
          width: 100%;
          padding: 9px 12px;
          border-radius: 6px;
          border: 1px solid #d1d5db;
          font-size: 14px;
          margin-bottom: 12px;
          box-sizing: border-box;
          outline: none;
        }
        .cf-input:focus {
          border-color: #1e293b;
        }
      `}</style>

      {/* Top Section: Title & 2 Columns */}
      <header className="cf-top-section">
        <div className="cf-wrap">
          <div className="cf-top-header">
            <h1 className="cf-main-title">Access Restricted by Security Policy</h1>
            <p className="cf-main-subtitle">
              Your connection to <span className="cf-site-host">{siteHost}</span> was intercepted by automated security protection.
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
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Technical Details & Action Row */}
      <main className="cf-bottom-section">
        <div className="cf-wrap">
          <div className="cf-tech-card">
            <div>
              <div className="cf-tech-label">Client IP Address</div>
              <div className="cf-tech-value cf-tech-mono">{clientIp}</div>
            </div>
            <div>
              <div className="cf-tech-label">Incident Reference ID</div>
              <div className="cf-tech-value cf-tech-mono">{referenceId}</div>
            </div>
            <div>
              <div className="cf-tech-label">Timestamp (UTC)</div>
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
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#bd2426' }}>
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
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  &#10003;
                </div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#111827' }}>Report Submitted</h4>
                <p style={{ fontSize: '13.5px', color: '#6b7280', margin: '0 0 18px 0', lineHeight: 1.5 }}>
                  Reference ID <strong>{referenceId}</strong> has been forwarded to the SOC administrators.
                </p>
                <button className="cf-btn cf-btn-primary" onClick={() => setReportModalOpen(false)} style={{ margin: '0 auto' }}>
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit}>
                <p style={{ fontSize: '13px', color: '#666666', marginBottom: '16px', lineHeight: 1.5 }}>
                  If your request was blocked erroneously, provide your email and details below for administrative review.
                </p>

                {errorMsg && (
                  <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fee2e2', color: '#991b1b', fontSize: '12.5px', marginBottom: '12px' }}>
                    {errorMsg}
                  </div>
                )}

                <div style={{ marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: '#374151' }}>Reference ID</div>
                <input type="text" className="cf-input" value={referenceId} disabled style={{ background: '#f9fafb', color: '#6b7280' }} />

                <div style={{ marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: '#374151' }}>Your Email (Optional)</div>
                <input
                  type="email"
                  className="cf-input"
                  placeholder="contact@yourdomain.com"
                  value={userEmail}
                  onChange={e => setUserEmail(e.target.value)}
                />

                <div style={{ marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: '#374151' }}>What were you trying to do?</div>
                <textarea
                  rows={3}
                  className="cf-input"
                  placeholder="Describe your actions before the block page appeared..."
                  value={userComment}
                  onChange={e => setUserComment(e.target.value)}
                  style={{ resize: 'vertical' }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
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
