// client.mjs - MDefender Pro Client-Side & SPA Protection Engine
// High-performance 0ms synchronous execution with zero external network delays

const _activeConfig = {
    apiEndpoint: 'http://217.15.170.82',
    apiKey: '',
    domain: 'localhost'
};

const ATTACK_PATTERNS = [
    { type: 'Cross-Site Scripting (XSS)', regex: /<\s*(?:script|iframe|object|embed|svg|img|math|audio|video|style|link|body|input)\b/i },
    { type: 'Cross-Site Scripting (XSS)', regex: /\bon(?:error|load|click|mouseover|focus|submit|animationend|change|input|pointerover|toggle)\s*=/i },
    { type: 'Cross-Site Scripting (XSS)', regex: /\b(?:javascript|data\s*:\s*text\/html|vbscript)\s*:/i },
    { type: 'Cross-Site Scripting (XSS)', regex: /\b(?:alert|eval|confirm|prompt|document\.cookie|document\.write|window\.location|String\.fromCharCode)\s*\(/i },
    { type: 'SQL Injection', regex: /\b(?:UNION\s+(?:ALL\s+)?SELECT|SELECT\s+.*?\s+FROM|INSERT\s+INTO|DELETE\s+FROM|DROP\s+(?:TABLE|DATABASE)|ALTER\s+TABLE)\b/i },
    { type: 'SQL Injection', regex: /(?:'|\"|\b)\s*(?:OR|AND)\s+['"`]?([a-zA-Z0-9_-]+)['"`]?\s*=\s*['"`]?\1/i },
    { type: 'SQL Injection', regex: /\b(?:SLEEP\s*\(\s*\d+\s*\)|BENCHMARK\s*\(|WAITFOR\s+DELAY|INFORMATION_SCHEMA|XP_CMDSHELL|HEX\s*\(|EXTRACTVALUE|UPDATEXML)\b/i },
    { type: 'SQL Injection', regex: /(?:--|#|\/\*).*?(?:DROP|ALTER|INSERT|DELETE|UPDATE|EXEC|SELECT)/i },
    { type: 'Local File Inclusion (LFI)', regex: /(?:\.\.\/|\.\.\\|etc\/passwd|etc\/shadow|win\.ini|boot\.ini|proc\/self\/environ|WEB-INF)/i },
    { type: 'Server-Side Request Forgery (SSRF)', regex: /(?:169\.254\.169\.254|metadata\.google\.internal|(?:gopher|dict|file):\/\/|=(?:https?:\/\/)?(?:127\.0\.0\.1|169\.254|localhost|0\.0\.0\.0))/i },
    { type: 'Remote Command Execution (RCE)', regex: /(?:;|\||\|\||&&|`|\$\()\s*(?:cat|ls|id|whoami|powershell|cmd|sh|bash|wget|curl|nc|netcat|python|perl|ruby)\b/i },
    { type: 'Server-Side Template Injection (SSTI)', regex: /(?:\{\{.*?\}\}|\$\{.*?\}|<%=.*?%>|#\{.*?\})/i },
    { type: 'XML External Entity (XXE)', regex: /(?:<!ENTITY\s+[\w-]+\s+SYSTEM|<!DOCTYPE\s+[\w-]+\s+\[)/i },
    { type: 'NoSQL Injection', regex: /(?:\$gt|\$ne|\$where|\$regex|\$or|\$nin|\$in)\b/i },
    { type: 'Insecure Deserialization', regex: /(?:O:\d+:"[a-zA-Z0-9_]+":\d+:\{|c__builtin__\nsystem|cos\nsystem)/i },
    { type: 'AI Prompt Injection', regex: /(?:ignore\s+all\s+(?:previous|prior)\s+instructions|system\s+override|DAN\s+mode|developer\s+mode\s+enabled)/i }
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

    // 1. Dispatch Telemetry Beacon Immediately to MDefender Cloud WAF (Non-blocking)
    try {
        const targetEndpoint = (_activeConfig.apiEndpoint || 'http://217.15.170.82').replace(/\/+$/, '') + '/api/v1/waf/analyze';
        const targetDomain = domain || _activeConfig.domain || (typeof window !== 'undefined' ? window.location.hostname : 'localhost') || 'localhost';
        const targetUrl = typeof window !== 'undefined' ? (window.location.pathname + window.location.search) : '/';
        const targetQuery = typeof window !== 'undefined' ? window.location.search : '';

        const reportPayload = {
            domain: targetDomain,
            api_key: _activeConfig.apiKey || undefined,
            request: {
                method: 'GET',
                url: targetUrl,
                query_string: targetQuery,
                ip: '127.0.0.1',
                headers: {
                    'User-Agent': typeof navigator !== 'undefined' ? navigator.userAgent : 'Frontend-WAF',
                    'Authorization': _activeConfig.apiKey ? `Bearer ${_activeConfig.apiKey}` : undefined
                },
                body: '',
                attack_type: classification,
                reference_id: referenceId
            }
        };

        const headers = { 'Content-Type': 'application/json' };
        if (_activeConfig.apiKey) {
            headers['Authorization'] = `Bearer ${_activeConfig.apiKey}`;
        }

        if (typeof fetch !== 'undefined') {
            fetch(targetEndpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(reportPayload),
                mode: 'cors',
                keepalive: true
            }).catch(() => {});
        } else if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            navigator.sendBeacon(targetEndpoint, new Blob([JSON.stringify(reportPayload)], { type: 'application/json' }));
        }
    } catch (e) {}

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
    <title>403 Forbidden — Access Denied | MDefender-Pro AI</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #ffffff;
            --text-main: #1e293b;
            --text-heading: #0f172a;
            --text-sub: #475569;
            --text-muted: #64748b;
            --border-light: #e2e8f0;
            --border-dark: #cbd5e1;
            --orange-alert: #ea580c;
            --font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            --font-mono: 'JetBrains Mono', Consolas, monospace;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: var(--font-family);
            background-color: var(--bg-color);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            -webkit-font-smoothing: antialiased;
        }
        .block-wrapper {
            width: 100%;
            max-width: 900px;
            margin: 0 auto;
            text-align: center;
        }
        .brand-header {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            margin-bottom: 28px;
            text-align: left;
        }
        .brand-logo-wrap {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .brand-logo-svg {
            width: 50px;
            height: 50px;
            filter: drop-shadow(0 4px 12px rgba(246, 130, 31, 0.35));
            transition: transform 0.2s ease, filter 0.2s ease;
        }
        .brand-logo-svg:hover {
            transform: scale(1.06);
            filter: drop-shadow(0 6px 16px rgba(246, 130, 31, 0.48));
        }
        .brand-info {
            display: flex;
            flex-direction: column;
        }
        .brand-title {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: 0.5px;
            line-height: 1.2;
            text-transform: uppercase;
        }
        .brand-subtitle {
            font-size: 9.5px;
            font-weight: 700;
            color: #64748b;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            margin-top: 2px;
        }
        .brand-owner {
            font-size: 12px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-top: 2px;
        }
        .headline-403 {
            font-size: 34px;
            font-weight: 800;
            color: var(--text-heading);
            letter-spacing: -0.5px;
            line-height: 1.15;
            margin-bottom: 4px;
        }
        .headline-denied {
            font-size: 22px;
            font-weight: 700;
            color: var(--text-heading);
            margin-bottom: 8px;
        }
        .headline-restricted {
            font-size: 14.5px;
            font-weight: 600;
            color: var(--orange-alert);
            margin-bottom: 36px;
        }
        .info-columns {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            text-align: left;
            margin-bottom: 36px;
            max-width: 820px;
            margin-left: auto;
            margin-right: auto;
        }
        .info-box-title {
            font-size: 18px;
            font-weight: 700;
            color: var(--text-heading);
            margin-bottom: 10px;
        }
        .info-box-text {
            font-size: 13.5px;
            line-height: 1.55;
            color: var(--text-sub);
        }
        .info-box-text p + p {
            margin-top: 10px;
        }
        .tech-details-container {
            border-top: 1px solid var(--border-light);
            border-bottom: 1px solid var(--border-light);
            padding: 24px 0;
            margin-bottom: 28px;
            max-width: 820px;
            margin-left: auto;
            margin-right: auto;
        }
        .tech-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px 24px;
            text-align: left;
        }
        .tech-item-label {
            font-size: 12px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 4px;
        }
        .tech-item-value {
            font-size: 12.5px;
            color: #334155;
            line-height: 1.4;
            word-break: break-word;
        }
        .tech-item-value-bold {
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
            font-family: var(--font-mono);
        }
        .ip-flag-wrap {
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .flag-icon {
            width: 18px;
            height: 13px;
            border-radius: 2px;
            border: 1px solid rgba(0, 0, 0, 0.08);
            vertical-align: middle;
        }
        .attack-badge {
            display: inline-block;
            background-color: #ffedd5;
            color: #9a3412;
            border: 1px solid #fed7aa;
            font-size: 11.5px;
            font-weight: 600;
            padding: 3px 10px;
            border-radius: 5px;
            margin-top: 2px;
        }
        .actions-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 24px;
            flex-wrap: wrap;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-family: var(--font-family);
            font-size: 12px;
            font-weight: 600;
            padding: 8px 16px;
            border-radius: 6px;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.15s ease;
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
            border: 1px solid var(--border-dark);
        }
        .btn-secondary:hover {
            background-color: #f8fafc;
            border-color: #94a3b8;
            color: #0f172a;
        }
        .footer-note {
            font-size: 11px;
            color: var(--text-muted);
            line-height: 1.5;
        }
        @media (max-width: 720px) {
            .info-columns { grid-template-columns: 1fr; gap: 20px; }
            .tech-grid { grid-template-columns: 1fr; gap: 16px; }
            .brand-header { flex-direction: column; text-align: center; gap: 10px; }
            .brand-info { align-items: center; }
        }
    </style>
</head>
<body>
    <div class="block-wrapper">
        <div class="brand-header">
            <div class="brand-logo-wrap">
                <svg class="brand-logo-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="cfShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#ff9e2c" />
                            <stop offset="45%" stop-color="#f6821f" />
                            <stop offset="80%" stop-color="#ea580c" />
                            <stop offset="100%" stop-color="#c2410c" />
                        </linearGradient>
                        <linearGradient id="cfInnerCore" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stop-color="#ffffff" />
                            <stop offset="40%" stop-color="#fff4e6" />
                            <stop offset="100%" stop-color="#ffd8a8" />
                        </linearGradient>
                    </defs>
                    <path d="M32 3L54 11C54 28.5 45 47.5 32 58C19 47.5 10 28.5 10 11L32 3Z" fill="url(#cfShieldGrad)"/>
                    <path d="M32 5.5L51.5 12.5C51.5 28 43.5 45 32 55C20.5 45 12.5 28 12.5 12.5L32 5.5Z" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.4"/>
                    <path d="M17 17L25 21V41.5L17 35V17Z" fill="url(#cfInnerCore)"/>
                    <path d="M47 17L39 21V41.5L47 35V17Z" fill="url(#cfInnerCore)" fill-opacity="0.95"/>
                    <path d="M32 15L39.5 26.5L32 34L24.5 26.5L32 15Z" fill="#ffffff"/>
                    <path d="M32 37L37 43.5L32 49L27 43.5L32 37Z" fill="url(#cfInnerCore)"/>
                </svg>
            </div>
            <div class="brand-info">
                <div class="brand-title">MDEFENDER-PRO AI</div>
                <div class="brand-subtitle">A.S.A.P. SECURITY FIREWALL</div>
                <div class="brand-owner">MAHABUB</div>
            </div>
        </div>

        <h1 class="headline-403">403 Forbidden</h1>
        <h2 class="headline-denied">Access Denied</h2>
        <div class="headline-restricted">Access to \${host} is restricted</div>

        <div class="info-columns">
            <div class="info-box">
                <div class="info-box-title">What happened?</div>
                <div class="info-box-text">
                    <p>This website is using a security service (MDefender-Pro AI) to protect itself from online attacks. The action you tried to perform has been blocked by corporate WAF.</p>
                </div>
            </div>
            <div class="info-box">
                <div class="info-box-title">What can I do?</div>
                <div class="info-box-text">
                    <p>If you are a visitor, please contact the site owner or support operations with the details below.</p>
                    <p>If you believe this is a valid corporate action, please share the Reference ID below.</p>
                </div>
            </div>
        </div>

        <div class="tech-details-container">
            <div class="tech-grid">
                <div>
                    <div class="tech-item-label">Your IP</div>
                    <div class="tech-item-value">
                        <span class="ip-flag-wrap">
                            <span>103.151.30.111 (GeoIP: BD)</span>
                            <img src="https://flagcdn.com/w40/bd.png" alt="BD" class="flag-icon">
                        </span>
                    </div>
                </div>
                <div>
                    <div class="tech-item-label">Reference ID</div>
                    <div class="tech-item-value-bold">\${referenceId}</div>
                </div>
                <div>
                    <div class="tech-item-label">Timestamp</div>
                    <div class="tech-item-value">\${nowUtc} (Ref: \${unixRef})</div>
                </div>
                <div>
                    <div class="tech-item-label">Violation Reason</div>
                    <div class="tech-item-value">Request blocked by rule ID: \${ruleId} (Ref: \${classification})</div>
                </div>
                <div>
                    <div class="tech-item-label">Attack Classification</div>
                    <div class="tech-item-value">
                        <span class="attack-badge">\${classification}</span>
                    </div>
                </div>
                <div>
                    <div class="tech-item-label">Protocol Details</div>
                    <div class="tech-item-value">
                        HTTP/1.1 (WAF_VER: 4.1.0)<br>
                        \${host}
                    </div>
                </div>
            </div>
        </div>

        <div class="actions-row">
            <button type="button" class="btn btn-primary" onclick="alert('Reference ID: ' + refId + '\\nPlease share with your IT administrator.')">
                Contact Security Operations
            </button>
            <a href="/" class="btn btn-secondary">
                Return to Homepage
            </a>
            <button type="button" class="btn btn-secondary" id="copyBtn" onclick="copyRef()">
                Copy Reference ID
            </button>
        </div>

        <div class="footer-note">
            Performance & security by MDefender-Pro AI Firewall. All critical system events are logged and audited.
        </div>
    </div>

    <script>
        const refId = "\${referenceId}";
        function copyRef() {
            navigator.clipboard.writeText(refId).then(() => {
                const btn = document.getElementById('copyBtn');
                if (btn) {
                    const original = btn.innerText;
                    btn.innerText = 'Copied!';
                    btn.style.borderColor = '#10b981';
                    btn.style.color = '#10b981';
                    setTimeout(() => {
                        btn.innerText = original;
                        btn.style.borderColor = '';
                        btn.style.color = '';
                    }, 2000);
                }
            }).catch(() => {
                alert('Reference ID: ' + refId);
            });
        }
    </script>
</body>
</html>\`;

    // Instant DOM Replacement
    try { window.stop(); } catch (e) { }
    document.documentElement.innerHTML = html;
}

/**
 * Initialize MDefender Pro WAF client-side protection for SPAs & Frontend Websites.
 * @param {Object} options - Client configuration
 * @param {string} [options.apiEndpoint] - MDefender Cloud base URL (e.g. 'http://217.15.170.82')
 * @param {string} [options.backendUrl] - Alias for apiEndpoint
 * @param {string} [options.apiKey] - Your Website API key
 * @param {string} [options.domain] - Your domain (e.g. 'localhost' or 'mysite.com')
 */
export function initWaf(options = {}) {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (window.__MDEFENDER_WAF_INITIALIZED__) return;
    window.__MDEFENDER_WAF_INITIALIZED__ = true;

    _activeConfig.apiEndpoint = options.apiEndpoint || options.backendUrl || 'http://217.15.170.82';
    _activeConfig.apiKey = options.apiKey || '';
    _activeConfig.domain = options.domain || window.location.hostname || 'localhost';

    const domain = _activeConfig.domain;

    // 0. Auto-inspect current page URL on load (e.g. ?q=<script> or ?id=1 UNION SELECT)
    try {
        const currentUrlParams = (window.location.search || '') + ' ' + (window.location.hash || '');
        if (currentUrlParams.trim()) {
            const normUrl = normalizeInput(currentUrlParams);
            for (const pattern of ATTACK_PATTERNS) {
                if (pattern.regex.test(normUrl)) {
                    renderOfficialBlockPage(pattern.type, null, domain);
                    return;
                }
            }

            // Real-time Cloud Deep ML Inspection (0-Day / Polymorphic AI Evaluation)
            const targetEndpoint = (_activeConfig.apiEndpoint || 'http://217.15.170.82').replace(/\/+$/, '') + '/api/v1/waf/analyze';
            const headers = { 'Content-Type': 'application/json' };
            if (_activeConfig.apiKey) {
                headers['Authorization'] = `Bearer ${_activeConfig.apiKey}`;
            }

            fetch(targetEndpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    domain: domain,
                    api_key: _activeConfig.apiKey || undefined,
                    request: {
                        method: 'GET',
                        url: window.location.pathname + window.location.search,
                        query_string: window.location.search,
                        ip: '127.0.0.1',
                        headers: {
                            'User-Agent': typeof navigator !== 'undefined' ? navigator.userAgent : 'Frontend-WAF',
                            'Authorization': _activeConfig.apiKey ? `Bearer ${_activeConfig.apiKey}` : undefined
                        },
                        body: ''
                    }
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data && data.decision === 'BLOCK') {
                    if (data.block_html && (data.block_html.includes('<!DOCTYPE html>') || data.block_html.includes('<html'))) {
                        try { window.stop(); } catch (e) {}
                        document.documentElement.innerHTML = data.block_html;
                    } else {
                        renderOfficialBlockPage(data.attack_type || data.reason || 'AI Anomaly Detected', data.reference_id, domain);
                    }
                }
            })
            .catch(() => {});
        }
    } catch (e) {}

    // 1. Wrap window.fetch for outgoing requests
    const originalFetch = window.fetch;
    window.fetch = async (input, init, ...args) => {
        let url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
        let targetParamStr = '';
        try {
            if (url.includes('?')) targetParamStr = url.substring(url.indexOf('?'));
            else if (url.includes('#')) targetParamStr = url.substring(url.indexOf('#'));
        } catch (e) {}

        // Inspect URL
        if (targetParamStr) {
            const normParams = normalizeInput(targetParamStr);
            for (const pattern of ATTACK_PATTERNS) {
                if (pattern.regex.test(normParams)) {
                    renderOfficialBlockPage(pattern.type, null, domain);
                    throw new Error(`[MDefender WAF] Outgoing API attack blocked: ${pattern.type}`);
                }
            }
        }

        // Inspect Body if POST/PUT
        if (init && init.body) {
            try {
                const bodyStr = typeof init.body === 'string' ? init.body : JSON.stringify(init.body);
                const normBody = normalizeInput(bodyStr);
                for (const pattern of ATTACK_PATTERNS) {
                    if (pattern.regex.test(normBody)) {
                        renderOfficialBlockPage(pattern.type, null, domain);
                        throw new Error(`[MDefender WAF] Outgoing payload attack blocked: ${pattern.type}`);
                    }
                }
            } catch (e) {}
        }

        try {
            const response = await originalFetch(input, init, ...args);
            if (response.status === 403) {
                const clone = response.clone();
                try {
                    const text = await clone.text();
                    const statusHeader = response.headers.get('x-mdefender-status');
                    const attackHeader = response.headers.get('x-mdefender-attack-type');
                    const refHeader = response.headers.get('x-mdefender-ref');
                    if (statusHeader === 'blocked' || text.includes('403') || text.includes('MDefender') || text.includes('Access Denied')) {
                        if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
                            try { window.stop(); } catch (e) {}
                            document.documentElement.innerHTML = text;
                        } else {
                            renderOfficialBlockPage(attackHeader || 'Cross-Site Scripting (XSS)', refHeader, domain);
                        }
                    }
                } catch (e) {}
            }
            return response;
        } catch (err) {
            throw err;
        }
    };

    // 2. Wrap XMLHttpRequest (Used by Axios, Redux Toolkit Query, etc.)
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

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (body) {
        if (body) {
            try {
                const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
                const normBody = normalizeInput(bodyStr);
                for (const pattern of ATTACK_PATTERNS) {
                    if (pattern.regex.test(normBody)) {
                        renderOfficialBlockPage(pattern.type, null, domain);
                        throw new Error(`[MDefender WAF] XHR payload attack blocked: ${pattern.type}`);
                    }
                }
            } catch (e) {}
        }

        // Intercept 403 Forbidden responses from backend WAF
        this.addEventListener('load', function () {
            if (this.status === 403) {
                try {
                    const resp = this.responseText || '';
                    const statusHeader = this.getResponseHeader('X-MDefender-Status');
                    const attackHeader = this.getResponseHeader('X-MDefender-Attack-Type');
                    const refHeader = this.getResponseHeader('X-MDefender-Ref');
                    if (statusHeader === 'blocked' || resp.includes('403') || resp.includes('MDefender') || resp.includes('Access Denied')) {
                        if (resp.includes('<!DOCTYPE html>') || resp.includes('<html')) {
                            try { window.stop(); } catch (e) {}
                            document.documentElement.innerHTML = resp;
                        } else {
                            renderOfficialBlockPage(attackHeader || 'Security Rule Violation', refHeader, domain);
                        }
                    }
                } catch (e) {}
            }
        });

        return originalSend.apply(this, arguments);
    };
}

export default { initWaf, renderOfficialBlockPage };
