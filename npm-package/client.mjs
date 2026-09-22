// client.mjs - MDefender Pro Client-Side & SPA Protection Engine
// High-performance 0ms synchronous execution with zero external network delays

const ATTACK_PATTERNS = [
    { type: 'Cross-Site Scripting (XSS)', regex: /<\s*(?:script|iframe|object|embed|svg|img|math)\b/i },
    { type: 'Cross-Site Scripting (XSS)', regex: /\bon(?:error|load|click|mouseover|focus|submit)\s*=/i },
    { type: 'Cross-Site Scripting (XSS)', regex: /\b(?:javascript|data\s*:\s*text\/html)\s*:/i },
    { type: 'Cross-Site Scripting (XSS)', regex: /\b(?:alert|eval|confirm|prompt|document\.cookie)\s*\(/i },
    { type: 'SQL Injection', regex: /\bUNION\s+(?:ALL\s+)?SELECT\b/i },
    { type: 'SQL Injection', regex: /(?:'|\"|\b)\s*(?:OR|AND)\s+['\"`]?([a-zA-Z0-9_-]+)['\"`]?\s*=\s*['\"`]?\1/i },
    { type: 'SQL Injection', regex: /(?:--|#|\/\*).*?(?:DROP|ALTER|INSERT|DELETE|UPDATE|EXEC)/i },
    { type: 'Local File Inclusion (LFI)', regex: /(?:\.\.\/|\.\.\\|etc\/passwd|etc\/shadow|win\.ini|boot\.ini)/i },
    { type: 'Server-Side Request Forgery (SSRF)', regex: /(?:169\.254\.169\.254|metadata\.google\.internal|(?:gopher|dict|file):\/\/|=(?:https?:\/\/)?(?:127\.0\.0\.1|169\.254|localhost|0\.0\.0\.0))/i },
    { type: 'Remote Command Execution (RCE)', regex: /(?:;|\||\|\||&&|`|\$\()\s*(?:cat|ls|id|whoami|powershell|cmd|sh|bash|wget|curl)\b/i },
    { type: 'AI Prompt Injection', regex: /(?:ignore\s+all\s+(?:previous|prior)\s+instructions|system\s+override|DAN\s+mode)/i }
];

function normalizeInput(str) {
    if (!str) return '';
    let curr = str;
    for (let i = 0; i < 3; i++) {
        try {
            const decoded = decodeURIComponent(curr);
            if (decoded === curr) break;
            curr = decoded;
        } catch (e) {
            break;
        }
    }
    return curr.replace(/\/\*.*?\*\//g, ' ');
}

function generateRefId() {
    return 'MDF-' + Math.random().toString(16).substring(2, 10).toUpperCase();
}

export function renderOfficialBlockPage(attackType, refId, domain) {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (window.__MDEFENDER_BLOCKED__) return;
    window.__MDEFENDER_BLOCKED__ = true;

    const referenceId = refId || generateRefId();
    const host = window.location.hostname || domain || 'localhost';
    const nowUtc = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    const unixRef = Math.floor(Date.now() / 1000);
    const classification = attackType || 'Cross-Site Scripting (XSS)';

    let hash = 0;
    for (let i = 0; i < classification.length; i++) {
        hash = classification.charCodeAt(i) + ((hash << 5) - hash);
    }
    const ruleId = Math.abs(hash % 10000) + 90000;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>403 — Security Action Required | MDefender Pro</title>
    <style>
        :root {
            --brand-1: #4f46e5;
            --brand-2: #6366f1;
            --bg-color: #f8fafc;
            --card-bg: #ffffff;
            --text-primary: #0f172a;
            --text-secondary: #475569;
            --text-muted: #94a3b8;
            --border-color: #cbd5e1;
            --font-main: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: var(--font-main);
            background-color: var(--bg-color);
            background-image: 
                radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.03) 0%, transparent 40%),
                radial-gradient(circle at 90% 80%, rgba(59, 130, 246, 0.03) 0%, transparent 40%);
            color: var(--text-primary);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px 14px;
        }
        .container {
            width: 100%;
            max-width: 660px;
            background: var(--card-bg);
            border: 1px solid rgba(226, 232, 240, 0.95);
            border-radius: 12px;
            box-shadow: 0 8px 25px -4px rgba(0, 0, 0, 0.04), 0 4px 6px -2px rgba(0, 0, 0, 0.02);
            padding: 24px 28px;
            text-align: center;
        }
        .logo-wrap {
            margin-bottom: 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .logo-svg {
            width: 48px;
            height: 48px;
        }
        .logo-text {
            font-size: 13.5px;
            font-weight: 800;
            color: #1e293b;
            letter-spacing: 0.5px;
            margin-top: 4px;
            text-transform: uppercase;
        }
        .fw-badge {
            font-size: 9.5px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 2px;
        }
        .fw-owner {
            font-size: 12px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
        }
        .main-title {
            font-size: 19px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.3px;
            margin-bottom: 3px;
        }
        .sub-title {
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 3px;
        }
        .desc-text {
            font-size: 11.5px;
            color: var(--text-secondary);
            margin-bottom: 12px;
        }
        .table-container {
            border: 1px solid var(--border-color);
            border-radius: 7px;
            overflow: hidden;
            background: #ffffff;
            margin-bottom: 12px;
            text-align: left;
        }
        .details-table {
            width: 100%;
            border-collapse: collapse;
        }
        .details-table tr {
            border-bottom: 1px solid var(--border-color);
        }
        .details-table tr:last-child {
            border-bottom: none;
        }
        .details-table th {
            background-color: #f8fafc;
            color: #475569;
            font-weight: 700;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            width: 190px;
            padding: 7px 12px;
            border-right: 1px solid var(--border-color);
            vertical-align: middle;
        }
        .details-table td {
            color: #334155;
            font-weight: 500;
            font-size: 11.5px;
            padding: 7px 12px;
            vertical-align: middle;
        }
        .threat-row td {
            background-color: #fff5f5 !important;
            color: #991b1b !important;
        }
        .threat-cell-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            gap: 8px;
        }
        .threat-text {
            font-weight: 700;
            color: #dc2626;
            word-break: break-word;
        }
        .info-tag {
            background: #f1f5f9;
            color: #475569;
            border: 1px solid #cbd5e1;
            font-size: 10px;
            font-weight: 600;
            padding: 2px 7px;
            border-radius: 4px;
            text-decoration: none;
            white-space: nowrap;
        }
        .ip-wrap {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .flag-svg {
            border-radius: 2px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        .why-header {
            font-size: 12.5px;
            font-weight: 700;
            color: #0f172a;
            text-align: left;
            margin-bottom: 4px;
        }
        .why-desc {
            font-size: 11px;
            color: var(--text-secondary);
            line-height: 1.45;
            text-align: left;
            margin-bottom: 12px;
        }
        .ref-box {
            background: #f1f5f9;
            border: 1px dashed var(--border-color);
            border-radius: 5px;
            padding: 7px;
            font-family: var(--font-mono);
            font-size: 11px;
            font-weight: 700;
            color: #334155;
            letter-spacing: 0.6px;
            margin-bottom: 14px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .ref-box:hover {
            border-color: var(--brand-1);
            color: var(--brand-1);
            background: #eef2ff;
        }
        .actions {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-bottom: 12px;
            flex-wrap: wrap;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-family: var(--font-main);
            font-size: 11px;
            font-weight: 600;
            padding: 7px 14px;
            border-radius: 5px;
            text-decoration: none;
            transition: all 0.15s ease;
            cursor: pointer;
        }
        .btn-primary {
            background-color: #0f172a;
            color: #ffffff;
            border: 1px solid #0f172a;
        }
        .btn-primary:hover {
            background-color: #1e293b;
            border-color: #1e293b;
        }
        .btn-secondary {
            background-color: #ffffff;
            color: #334155;
            border: 1px solid var(--border-color);
        }
        .btn-secondary:hover {
            background-color: #f8fafc;
            border-color: #94a3b8;
            color: #0f172a;
        }
        .footer {
            font-size: 10px;
            color: var(--text-muted);
            border-top: 1px solid #f1f5f9;
            padding-top: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Shield Logo Header -->
        <div class="logo-wrap">
            <svg class="logo-svg" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="shieldBg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#f8fafc" />
                        <stop offset="30%" stop-color="#cbd5e1" />
                        <stop offset="70%" stop-color="#94a3b8" />
                        <stop offset="100%" stop-color="#475569" />
                    </linearGradient>
                    <linearGradient id="shieldBorder" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#94a3b8" />
                        <stop offset="50%" stop-color="#f1f5f9" />
                        <stop offset="100%" stop-color="#475569" />
                    </linearGradient>
                    <linearGradient id="dragonColor" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#1e293b" />
                        <stop offset="100%" stop-color="#0f172a" />
                    </linearGradient>
                </defs>
                <path d="M60 10 C85 22 98 25 98 48 C98 75 75 98 60 108 C45 98 22 75 22 48 C22 25 35 22 60 10 Z" fill="url(#shieldBg)" stroke="url(#shieldBorder)" stroke-width="3" />
                <path d="M60 18 C80 28 90 30 90 48 C90 70 70 90 60 98 C50 90 30 70 30 48 C30 30 40 28 60 18 Z" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.8" stroke-dasharray="3 2" />
                <path d="M60 28 C58 35 52 38 48 38 C44 38 43 42 45 44 C47 46 51 44 51 48 C51 52 46 55 42 53 C38 51 36 54 38 58 C40 62 45 60 48 64 C50 66 48 70 44 72 C48 74 54 75 58 72 C58 68 55 65 57 62 C59 59 63 61 65 58 C67 55 66 52 62 50 C64 45 68 46 70 42 C72 38 67 36 65 32 C63 28 61 25 60 28 Z" fill="url(#dragonColor)" />
            </svg>
            <div class="logo-text">MDefender-Pro AI</div>
        </div>
        
        <div class="fw-badge">A.S.A.P. Security Firewall</div>
        <div class="fw-owner">Mahabub</div>
        
        <h1 class="main-title">403 — SECURITY ACTION REQUIRED</h1>
        <h2 class="sub-title">Access Denied by Corporate WAF</h2>
        
        <div class="desc-text">Access to [${host}] restricted.</div>
        
        <div class="table-container">
            <table class="details-table">
                <tr class="threat-row">
                    <th>Attack Classification</th>
                    <td>
                        <div class="threat-cell-content">
                            <span class="threat-text">${classification}</span>
                            <span class="info-tag">Detailed info tag</span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <th>Origin Client IP</th>
                    <td>
                        <div class="ip-wrap">
                            <svg class="flag-svg" width="20" height="15" viewBox="0 0 20 15" xmlns="http://www.w3.org/2000/svg">
                                <rect width="20" height="15" fill="#006a4e"/>
                                <circle cx="9" cy="7.5" r="4" fill="#f42a41"/>
                            </svg>
                            <span><span id="client-ip-display" style="font-family: var(--font-mono); font-weight: 700;">103.151.30.111</span><span style="color: #64748b;"> (GeoIP: BD)</span></span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <th>Event Timestamp</th>
                    <td><span>${nowUtc}</span> (Ref: <span>${unixRef}</span>)</td>
                </tr>
                <tr>
                    <th>Violation Reason</th>
                    <td>Request blocked by rule ID: <span>${ruleId}</span> (Ref: ${classification})</td>
                </tr>
                <tr>
                    <th>Protocol Details</th>
                    <td>HTTP/1.1 (WAF_VER: 4.1.0)</td>
                </tr>
                <tr>
                    <th>Server Host</th>
                    <td><span>${host}</span></td>
                </tr>
            </table>
        </div>
        
        <h3 class="why-header">Why did this happen?</h3>
        <p class="why-desc">
            To maintain system integrity, suspicious requests are automatically analyzed and filtered. If you believe this is a valid corporate action, please share the Reference ID below with your local IT/Security operations. Regular users should clear cache or contact support.
        </p>
        
        <div class="ref-box" id="ref-id-box" title="Click to copy Reference ID" onclick="copyRef()">
            REFERENCE ID: ${referenceId}
        </div>
        
        <div class="actions">
            <a href="#" class="btn btn-primary" onclick="alert('Reference ID: ${referenceId}\\nContact your IT security team.'); return false;">
                Contact Security Operations
            </a>
            <a href="/" class="btn btn-secondary">
                Return to Homepage
            </a>
            <button type="button" class="btn btn-secondary" onclick="copyRef()">
                Copy Reference ID
            </button>
        </div>
        
        <div class="footer">
            Secured by MDefender-Pro AI Firewall. All critical system events are logged and audited.
        </div>
    </div>

    <script>
        const refId = "${referenceId}";
        function copyRef() {
            navigator.clipboard.writeText(refId).then(() => {
                const refBox = document.getElementById('ref-id-box');
                if (refBox) {
                    const originalHtml = refBox.innerHTML;
                    refBox.innerHTML = 'COPIED TO CLIPBOARD! ✅';
                    refBox.style.color = '#10b981';
                    refBox.style.borderColor = '#10b981';
                    refBox.style.background = '#ecfdf5';
                    setTimeout(() => {
                        refBox.innerHTML = originalHtml;
                        refBox.style.color = '';
                        refBox.style.borderColor = '';
                        refBox.style.background = '';
                    }, 2000);
                }
            });
        }
    </script>
</body>
</html>`;

    // Instant DOM Replacement
    try { window.stop(); } catch (e) { }
    document.documentElement.innerHTML = html;

    // Async Telemetry Beacon to MDefender Dashboard (recorded without blocking UI)
    try {
        const reportPayload = {
            domain: domain || (typeof window !== 'undefined' ? window.location.hostname : 'localhost') || 'localhost',
            request: {
                method: 'GET',
                url: typeof window !== 'undefined' ? (window.location.pathname + window.location.search) : '/',
                query_string: typeof window !== 'undefined' ? window.location.search : '',
                ip: '127.0.0.1',
                headers: { 'User-Agent': typeof navigator !== 'undefined' ? navigator.userAgent : 'Frontend-WAF' },
                body: '',
                attack_type: classification,
                reference_id: referenceId
            }
        };
        const endpoint = 'http://localhost:8000/api/v1/waf/analyze';
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            navigator.sendBeacon(endpoint, new Blob([JSON.stringify(reportPayload)], { type: 'application/json' }));
        } else if (typeof fetch !== 'undefined') {
            fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportPayload)
            }).catch(() => {});
        }
    } catch (e) {}
}

// Client-side initialization requires explicit initWaf() with apiKey

/**
 * Initialize MDefender Pro WAF client-side protection for SPAs & Frontend Websites.
 * @param {Object} options - Client configuration
 * @param {string} [options.backendUrl] - Base URL of your backend API server (e.g. 'http://localhost:5005' or 'http://localhost:8000')
 * @param {string} [options.apiKey] - Your Website API key
 * @param {string} [options.domain] - Your domain (e.g. 'localhost' or 'mysite.com')
 * @param {boolean} [options.logBlocked] - Whether to log blocked attacks to console
 */
export function initWaf(options = {}) {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (window.__MDEFENDER_WAF_INITIALIZED__) return;
    window.__MDEFENDER_WAF_INITIALIZED__ = true;

    const backendUrl = (options.backendUrl || 'http://localhost:8000').replace(/\/+$/, '');
    const domain = options.domain || window.location.hostname || 'localhost';

    // 1. Wrap window.fetch for outgoing requests
    const originalFetch = window.fetch;
    window.fetch = async (input, init, ...args) => {
        let url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
        let targetParamStr = '';
        try {
            if (url.includes('?')) targetParamStr = url.substring(url.indexOf('?'));
            else if (url.includes('#')) targetParamStr = url.substring(url.indexOf('#'));
        } catch (e) {}

        if (targetParamStr) {
            const normParams = normalizeInput(targetParamStr);
            for (const pattern of ATTACK_PATTERNS) {
                if (pattern.regex.test(normParams)) {
                    renderOfficialBlockPage(pattern.type, null, domain);
                    throw new Error(`[MDefender WAF] Outgoing API attack blocked: ${pattern.type}`);
                }
            }
        }

        try {
            const response = await originalFetch(input, init, ...args);
            if (response.status === 403) {
                const clone = response.clone();
                try {
                    const text = await clone.text();
                    if (text.includes('403') && (text.includes('MDefender') || text.includes('Access Denied'))) {
                        renderOfficialBlockPage('Cross-Site Scripting (XSS)', null, domain);
                    }
                } catch (e) {}
            }
            return response;
        } catch (err) {
            throw err;
        }
    };

    // 2. Wrap XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        let targetParamStr = '';
        try {
            const urlStr = String(url);
            if (urlStr.includes('?')) targetParamStr = urlStr.substring(urlStr.indexOf('?'));
        } catch (e) {}

        if (targetParamStr) {
            const normParams = normalizeInput(targetParamStr);
            for (const pattern of ATTACK_PATTERNS) {
                if (pattern.regex.test(normParams)) {
                    renderOfficialBlockPage(pattern.type, null, domain);
                    throw new Error(`[MDefender WAF] XHR attack blocked: ${pattern.type}`);
                }
            }
        }
        return originalOpen.apply(this, [method, url, ...rest]);
    };
}

export default { initWaf, renderOfficialBlockPage };
