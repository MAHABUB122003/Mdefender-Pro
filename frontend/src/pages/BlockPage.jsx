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
          min-height: 100vh;
          width: 100%;
          background-color: #ffffff;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 28px 0;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          position: relative;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .cf-top-pattern {
          position: absolute;
          top: 0;
          right: 0;
          width: 220px;
          height: 140px;
          background-image: radial-gradient(#cbd5e1 1.2px, transparent 1.2px);
          background-size: 14px 14px;
          opacity: 0.65;
          pointer-events: none;
          z-index: 0;
        }

        .cf-page-container {
          width: 100%;
          position: relative;
          z-index: 1;
        }

        /* Top 2 Columns */
        .cf-top-columns-wrap {
          max-width: 940px;
          margin: 0 auto 24px auto;
          padding: 0 24px;
          box-sizing: border-box;
        }

        .cf-top-columns-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          text-align: left;
        }

        .cf-col-heading {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 8px;
          line-height: 1.3;
        }

        .cf-col-text {
          font-size: 13.5px;
          line-height: 1.6;
          color: #4b5563;
        }

        .cf-col-text p + p {
          margin-top: 8px;
        }

        /* Full Width Center Gray Ribbon Banner */
        .cf-banner-ribbon {
          width: 100%;
          background-color: #f0f2f5;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
          padding: 30px 20px 26px 20px;
          text-align: center;
          margin-bottom: 26px;
          box-sizing: border-box;
        }

        .cf-banner-inner {
          max-width: 940px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .cf-browser-mockup {
          max-width: 600px;
          width: 100%;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          border: 1px solid #dcdcdc;
          margin-bottom: 14px;
        }

        .cf-browser-header {
          background: #6b7280;
          height: 32px;
          display: flex;
          align-items: center;
          padding: 0 12px;
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
          margin-left: 10px;
          background: rgba(255, 255, 255, 0.25);
          height: 18px;
          border-radius: 3px;
          padding: 0 10px;
          display: flex;
          align-items: center;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
          font-size: 11px;
          color: #f3f4f6;
          width: 50%;
          max-width: 240px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .cf-browser-body {
          height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
        }

        .cf-badge-circle {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background-color: #bd2426;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(189, 36, 38, 0.25);
        }

        .cf-banner-forbidden {
          font-size: 22px;
          font-weight: 700;
          color: #1e293b;
          letter-spacing: -0.3px;
          margin-bottom: 3px;
        }

        .cf-banner-restricted {
          font-size: 13.5px;
          font-weight: 500;
          color: #dc2626;
        }

        /* Technical Details Section */
        .cf-tech-section-wrap {
          max-width: 940px;
          margin: 0 auto;
          padding: 0 24px;
          box-sizing: border-box;
        }

        .cf-hatched-divider {
          width: 100%;
          height: 6px;
          background: repeating-linear-gradient(45deg, #cbd5e1, #cbd5e1 2px, transparent 2px, transparent 6px);
          opacity: 0.7;
        }

        .cf-hatched-top {
          margin-bottom: 20px;
        }

        .cf-hatched-bottom {
          margin-top: 20px;
          margin-bottom: 22px;
        }

        .cf-tech-grid {
          display: grid;
          grid-template-columns: 1.1fr 1fr 1.1fr;
          gap: 18px 36px;
          text-align: left;
        }

        .cf-tech-label {
          font-size: 11px;
          font-weight: 700;
          color: #111827;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .cf-tech-value {
          font-size: 13px;
          color: #374151;
          line-height: 1.45;
          word-break: break-word;
        }

        .cf-tech-mono {
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
          font-size: 13.5px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: 0.3px;
        }

        .cf-attack-badge {
          display: inline-block;
          background-color: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecdd3;
          font-size: 11.5px;
          font-weight: 600;
          padding: 2.5px 12px;
          border-radius: 9999px;
          margin-top: 2px;
          letter-spacing: 0.2px;
        }

        .cf-actions-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .cf-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12.5px;
          font-weight: 600;
          padding: 8px 18px;
          border-radius: 6px;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
        }

        .cf-btn-primary {
          background-color: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
        }

        .cf-btn-primary:hover {
          background-color: #1e293b;
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

        .cf-footer-note {
          font-size: 11.5px;
          color: #64748b;
          text-align: center;
          line-height: 1.5;
          padding: 0 20px;
        }

        @media (max-width: 768px) {
          .cf-top-columns-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .cf-tech-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .cf-browser-body {
            height: 130px;
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

      {/* Top Corner Subtle Pattern */}
      <div className="cf-top-pattern" aria-hidden="true"></div>

      <div className="cf-page-container">
        {/* Top 2 Columns ("Why was this request blocked?" & "What can I do to resolve this?") */}
        <div className="cf-top-columns-wrap">
          <div className="cf-top-columns-grid">
            <div>
              <h3 className="cf-col-heading">Why was this request blocked?</h3>
              <div className="cf-col-text">
                <p>This website is using MDefender Pro WAF security to protect itself from online attacks. The action you performed triggered automated security filters designed to block malicious payloads, bots, and unauthorized access.</p>
              </div>
            </div>
            <div>
              <h3 className="cf-col-heading">What can I do to resolve this?</h3>
              <div className="cf-col-text">
                <p>You can email the site administrator with your Reference ID and Client IP found below.</p>
                <p>If you believe this is a legitimate request, the security operations team can review the audit log and whitelist your connection.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width Center Ribbon Banner with Browser Mockup */}
        <div className="cf-banner-ribbon">
          <div className="cf-banner-inner">
            <div className="cf-browser-mockup">
              <div className="cf-browser-header" aria-hidden="true">
                <span className="cf-browser-dot"></span>
                <span className="cf-browser-dot"></span>
                <span className="cf-browser-dot"></span>
                <span className="cf-browser-address-bar">https://{siteHost}</span>
              </div>
              <div className="cf-browser-body">
                <div className="cf-badge-circle" role="img" aria-label="Access Blocked">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </div>
              </div>
            </div>
            <div className="cf-banner-forbidden">403 Forbidden &mdash; Access Denied</div>
            <div className="cf-banner-restricted">Access to {siteHost} is restricted</div>
          </div>
        </div>

        {/* Technical Details Grid */}
        <div className="cf-tech-section-wrap">
          <div className="cf-hatched-divider cf-hatched-top" aria-hidden="true"></div>

          <div className="cf-tech-grid">
            <div>
              <div className="cf-tech-label">YOUR IP</div>
              <div className="cf-tech-value cf-tech-mono">{clientIp}</div>
            </div>

            <div>
              <div className="cf-tech-label">REFERENCE ID</div>
              <div className="cf-tech-value cf-tech-mono">{referenceId}</div>
            </div>

            <div>
              <div className="cf-tech-label">TIMESTAMP</div>
              <div className="cf-tech-value">{timestamp}</div>
            </div>

            <div>
              <div className="cf-tech-label">VIOLATION REASON</div>
              <div className="cf-tech-value">{reason}</div>
            </div>

            <div>
              <div className="cf-tech-label">ATTACK CLASSIFICATION</div>
              <div className="cf-tech-value">
                <span className="cf-attack-badge">{attackType}</span>
              </div>
            </div>

            <div>
              <div className="cf-tech-label">PROTECTION ENGINE</div>
              <div className="cf-tech-value">
                MDefender Pro WAF v4.3<br />
                {siteHost}
              </div>
            </div>
          </div>

          <div className="cf-hatched-divider cf-hatched-bottom" aria-hidden="true"></div>

          {/* Action Buttons */}
          <div className="cf-actions-row">
            <button type="button" className="cf-btn cf-btn-primary" onClick={() => window.location.href = '/'}>
              Return to Homepage
            </button>
            <button type="button" className="cf-btn cf-btn-secondary" onClick={handleCopyReferenceId}>
              {copied ? 'Copied!' : 'Copy Reference ID'}
            </button>
            <button type="button" className="cf-btn cf-btn-secondary" onClick={() => setReportModalOpen(true)}>
              Contact Security Operations
            </button>
          </div>

          {/* Footer Note */}
          <div className="cf-footer-note">
            Performance &amp; security by MDefender Pro AI Firewall. All critical system events are logged and audited.
          </div>
        </div>
      </div>

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
