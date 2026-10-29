"""MDefender Pro 403 Cyber Block Page Renderer.

Pre-compiles and generates the official high-performance 403 Cyber Block Page HTML.
"""

import os
import binascii
from datetime import datetime, timezone

_TEMPLATE_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../templates/block_page.html")
)
_CACHED_TEMPLATE = None


def get_block_page_template() -> str:
    global _CACHED_TEMPLATE
    if _CACHED_TEMPLATE is None:
        if os.path.exists(_TEMPLATE_PATH):
            with open(_TEMPLATE_PATH, "r", encoding="utf-8") as f:
                _CACHED_TEMPLATE = f.read()
        else:
            _CACHED_TEMPLATE = """<!DOCTYPE html>
<html><head><title>403 Forbidden - MDefender Pro WAF</title></head>
<body style="font-family:sans-serif;text-align:center;padding:50px;">
<h1>403 Forbidden</h1>
<p>Malicious activity detected by MDefender Pro WAF.</p>
<p>Reference ID: {{ reference_id }}</p>
<p>Client IP: {{ client_ip }}</p>
</body></html>"""
    return _CACHED_TEMPLATE

import re

_CHUNKS = None
_KEYS = None


def _compile_chunks():
    global _CHUNKS, _KEYS
    raw = get_block_page_template()
    pattern = re.compile(r'\{\{\s*([a-zA-Z0-9_]+)\s*\}\}')
    chunks = []
    keys = []
    last = 0
    for m in pattern.finditer(raw):
        chunks.append(raw[last:m.start()])
        keys.append(m.group(1))
        last = m.end()
    chunks.append(raw[last:])
    _CHUNKS = chunks
    _KEYS = keys

try:
    _compile_chunks()
except Exception:
    pass


