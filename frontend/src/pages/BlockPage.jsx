import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  Copy,
  Check,
  ArrowLeft,
  Mail,
  X,
  AlertTriangle,
  Lock,
  Clock3,
  Globe2,
} from 'lucide-react';

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
const API_BASE = (
  typeof window !== 'undefined' && LOCAL_HOSTS.includes(window.location.hostname)
    ? 'http://localhost:8000'
    : (import.meta.env.VITE_API_BASE || '')
).replace(/\/+$/, '');

export default function BlockPage() {
  const [searchParams] = useSearchParams();

  const domain = searchParams.get('domain') || (typeof window !== 'undefined' ? window.location.hostname : '') || 'this website';
  const rayId = searchParams.get('ray_id') || searchParams.get('ref_id') || 'MDEF-PENDING';
  const ip = searchParams.get('ip') || '';
  const rule = searchParams.get('rule') || 'Managed WAF policy';
  const timestamp = searchParams.get('timestamp') || new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  const [copied, setCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportEmail, setReportEmail] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [reportState, setReportState] = useState('idle'); // idle | sending | sent | error
  const [toast, setToast] = useState('');
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!reportOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setReportOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const previous = document.activeElement;
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previous && previous.focus) previous.focus();
    };
  }, [reportOpen]);

  const copyReference = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(rayId);
      }
      setCopied(true);
      setToast('Reference ID copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setToast('Copy failed — select the reference ID manually');
    }
  };

  const submitReport = async (e) => {
    e.preventDefault();
    setReportState('sending');
    try {
      const res = await fetch(`${API_BASE}/api/v1/waf/report-false-positive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference_id: rayId,
          client_ip: ip,
          url: typeof window !== 'undefined' ? window.location.href : '',
          attack_type: rule,
          reason: 'Visitor reports a legitimate request was blocked',
          user_email: reportEmail,
          comments: reportNote,
        }),
      });
      if (!res.ok) throw new Error('Report failed');
      setReportState('sent');
    } catch {
      setReportState('error');
    }
  };

  const details = useMemo(
    () => [
      { icon: Lock, label: 'Reference ID', value: rayId, mono: true, copy: true },
      { icon: Globe2, label: 'Website', value: domain },
      { icon: Clock3, label: 'Timestamp', value: timestamp },
      ...(ip ? [{ icon: ShieldCheck, label: 'Your IP address', value: ip, mono: true }] : []),
    ],
    [domain, ip, rayId, timestamp]
  );

  return (
    <div className="bp">
      <style>{`
        .bp {
          min-height: 100vh;
          background: var(--md-paper, #f6f5f0);
          color: var(--md-ink, #10201e);
          font-family: var(--md-font-sans, 'Inter', sans-serif);
          display: flex;
          flex-direction: column;
        }
        .bp * { box-sizing: border-box; }
        .bp a { color: inherit; }
        .bp-top {
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          padding: 20px 32px; border-bottom: 1px solid var(--md-line, #e2e5de);
          background: rgba(255,255,255,.55);
        }
        .bp-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .bp-brand img { width: 30px; height: 30px; object-fit: contain; }
        .bp-brand span { font-weight: 700; font-size: 14px; letter-spacing: -.01em; }
        .bp-brand em { font-style: normal; color: var(--md-amber, #e8792f); }
        .bp-status {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
          color: var(--md-danger, #c0392b); background: var(--md-danger-soft, #f8e5e1);
          border: 1px solid rgba(192,57,43,.18); border-radius: 999px; padding: 6px 11px;
        }
        .bp-main {
          width: 100%; max-width: 1120px; margin: 0 auto; padding: 56px 32px 40px;
          display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr); gap: 48px;
          align-items: start; align-content: center; flex: 1;
        }
        .bp-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
          color: var(--md-amber, #e8792f); margin: 0 0 14px;
        }
        .bp h1 {
          font-family: var(--md-font-display, 'Plus Jakarta Sans', sans-serif);
          font-size: clamp(30px, 4vw, 44px); line-height: 1.06; letter-spacing: -.035em;
          font-weight: 700; margin: 0 0 16px;
        }
        .bp-lead { font-size: 14.5px; line-height: 1.65; color: var(--md-ink-2, #465955); margin: 0 0 24px; max-width: 52ch; }
        .bp-rule {
          display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap;
          background: var(--md-surface, #fff); border: 1px solid var(--md-line, #e2e5de);
          border-radius: 10px; padding: 9px 12px; font-size: 12px; color: var(--md-ink-2, #465955);
          margin-bottom: 28px;
        }
        .bp-rule code {
          font-family: var(--md-font-mono, monospace); font-size: 11.5px; color: var(--md-ink, #10201e);
          background: var(--md-surface-sunken, #efeee8); border-radius: 5px; padding: 3px 6px;
        }
        .bp-actions { display: flex; flex-wrap: wrap; gap: 10px; }
        .bp-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          height: 40px; padding: 0 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
          cursor: pointer; text-decoration: none; border: 1px solid transparent;
          transition: background 140ms ease, border-color 140ms ease, color 140ms ease;
        }
        .bp-btn-primary { background: var(--md-forest, #0b2b26); color: #fff; }
        .bp-btn-primary:hover { background: var(--md-forest-2, #123f37); }
        .bp-btn-secondary { background: var(--md-surface, #fff); border-color: var(--md-line-strong, #cfd5cb); color: var(--md-ink, #10201e); }
        .bp-btn-secondary:hover { background: var(--md-surface-hover, #faf9f5); }
        .bp-btn-ghost { background: transparent; color: var(--md-ink-2, #465955); }
        .bp-btn-ghost:hover { background: rgba(16,32,30,.05); }
        .bp-card {
          background: var(--md-surface, #fff); border: 1px solid var(--md-line, #e2e5de);
          border-radius: 14px; box-shadow: 0 1px 2px rgba(16,32,30,.04); overflow: hidden;
        }
        .bp-card-head { padding: 18px 20px 14px; border-bottom: 1px solid var(--md-line, #e2e5de); }
        .bp-card-head h2 { font-size: 13.5px; font-weight: 650; margin: 0 0 3px; }
        .bp-card-head p { font-size: 11.5px; color: var(--md-ink-3, #6e7f7a); margin: 0; }
        .bp-dl { margin: 0; padding: 6px 20px 14px; }
        .bp-row {
          display: flex; align-items: flex-start; gap: 10px; padding: 11px 0;
          border-bottom: 1px solid var(--md-line, #e2e5de);
        }
        .bp-row:last-child { border-bottom: 0; }
        .bp-row svg { color: var(--md-ink-3, #6e7f7a); margin-top: 2px; flex-shrink: 0; }
        .bp-row dt { font-size: 11px; color: var(--md-ink-3, #6e7f7a); margin-bottom: 2px; }
        .bp-row dd { margin: 0; font-size: 12.5px; font-weight: 500; overflow-wrap: anywhere; }
        .bp-row dd.mono { font-family: var(--md-font-mono, monospace); font-size: 12px; }
        .bp-copy {
          margin-left: auto; background: none; border: 0; padding: 4px; border-radius: 6px;
          color: var(--md-ink-3, #6e7f7a); cursor: pointer; display: inline-flex;
        }
        .bp-copy:hover { background: var(--md-surface-sunken, #efeee8); color: var(--md-ink, #10201e); }
        .bp-help { margin-top: 20px; display: grid; gap: 12px; }
        .bp-help-item { display: flex; gap: 10px; font-size: 12px; line-height: 1.55; color: var(--md-ink-2, #465955); }
        .bp-help-item strong { color: var(--md-ink, #10201e); font-weight: 600; }
        .bp-section { border-top: 1px solid var(--md-line, #e2e5de); background: rgba(255,255,255,.45); }
        .bp-section-inner {
          max-width: 1120px; margin: 0 auto; padding: 36px 32px 44px;
          display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px;
        }
        .bp-section h3 { font-size: 13px; font-weight: 650; margin: 0 0 8px; display: flex; align-items: center; gap: 8px; }
        .bp-section p { font-size: 12.5px; line-height: 1.6; color: var(--md-ink-2, #465955); margin: 0; }
        .bp-foot {
          border-top: 1px solid var(--md-line, #e2e5de); padding: 16px 32px;
          display: flex; flex-wrap: wrap; gap: 8px 18px; align-items: center; justify-content: space-between;
          font-size: 11.5px; color: var(--md-ink-3, #6e7f7a);
        }
        .bp-foot strong { color: var(--md-ink-2, #465955); font-weight: 600; }
        .bp-toast {
          position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%);
          background: var(--md-forest, #0b2b26); color: #fff; font-size: 12.5px; font-weight: 500;
          padding: 10px 16px; border-radius: 999px; box-shadow: 0 12px 32px rgba(16,32,30,.2); z-index: 60;
        }
        .bp-overlay {
          position: fixed; inset: 0; background: rgba(10,25,22,.55); backdrop-filter: blur(3px);
          display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 50;
        }
        .bp-dialog {
          width: 100%; max-width: 520px; background: var(--md-surface, #fff); border-radius: 16px;
          box-shadow: 0 24px 64px rgba(16,32,30,.28); overflow: hidden;
        }
        .bp-dialog-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 20px 22px 0; }
        .bp-dialog-head h2 { font-size: 16px; margin: 0 0 4px; }
        .bp-dialog-head p { font-size: 12px; color: var(--md-ink-3, #6e7f7a); margin: 0; }
        .bp-dialog-body { padding: 18px 22px 22px; display: grid; gap: 14px; }
        .bp-field { display: grid; gap: 6px; }
        .bp-field label { font-size: 11.5px; font-weight: 600; color: var(--md-ink-2, #465955); }
        .bp-field input, .bp-field textarea {
          width: 100%; border: 1px solid var(--md-line-strong, #cfd5cb); border-radius: 8px;
          padding: 9px 11px; font-family: inherit; font-size: 13px; color: var(--md-ink, #10201e);
          background: var(--md-surface, #fff); outline: none;
        }
        .bp-field input:focus, .bp-field textarea:focus { border-color: var(--md-amber, #e8792f); box-shadow: 0 0 0 3px rgba(232,121,47,.15); }
        .bp-field textarea { min-height: 84px; resize: vertical; }
        .bp-note { font-size: 11px; color: var(--md-ink-3, #6e7f7a); line-height: 1.5; }
        .bp-close { background: none; border: 0; cursor: pointer; color: var(--md-ink-3, #6e7f7a); padding: 4px; border-radius: 6px; }
        .bp-close:hover { background: var(--md-surface-sunken, #efeee8); }
        @media (max-width: 900px) {
          .bp-main { grid-template-columns: 1fr; gap: 32px; padding: 36px 20px 28px; }
          .bp-section-inner { grid-template-columns: 1fr; gap: 20px; padding: 28px 20px 32px; }
          .bp-top { padding: 16px 20px; }
          .bp-foot { padding: 14px 20px; }
        }
      `}</style>

      <header className="bp-top">
        <a className="bp-brand" href="/" aria-label="MDefender Pro home">
          <img src="/assets/mdefender_logo.png" alt="" />
          <span>MDefender <em>Pro</em></span>
        </a>
        <span className="bp-status">
          <AlertTriangle size={12} strokeWidth={2.2} /> Request blocked
        </span>
      </header>

      <main className="bp-main">
        <section aria-labelledby="bp-title">
          <p className="bp-eyebrow">Access restricted · HTTP 403</p>
          <h1 id="bp-title">This request was blocked to keep the site safe.</h1>
          <p className="bp-lead">
            Our security layer flagged this request as potentially malicious before it reached the website.
            If you are the site owner or a legitimate visitor, use the reference below to look it up or ask for a review.
          </p>

          <div className="bp-rule">
            <ShieldCheck size={14} /> Matched policy <code>{rule}</code>
          </div>

          <div className="bp-actions">
            <button type="button" className="bp-btn bp-btn-primary" onClick={() => setReportOpen(true)}>
              <Mail size={15} /> Request a review
            </button>
            <button type="button" className="bp-btn bp-btn-secondary" onClick={copyReference}>
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy reference ID'}
            </button>
            <button
              type="button"
              className="bp-btn bp-btn-ghost"
              onClick={() => (window.history.length > 1 ? window.history.back() : (window.location.href = '/'))}
            >
              <ArrowLeft size={15} /> Go back
            </button>
          </div>
        </section>

        <aside aria-label="Request details">
          <div className="bp-card">
            <div className="bp-card-head">
              <h2>Request details</h2>
              <p>Share these details with the site owner if you need help.</p>
            </div>
            <dl className="bp-dl">
              {details.map(({ icon: Icon, label, value, mono, copy }) => (
                <div className="bp-row" key={label}>
                  <Icon size={14} />
                  <div style={{ minWidth: 0 }}>
                    <dt>{label}</dt>
                    <dd className={mono ? 'mono' : ''}>{value}</dd>
                  </div>
                  {copy && (
                    <button type="button" className="bp-copy" onClick={copyReference} aria-label="Copy reference ID">
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  )}
                </div>
              ))}
            </dl>
          </div>

          <div className="bp-help">
            <div className="bp-help-item">
              <ShieldCheck size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span><strong>Nothing was installed or changed.</strong> The request was stopped at the edge.</span>
            </div>
            <div className="bp-help-item">
              <Clock3 size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span><strong>Legitimate action?</strong> Submit a review and the site owner can whitelist the rule.</span>
            </div>
          </div>
        </aside>
      </main>

      <section className="bp-section" aria-label="Why this happened">
        <div className="bp-section-inner">
          <div>
            <h3><ShieldCheck size={15} /> Automated protection</h3>
            <p>Every request passes through signature, behavioural and machine-learning checks before it reaches the origin server.</p>
          </div>
          <div>
            <h3><AlertTriangle size={15} /> Why this one</h3>
            <p>The request matched a rule designed to stop injection, scripted abuse or known exploit patterns. False positives are rare but possible.</p>
          </div>
          <div>
            <h3><Mail size={15} /> What happens next</h3>
            <p>Your review request is logged with the reference ID. The site owner can inspect the request and adjust the policy.</p>
          </div>
        </div>
      </section>

      <footer className="bp-foot">
        <span>Protected by <strong>MDefender Pro</strong> · Reference <strong>{rayId}</strong></span>
        <span>{timestamp}</span>
      </footer>

      {toast && <div className="bp-toast" role="status">{toast}</div>}

      {reportOpen && (
        <div className="bp-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setReportOpen(false); }}>
          <div className="bp-dialog" role="dialog" aria-modal="true" aria-labelledby="bp-report-title" ref={dialogRef}>
            <div className="bp-dialog-head">
              <div>
                <h2 id="bp-report-title">Request a review</h2>
                <p>Tell the site owner what you were doing when this page appeared.</p>
              </div>
              <button type="button" className="bp-close" onClick={() => setReportOpen(false)} aria-label="Close dialog" ref={closeRef}>
                <X size={18} />
              </button>
            </div>

            {reportState === 'sent' ? (
              <div className="bp-dialog-body">
                <h3 style={{ margin: 0, fontSize: 14 }}>Review requested</h3>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--md-ink-2, #465955)', lineHeight: 1.6 }}>
                  Your report has been recorded against reference <strong>{rayId}</strong>. The site owner can now inspect
                  the blocked request and adjust the policy if it was legitimate.
                </p>
                <button type="button" className="bp-btn bp-btn-primary" onClick={() => setReportOpen(false)}>Close</button>
              </div>
            ) : (
              <form className="bp-dialog-body" onSubmit={submitReport}>
                <div className="bp-field">
                  <label htmlFor="bp-email">Your email (optional)</label>
                  <input
                    id="bp-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={reportEmail}
                    onChange={(e) => setReportEmail(e.target.value)}
                  />
                </div>
                <div className="bp-field">
                  <label htmlFor="bp-note">What were you trying to do?</label>
                  <textarea
                    id="bp-note"
                    placeholder="e.g. submitting a support form with a link in the message"
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    required
                  />
                </div>
                <p className="bp-note">
                  We send the reference ID, the page URL and your note. We never ask for passwords or payment details.
                </p>
                {reportState === 'error' && (
                  <p className="bp-note" style={{ color: 'var(--md-danger, #c0392b)' }}>
                    We could not submit the report. Please try again, or copy the reference ID and contact the site owner.
                  </p>
                )}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" className="bp-btn bp-btn-secondary" onClick={() => setReportOpen(false)}>Cancel</button>
                  <button type="submit" className="bp-btn bp-btn-primary" disabled={reportState === 'sending'}>
                    {reportState === 'sending' ? 'Sending…' : 'Submit request'}
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
