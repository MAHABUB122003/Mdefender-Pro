// client.mjs
/**
 * Initialize MDefender Pro WAF client-side protection for SPAs.
 * @param {Object} options - Client configuration
 * @param {string} options.backendUrl - Base URL of your backend API server (e.g. 'http://localhost:5005')
 */
export function initWaf(options = {}) {
  if (typeof window === 'undefined') return;

  const backendUrl = (options.backendUrl || '').replace(/\/+$/, '');
  const currentSearch = decodeURIComponent(window.location.search);

  // Instant 0ms Local Block Page Renderer
  const renderInstantBlockPage = (attackType, refId) => {
    const referenceId = refId || ('MDF-' + Math.random().toString(16).substring(2, 10).toUpperCase());
    const host = window.location.hostname || 'localhost';
    const nowUtc = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    const unixRef = Math.floor(Date.now() / 1000);
    const ruleId = 96565;

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
            --font-main: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            --font-mono: Consolas, Monaco, monospace;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: var(--font-main);
            background-color: var(--bg-color);
            color: var(--text-primary);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            -webkit-font-smoothing: antialiased;
        }
        .container {
            width: 100%;
            max-width: 660px;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
            padding: 24px 28px;
        }
        .top-brand {
            display: flex;
            align-items: center;
            gap: 7px;
            font-size: 11.5px;
            font-weight: 700;
            color: var(--brand-1);
            letter-spacing: 0.04em;
            text-transform: uppercase;
            margin-bottom: 12px;
        }
        .top-brand span { color: var(--text-muted); font-weight: 400; }
        .top-brand .creator { color: var(--text-secondary); font-weight: 600; }
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            background: #fff1f2;
            border: 1px solid #fecdd3;
            color: #e11d48;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            margin-bottom: 14px;
        }
        .status-badge .dot {
            width: 6px;
            height: 6px;
            background: #e11d48;
            border-radius: 50%;
            box-shadow: 0 0 0 2px rgba(225, 29, 72, 0.2);
        }
        h1 {
            font-size: 19px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.01em;
            margin-bottom: 4px;
            line-height: 1.25;
        }
        .subtitle {
            font-size: 12px;
            color: var(--text-secondary);
            margin-bottom: 18px;
        }
        .subtitle strong {
            color: var(--text-primary);
            font-weight: 600;
        }
        .table-wrap {
            border: 1px solid var(--border-color);
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 18px;
            background: #ffffff;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            font-size: 11.5px;
        }
        tr {
            border-bottom: 1px solid #f1f5f9;
        }
        tr:last-child {
            border-bottom: none;
        }
        th {
            width: 32%;
            background: #f8fafc;
            padding: 8.5px 14px;
            font-weight: 600;
            color: #475569;
            border-right: 1px solid #f1f5f9;
            text-transform: uppercase;
            font-size: 10.5px;
            letter-spacing: 0.02em;
        }
        td {
            padding: 8.5px 14px;
            color: var(--text-primary);
            font-family: var(--font-mono);
            font-size: 11.5px;
            word-break: break-all;
        }
        .threat-alert {
            color: #dc2626;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .info-tag {
            font-size: 9.5px;
            font-weight: 700;
            background: #fef2f2;
            color: #ef4444;
            padding: 1.5px 6px;
            border-radius: 4px;
            border: 1px solid #fee2e2;
            font-family: var(--font-main);
            text-transform: uppercase;
        }
        .ip-wrap {
            display: flex;
            align-items: center;
            gap: 7px;
        }
        .flag-img {
            border-radius: 2px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            vertical-align: middle;
        }
        .why-header {
            font-size: 12.5px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 4px;
        }
        .why-desc {
            font-size: 11.5px;
            color: var(--text-secondary);
            line-height: 1.45;
            margin-bottom: 14px;
        }
        .ref-box {
            background: #f8fafc;
            border: 1px dashed var(--border-color);
            padding: 9px 14px;
            border-radius: 6px;
            font-family: var(--font-mono);
            font-size: 11.5px;
            font-weight: 700;
            color: var(--brand-1);
            text-align: center;
            margin-bottom: 16px;
            cursor: pointer;
            transition: all 0.15s ease;
        }
        .ref-box:hover {
            background: #f1f5f9;
            border-color: var(--brand-1);
        }
        .actions {
            display: flex;
            align-items: center;
            gap: 9px;
            flex-wrap: wrap;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 8px 14px;
            font-size: 11.5px;
            font-weight: 600;
            border-radius: 6px;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.15s ease;
            font-family: var(--font-main);
        }
        .btn-primary {
            background: var(--brand-1);
            color: #ffffff;
            border: 1px solid var(--brand-1);
            box-shadow: 0 1px 2px rgba(79, 70, 229, 0.2);
        }
        .btn-primary:hover {
            background: #4338ca;
        }
        .btn-secondary {
            background: #ffffff;
            color: var(--text-primary);
            border: 1px solid var(--border-color);
        }
        .btn-secondary:hover {
            background: #f8fafc;
            border-color: #94a3b8;
        }
        .footer {
            margin-top: 18px;
            padding-top: 12px;
            border-top: 1px solid #f1f5f9;
            font-size: 10.5px;
            color: var(--text-muted);
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="top-brand">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            MDEFENDER-PRO AI <span>&bull;</span> A.S.A.P. SECURITY FIREWALL <span>&bull;</span> <span class="creator">MAHABUB</span>
        </div>
        
        <div class="status-badge">
            <div class="dot"></div>
            403 — SECURITY ACTION REQUIRED &bull; Access Denied by Corporate WAF
        </div>
        
        <h1>403 — Access Denied</h1>
        <div class="subtitle">Access to <strong>${host}</strong> has been restricted by security policy.</div>
        
        <div class="table-wrap">
            <table>
                <tr>
                    <th>Attack Classification</th>
                    <td>
                        <div class="threat-alert">
                            <span>${attackType}</span>
                            <span class="info-tag">Blocked Threat</span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <th>Origin Client IP</th>
                    <td>
                        <div class="ip-wrap">
                            <img id="flag-img" src="https://flagcdn.com/w40/bd.png" width="20" height="15" alt="Flag" class="flag-img">
                            <span>::1<span id="geo-text"> (GeoIP: Dhaka, Bangladesh)</span></span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <th>Event Timestamp</th>
                    <td><span>${nowUtc}</span> (Ref: <span>${unixRef}</span>)</td>
                </tr>
                <tr>
                    <th>Violation Reason</th>
                    <td>Request blocked by rule ID: <span>${ruleId}</span> (Ref: ${attackType})</td>
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
            To maintain system integrity, suspicious requests are automatically analyzed and filtered. If you believe this is a valid action, please share the Reference ID below with your local IT/Security operations.
        </p>
        
        <div class="ref-box" id="ref-id-box" title="Click to copy Reference ID" onclick="copyRef()">
            REFERENCE ID: ${referenceId}
        </div>
        
        <div class="actions">
            <a id="email-link" href="mailto:security@mdefender-pro.io?subject=WAF Block Reference: ${referenceId}" class="btn btn-primary">
                ✉ Contact Security Operations
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
            });
        }
    </script>
