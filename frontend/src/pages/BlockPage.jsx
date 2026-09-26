import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import theme from '../utils/theme'
import api from '../api/api'

export default function BlockPage() {
  const { dark } = useTheme()
  const s = theme(dark)
  const [params] = useSearchParams()
  
  const attackType = params.get('attack_type') || 'Suspicious Activity Detected'
  const clientIp = params.get('client_ip') || '127.0.0.1'
  const realIp = params.get('real_ip') || clientIp
  const reason = params.get('reason') || 'Request blocked by security rules'
  const timestamp = params.get('timestamp') || new Date().toISOString().replace('T', ' ').slice(0, 19)
  const referenceId = params.get('reference_id') || 'REF-' + Math.random().toString(36).substr(2, 8).toUpperCase()
  const targetUrl = params.get('url') || window.location.pathname

  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userComment, setUserComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

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
      setErrorMsg(err.message || 'Failed to submit report. Please email security@example.com.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', margin: 0, position: 'relative',
      background: s.bg,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body::before { 
          content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(ellipse at 50% 0%, ${dark ? 'rgba(220,38,38,0.15)' : 'rgba(220,38,38,0.08)'} 0%, transparent 70%);
          pointer-events: none; z-index: 0; 
        }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseAlert { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
        .block-wrapper { width: 100%; max-width: 600px; animation: slideUp 0.5s cubic-bezier(0.16,1,0.3,1); position: relative; z-index: 1; }
        .block-card { 
          background: ${s.bgCard}; border-radius: 16px; padding: 0; 
          box-shadow: ${dark ? '0 20px 40px rgba(0,0,0,0.5)' : '0 20px 40px rgba(0,0,0,0.1)'}; 
          border: 1px solid ${dark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)'}; 
          overflow: hidden; 
        }
        .status-bar { 
          display: flex; align-items: center; justify-content: space-between; 
          padding: 16px 24px; background: rgba(239, 68, 68, 0.1); 
          border-bottom: 1px solid rgba(239, 68, 68, 0.2);
        }
        .status-indicator { display: flex; align-items: center; gap: 10px; }
        .status-dot { width: 10px; height: 10px; background: #ef4444; border-radius: 50%; animation: pulseAlert 2s infinite; }
        .status-label { font-size: 13px; font-weight: 700; color: #ef4444; letter-spacing: 1px; text-transform: uppercase; }
        .ref-badge { font-size: 12px; color: ${s.textMuted}; font-family: 'Fira Code', monospace; }
        .block-content { padding: 40px 32px; text-align: center; }
        .block-icon { 
          width: 64px; height: 64px; background: rgba(239, 68, 68, 0.1); 
          border-radius: 50%; display: flex; align-items: center; justify-content: center; 
          margin: 0 auto 24px; color: #ef4444; font-size: 28px;
        }
        .block-title { font-size: 28px; font-weight: 800; color: ${s.text}; letter-spacing: -0.5px; margin-bottom: 12px; }
        .block-subtitle { font-size: 15px; color: ${s.textSecondary}; line-height: 1.6; margin-bottom: 32px; }
        .details-grid { 
          background: ${dark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)'}; 
          border-radius: 12px; padding: 24px; border: 1px solid ${s.borderLight}; 
          text-align: left; margin-bottom: 32px;
        }
        .detail-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .detail-row:last-child { margin-bottom: 0; }
        .detail-label { font-size: 13px; font-weight: 600; color: ${s.textMuted}; text-transform: uppercase; letter-spacing: 0.5px; }
        .detail-value { font-size: 14px; color: ${s.text}; font-weight: 500; text-align: right; }
        .detail-value.mono { font-family: 'Fira Code', monospace; }
        .detail-value.highlight { color: #ef4444; font-weight: 700; }
        .block-actions { display: flex; gap: 16px; justify-content: center; }
        .btn { 
          padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; 
          cursor: pointer; transition: all 0.2s; text-decoration: none; border: none; 
          display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-primary { background: #ef4444; color: #fff; }
        .btn-primary:hover { background: #dc2626; transform: translateY(-1px); }
        .btn-secondary { background: transparent; color: ${s.text}; border: 1px solid ${s.border}; }
        .btn-secondary:hover { background: ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
        .modal-box { background: ${s.bgCard}; border: 1px solid ${s.border}; border-radius: 16px; padding: 28px; width: 100%; max-width: 500px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); text-align: left; }
        .modal-input { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid ${s.border}; background: ${dark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.9)'}; color: ${s.text}; font-size: 14px; margin-bottom: 14px; box-sizing: border-box; }
        .modal-input:focus { outline: none; border-color: #ef4444; }

        @media (max-width: 600px) {
          .block-content { padding: 32px 20px; }
          .detail-row { flex-direction: column; align-items: flex-start; gap: 4px; }
          .detail-value { text-align: left; }
          .block-actions { flex-direction: column; }
          .btn { width: 100%; justify-content: center; }
        }
      `}</style>
      <div className="block-wrapper">
        <div className="block-card">
          <div className="status-bar">
            <div className="status-indicator">
              <span className="status-dot"></span>
              <span className="status-label">Access Denied</span>
            </div>
            <div className="ref-badge">ID: {referenceId}</div>
          </div>
          
          <div className="block-content">
            <div className="block-icon">
              <i className="fas fa-shield-virus"></i>
            </div>
            <h1 className="block-title">Request Blocked</h1>
            <p className="block-subtitle">Our Web Application Firewall has intercepted this request due to suspicious activity matching known threat signatures.</p>
            
            <div className="details-grid">
              <div className="detail-row">
                <span className="detail-label">Threat Type</span>
                <span className="detail-value highlight">{attackType}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Client IP</span>
                <span className="detail-value mono">{clientIp}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Rule Triggered</span>
                <span className="detail-value">{reason}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Timestamp (UTC)</span>
                <span className="detail-value mono">{timestamp}</span>
              </div>
            </div>
            
            <div className="block-actions">
              <button className="btn btn-primary" onClick={() => window.location.href = '/'}>
                <i className="fas fa-arrow-left"></i> Return Home
              </button>
              <button className="btn btn-secondary" onClick={() => setReportModalOpen(true)}>
                <i className="fas fa-flag"></i> Report False Positive
              </button>
            </div>
          </div>
          
          <div style={{ padding: '16px', textAlign: 'center', borderTop: `1px solid ${s.borderLight}`, background: dark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: 12, color: s.textMuted }}>Protected by <strong style={{ color: s.text }}>MDefender Pro</strong> Enterprise WAF</span>
          </div>
        </div>
      </div>

      {/* False Positive Report Modal */}
      {reportModalOpen && (
        <div className="modal-overlay" onClick={() => setReportModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                <i className="fas fa-flag"></i> Report False Positive
              </h3>
              <button style={{ background: 'transparent', border: 'none', color: s.textMuted, fontSize: '18px', cursor: 'pointer' }} onClick={() => setReportModalOpen(false)}>
                &times;
              </button>
            </div>

            {submitted ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <i className="fas fa-check"></i>
                </div>
                <h3 style={{ margin: '0 0 8px 0' }}>Report Submitted!</h3>
                <p style={{ fontSize: '14px', color: s.textMuted, margin: '0 0 20px 0' }}>
                  Reference ID <strong>{referenceId}</strong> has been logged to the Security Operations Center. Our security team will review and whitelist this pattern.
                </p>
                <button className="btn btn-primary" onClick={() => setReportModalOpen(false)}>
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit}>
                <p style={{ fontSize: '13px', color: s.textMuted, marginBottom: '16px' }}>
                  If your legitimate request was incorrectly blocked by the firewall, submit this form and our administrators can whitelist it with 1 click.
                </p>

                {errorMsg && (
                  <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '13px', marginBottom: '14px' }}>
                    {errorMsg}
                  </div>
                )}

                <div style={{ marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: s.textSecondary }}>Reference ID</div>
                <input type="text" className="modal-input" value={referenceId} disabled style={{ opacity: 0.7 }} />

                <div style={{ marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: s.textSecondary }}>Your Email (Optional)</div>
                <input
                  type="email"
                  className="modal-input"
                  placeholder="your.email@example.com"
                  value={userEmail}
                  onChange={e => setUserEmail(e.target.value)}
                />

                <div style={{ marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: s.textSecondary }}>Describe what you were doing</div>
                <textarea
                  rows={3}
                  className="modal-input"
                  placeholder="e.g. I was saving an article containing HTML code..."
                  value={userComment}
                  onChange={e => setUserComment(e.target.value)}
                  style={{ resize: 'vertical' }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setReportModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
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
