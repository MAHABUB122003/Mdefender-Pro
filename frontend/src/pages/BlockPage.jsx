import { useSearchParams } from 'react-router-dom'

export default function BlockPage() {
  const [params] = useSearchParams()
  const attackType = params.get('attack_type') || 'Unknown Attack'
  const clientIp = params.get('client_ip') || '127.0.0.1'
  const realIp = params.get('real_ip') || clientIp
  const reason = params.get('reason') || 'Attack payload detected'
  const timestamp = params.get('timestamp') || new Date().toISOString().replace('T', ' ').slice(0, 19)
  const referenceId = params.get('reference_id') || 'REF-' + Math.random().toString(36).substr(2, 8).toUpperCase()

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', margin: 0, position: 'relative',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif"
    }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body::before { content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(ellipse at 20% 50%, rgba(37,99,235,0.08) 0%, transparent 50%),
                      radial-gradient(ellipse at 80% 50%, rgba(220,38,38,0.05) 0%, transparent 50%);
          pointer-events: none; z-index: 0; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 10%, 50%, 90% { transform: translateX(-2px); } 30%, 70% { transform: translateX(2px); } }
        .block-wrapper { width: 100%; max-width: 560px; animation: slideUp 0.6s cubic-bezier(0.16,1,0.3,1); position: relative; z-index: 1; }
        .block-card { background: #fff; border-radius: 20px; padding: 0; box-shadow: 0 25px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06); overflow: hidden; }
        .status-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 28px; background: linear-gradient(135deg, #dc2626, #b91c1c); }
        .status-indicator { display: flex; align-items: center; gap: 8px; }
        .status-dot { width: 8px; height: 8px; background: #fca5a5; border-radius: 50%; animation: pulse 1.5s ease-in-out infinite; }
        .status-label { font-size: 12px; font-weight: 700; color: #fff; letter-spacing: 1.5px; }
        .ref-badge { font-size: 11px; color: rgba(255,255,255,0.8); background: rgba(0,0,0,0.2); padding: 4px 14px; border-radius: 20px; font-weight: 500; font-family: 'Courier New', monospace; letter-spacing: 0.3px; }
        .block-header { padding: 24px 28px 0; }
        .brand { display: flex; align-items: center; gap: 12px; }
        .brand-icon { width: 40px; height: 40px; background: linear-gradient(135deg, #1a56db, #1e40af); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 4px 12px rgba(26,86,219,0.25); }
        .brand-text h2 { font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px; }
        .brand-text span { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 500; }
        .block-content { padding: 20px 28px 0; text-align: center; }
        .block-icon { width: 72px; height: 72px; background: linear-gradient(135deg, #fef2f2, #fee2e2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; animation: shake 0.5s ease-in-out; }
        .block-title { font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; margin-bottom: 6px; }
        .block-subtitle { font-size: 15px; color: #64748b; font-weight: 400; line-height: 1.6; margin-bottom: 20px; }
        .threat-badge { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #fef2f2, #fee2e2); border: 1px solid #fecaca; padding: 8px 20px; border-radius: 100px; margin-bottom: 20px; }
        .threat-icon { font-size: 16px; color: #dc2626; }
        .threat-text { font-size: 13px; font-weight: 600; color: #b91c1c; letter-spacing: 0.3px; text-transform: uppercase; }
        .details-grid { background: #f8fafc; border-radius: 14px; padding: 4px 20px; margin-bottom: 20px; border: 1px solid #e8edf4; text-align: left; }
        .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 13px 0; border-bottom: 1px solid #f0f4fa; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .detail-value { font-size: 13px; color: #0f172a; font-weight: 500; word-break: break-all; text-align: right; max-width: 55%; }
        .detail-value.attacker-ip { font-family: 'Courier New', monospace; font-size: 14px; font-weight: 600; color: #dc2626; background: #fef2f2; padding: 3px 12px; border-radius: 6px; border: 1px solid #fecaca; }
        .detail-value.real-ip { font-family: 'Courier New', monospace; font-size: 14px; font-weight: 600; color: #059669; background: #f0fdf4; padding: 3px 12px; border-radius: 6px; border: 1px solid #bbf7d0; }
        .detail-value.attack-type { color: #7c3aed; font-weight: 600; }
        .detail-value.confidence { font-size: 12px; color: #ea580c; font-weight: 500; }
        .detail-value.reference { font-family: 'Courier New', monospace; background: #fff; padding: 2px 12px; border-radius: 4px; border: 1px solid #e2e8f0; font-size: 12px; font-weight: 600; color: #475569; }
        .info-message { background: linear-gradient(135deg, #f8fafc, #f1f5f9); border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; border: 1px solid #e2e8f0; text-align: left; }
        .info-message .info-text { font-size: 13px; color: #475569; line-height: 1.7; }
        .info-message .info-text .highlight { color: #1a56db; font-weight: 600; }
        .block-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 24px; }
        .btn { padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s cubic-bezier(0.16,1,0.3,1); text-decoration: none; font-family: inherit; border: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-primary { background: linear-gradient(135deg, #1a56db, #1e40af); color: #fff; box-shadow: 0 4px 16px rgba(26,86,219,0.2); }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(26,86,219,0.35); }
        .btn-secondary { background: #fff; color: #475569; border: 1px solid #dce3ed; }
        .btn-secondary:hover { background: #f8fafc; border-color: #c4cedb; transform: translateY(-1px); }
        .block-footer { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 18px 28px; background: #f8fafc; border-top: 1px solid #e8edf4; }
        .block-footer .footer-text { font-size: 12px; color: #94a3b8; font-weight: 400; }
        .block-footer .footer-text strong { color: #475569; font-weight: 600; }
        .block-footer .footer-divider { display: inline-block; width: 1px; height: 12px; background: #dce3ed; }
        @media (max-width: 768px) { .block-card { border-radius: 16px; } .status-bar { padding: 10px 20px; } .block-header { padding: 20px 20px 0; } .block-content { padding: 16px 20px 0; } .block-title { font-size: 24px; } .block-subtitle { font-size: 14px; } .detail-row { flex-direction: column; align-items: flex-start; gap: 3px; padding: 14px 0; } .detail-value { text-align: left; max-width: 100%; width: 100%; } .block-actions { flex-direction: column; } .btn { width: 100%; text-align: center; } .block-footer { flex-direction: column; gap: 6px; padding: 16px 20px; } .block-footer .footer-divider { display: none; } }
        @media (max-width: 480px) { .block-card { border-radius: 12px; } .status-bar { padding: 8px 16px; flex-direction: column; gap: 6px; } .block-header { padding: 16px 16px 0; } .block-content { padding: 14px 16px 0; } .block-title { font-size: 20px; } .block-icon { width: 60px; height: 60px; } .details-grid { padding: 0 14px; } .info-message { padding: 14px 16px; } }
        @media print { body { background: #fff; } .block-card { box-shadow: none; border: 1px solid #dce3ed; } .btn { display: none; } .status-bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      `}</style>
      <div className="block-wrapper">
        <div className="block-card">
          <div className="status-bar">
            <div className="status-indicator">
              <span className="status-dot"></span>
              <span className="status-label">BLOCKED</span>
            </div>
            <div className="ref-badge">ID: {referenceId}</div>
          </div>
          <div className="block-header">
            <div className="brand">
              <div className="brand-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div className="brand-text">
                <h2>MDefender Pro</h2>
                <span>Web Application Firewall</span>
              </div>
            </div>
          </div>
          <div className="block-content">
            <div className="block-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h1 className="block-title">Access Denied</h1>
            <p className="block-subtitle">This request has been blocked by Web Application Firewall</p>
            <div className="threat-badge">
              <span className="threat-icon">&#9888;</span>
              <span className="threat-text">{attackType}</span>
            </div>
            <div className="details-grid">
              <div className="detail-row">
                <span className="detail-label">Claimed IP</span>
                <span className="detail-value attacker-ip">{clientIp}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Real IP</span>
                <span className="detail-value real-ip">{realIp}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Attack Type</span>
                <span className="detail-value attack-type">{attackType}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Confidence</span>
                <span className="detail-value confidence">{reason}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Timestamp</span>
                <span className="detail-value">{timestamp}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Reference ID</span>
                <span className="detail-value reference">{referenceId}</span>
              </div>
            </div>
            <div className="info-message">
              <div className="info-text">
                If you believe this is a mistake, please contact the website administrator.
                Provide the <span className="highlight">Reference ID</span> for faster resolution.
              </div>
            </div>
            <div className="block-actions">
              <a href={`mailto:admin@example.com?subject=Blocked Request: ${referenceId}&body=Reference ID: ${referenceId}%0AIP: ${clientIp}%0AAttack Type: ${attackType}%0ATimestamp: ${timestamp}`} className="btn btn-primary">Report Issue</a>
              <a href="/" className="btn btn-secondary">Return to Homepage</a>
            </div>
          </div>
          <div className="block-footer">
            <span className="footer-text">Protected by <strong>MDefender Pro</strong></span>
            <span className="footer-divider"></span>
            <span className="footer-text">All attacks are logged and monitored 24/7</span>
          </div>
        </div>
      </div>
    </div>
  )
}