def render_dead_network_page(website_name: str = "This site") -> str:
    host = str(website_name or "The site").replace("http://", "").replace("https://", "").strip("/")
    if ":" in host:
        host = host.split(":")[0]

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{host}</title>
    <style>
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}
        html, body {{
            height: 100%;
            background-color: #202124;
            color: #9aa0a6;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 15px;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
        }}
        body {{
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 30px 24px;
        }}
        .main-frame {{
            max-width: 600px;
            width: 100%;
        }}
        .icon-wrap {{
            margin-bottom: 24px;
            display: inline-block;
            color: #9aa0a6;
        }}
        .icon-wrap svg {{
            width: 48px;
            height: 48px;
            display: block;
        }}
        h1 {{
            color: #e8eaed;
            font-size: 24px;
            font-weight: 500;
            line-height: 1.35;
            margin-bottom: 16px;
            letter-spacing: -0.2px;
        }}
        .sub-msg {{
            color: #9aa0a6;
            font-size: 15px;
            line-height: 1.5;
            margin-bottom: 20px;
        }}
        .sub-msg strong {{
            font-weight: 600;
            color: #e8eaed;
        }}
        .try-heading {{
            font-size: 15px;
            margin-bottom: 8px;
            color: #9aa0a6;
        }}
        ul.try-list {{
            margin: 0 0 24px 22px;
            font-size: 15px;
            line-height: 1.6;
            color: #9aa0a6;
        }}
        ul.try-list li {{
            margin-bottom: 6px;
        }}
        ul.try-list li::marker {{
            color: #9aa0a6;
        }}
        .blue-link {{
            color: #8ab4f8;
            text-decoration: none;
            cursor: pointer;
        }}
        .blue-link:hover {{
            text-decoration: underline;
        }}
        .error-code {{
            font-size: 12px;
            color: #9aa0a6;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin-top: 24px;
            margin-bottom: 32px;
            letter-spacing: 0.3px;
        }}
        .btn-row {{
            display: flex;
            align-items: center;
            justify-content: space-between;
        }}
        .btn-reload {{
            display: inline-block;
            background: #8ab4f8;
            color: #202124;
            padding: 8px 24px;
            border-radius: 100px;
            font-size: 14px;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
            border: none;
            transition: opacity 0.15s ease;
            font-family: inherit;
        }}
        .btn-reload:hover {{
            opacity: 0.9;
        }}
        .btn-details {{
            display: inline-block;
            background: transparent;
            color: #8ab4f8;
            border: 1px solid #5f6368;
            padding: 8px 20px;
            border-radius: 100px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.15s ease;
            font-family: inherit;
        }}
        .btn-details:hover {{
            background: rgba(138, 180, 248, 0.08);
        }}
        .details-panel {{
            display: none;
            margin-top: 24px;
            padding: 16px 20px;
            border-radius: 8px;
            background: rgba(128, 134, 139, 0.1);
            font-size: 13.5px;
            line-height: 1.6;
            color: #9aa0a6;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }}
        .details-panel strong {{
            color: #e8eaed;
        }}
        @media (max-width: 540px) {{
            h1 {{ font-size: 21px; }}
            .sub-msg, .try-heading, ul.try-list {{ font-size: 14px; }}
        }}
    </style>
</head>
<body>
    <div class="main-frame">
        <div class="icon-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
                <path fill="#9aa0a6" d="M30 4H14c-2.2 0-4 1.8-4 4v32c0 2.2 1.8 4 4 4h20c2.2 0 4-1.8 4-4V12l-8-8zm-2 10V6.5L35.5 14H28zM18 22c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm12 0c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-6 12c-3.1 0-5.7-2.1-6.5-5h13c-.8 2.9-3.4 5-6.5 5z"/>
            </svg>
        </div>
        <h1>This site can’t be reached</h1>
        <p class="sub-msg"><strong>{host}</strong>’s server IP address could not be found.</p>
        <p class="try-heading">Try:</p>
        <ul class="try-list">
            <li>Checking the connection</li>
            <li><a href="#" class="blue-link" onclick="toggleDetails(); return false;">Checking the proxy, firewall, and DNS configuration</a></li>
            <li><a href="#" class="blue-link" onclick="toggleDetails(); return false;">Running Windows Network Diagnostics</a></li>
        </ul>
        <div class="error-code">ERR_NAME_NOT_RESOLVED</div>
        <div class="btn-row">
            <button type="button" class="btn-reload" onclick="window.location.reload();">Reload</button>
            <button type="button" class="btn-details" id="btnDetails" onclick="toggleDetails()">Details</button>
        </div>
        <div id="detailsPanel" class="details-panel">
            <p><strong>DNS_PROBE_FINISHED_NXDOMAIN</strong></p>
            <p style="margin-top: 8px;">Check if there is a typo in {host}. If spelling is correct, try running Windows Network Diagnostics.</p>
        </div>
    </div>
    <script>
        function toggleDetails() {{
            var panel = document.getElementById('detailsPanel');
            var btn = document.getElementById('btnDetails');
            if (panel.style.display === 'block') {{
                panel.style.display = 'none';
                btn.textContent = 'Details';
            }} else {{
                panel.style.display = 'block';
                btn.textContent = 'Hide details';
            }}
        }}
    </script>
</body>
</html>"""


def render_block_page(
    reference_id: str,
    client_ip: str,
    attack_type: str,
    reason: str,
    website_name: str = "This site",
    action: str = "blocked",
) -> str:
    """Ultra-fast compiled token replacement block page renderer."""
    atype = str(attack_type).lower()
    
    # 1. Country Restrictions, Blacklisted IPs, and Server Admin Probes: Stealth Dead Network
    is_stealth = (
        "country" in atype
        or "geoip" in atype
        or "geograph" in atype
        or "probe" in atype
        or "admin" in atype
        or "cpanel" in atype
        or "port" in atype
    )
    if is_stealth:
        return render_dead_network_page(website_name)

    global _CHUNKS, _KEYS
    if _CHUNKS is None:
        _compile_chunks()

    current_time = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    context = {
        "reference_id": reference_id,
        "client_ip": client_ip,
        "attack_type": attack_type,
        "reason": reason,
        "timestamp": current_time,
        "action": action.upper(),
        "website_name": website_name,
    }

    chunks = _CHUNKS
    keys = _KEYS
    n = len(keys)
    result = []
    for i in range(n):
        result.append(chunks[i])
        result.append(str(context.get(keys[i], "")))
    result.append(chunks[n])
    return "".join(result)