</body>
</html>`;

    document.open();
    document.write(html);
    document.close();
  };

  // Helper to render server-provided WAF block page
  const handleWafBlock = (htmlText) => {
    if (htmlText && (htmlText.includes('MDefender-Pro') || htmlText.includes('Access Denied') || htmlText.includes('MDefender') || htmlText.includes('403'))) {
      document.open();
      document.write(htmlText);
      document.close();
      throw new Error("MDefender WAF Blocked Request");
    }
  };

  // 1. Instant check on page load (0ms immediate response)
  if (currentSearch) {
    const attackRegex = /(<script|onerror|onload|javascript:|alert\(|confirm\(|prompt\(|\.\.\/|\.\.\\|union.*select|drop.*table|'\s*(or|and)\s+['\w]|etc\/passwd|;\s*(whoami|id|cat|ls|cmd|sh|bash))/i;
    if (attackRegex.test(currentSearch)) {
      // Instantly render block page in 0ms!
      renderInstantBlockPage("XSS - Dangerous HTML Tag (<script>) #1");

      // Background verify with server for audit logging
      if (backendUrl) {
        const origFetch = window.fetch;
        const testUrl = backendUrl + '/api/books/' + window.location.search;
        origFetch(testUrl)
          .then(res => res.status === 403 ? res.text() : null)
          .then(html => { if (html) handleWafBlock(html); })
          .catch(() => {});
      }
      throw new Error("MDefender WAF Blocked Request");
    }
  }

  // 2. Intercept window.fetch to propagate query params and catch 403
  const originalFetch = window.fetch;
  window.fetch = async (input, init, ...args) => {
    let url = input;
    const searchStr = window.location.search;
    
    if (searchStr) {
      if (typeof url === 'string') {
        if (url.startsWith('/') || url.includes(backendUrl) || url.includes('/api/')) {
          const separator = url.includes('?') ? '&' : '?';
          url = url + separator + searchStr.substring(1);
        }
      } else if (url instanceof Request) {
        if (url.url.startsWith('/') || url.url.includes(backendUrl) || url.url.includes('/api/')) {
          const separator = url.url.includes('?') ? '&' : '?';
          const newUrl = url.url + separator + searchStr.substring(1);
          url = new Request(newUrl, url);
        }
      }
    }

    const response = await originalFetch(url, init, ...args);
    if (response.status === 403) {
      const clone = response.clone();
      try {
        const text = await clone.text();
        handleWafBlock(text);
      } catch (e) {}
    }
    return response;
  };

  // 3. Intercept XMLHttpRequest.prototype.open to propagate query params
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    const searchStr = window.location.search;
    if (searchStr && (url.startsWith('/') || url.includes(backendUrl) || url.includes('/api/'))) {
      const separator = url.includes('?') ? '&' : '?';
      url = url + separator + searchStr.substring(1);
    }
    return originalOpen.apply(this, [method, url, ...rest]);
  };

  // 4. Intercept XMLHttpRequest.prototype.send to catch 403
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(...args) {
    this.addEventListener('load', function() {
      if (this.status === 403) {
        handleWafBlock(this.responseText);
      }
    });
    return originalSend.apply(this, args);
  };
}
