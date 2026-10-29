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
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{host}</title>
    <style>
        :root {{
            --bg: #ffffff;
            --text-heading: #202124;
            --text-body: #5f6368;
            --link: #1a73e8;
            --code: #5f6368;
            --btn-bg: #1a73e8;
            --btn-text: #ffffff;
        }}
        @media (prefers-color-scheme: dark) {{
            :root {{
                --bg: #202124;
                --text-heading: #e8eaed;
                --text-body: #9aa0a6;
                --link: #8ab4f8;
                --code: #9aa0a6;
                --btn-bg: #8ab4f8;
                --btn-text: #202124;
            }}
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: var(--bg);
            color: var(--text-body);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }}
        .main-frame {{ max-width: 560px; width: 100%; }}
        .icon-wrap {{ margin-bottom: 24px; display: inline-block; }}
        .icon-wrap svg {{ width: 56px; height: 56px; fill: #ea4335; }}
        h1 {{ color: var(--text-heading); font-size: 24px; font-weight: 500; line-height: 1.35; margin-bottom: 16px; }}
        p {{ font-size: 14px; line-height: 1.6; margin-bottom: 16px; }}
        ul {{ margin: 0 0 24px 24px; font-size: 14px; line-height: 1.6; }}
        li {{ margin-bottom: 8px; }}
        .error-code {{ font-size: 12px; color: var(--code); font-family: monospace; margin-top: 24px; }}
        .btn-reload {{ display: inline-block; background: var(--btn-bg); color: var(--btn-text); padding: 8px 22px; border-radius: 4px; font-size: 14px; font-weight: 500; text-decoration: none; cursor: pointer; border: none; margin-top: 12px; }}
    </style>
</head>
<body>
    <div class="main-frame">
        <div class="icon-wrap">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        </div>
        <h1>This site can’t be reached</h1>
        <p><strong>{host}</strong> unexpectedly closed the connection.</p>
        <p>Try:</p>
        <ul>
            <li>Checking the connection</li>
            <li>Checking the proxy and the firewall</li>
            <li>Running Windows Network Diagnostics</li>
        </ul>
        <button type="button" class="btn-reload" onclick="window.location.reload();">Reload</button>
        <div class="error-code">ERR_CONNECTION_CLOSED</div>
    </div>
</body>
</html>"""


def render_block_page(reference_id: str = "N/A",
                      client_ip: str = "127.0.0.1",
                      attack_type: str = "Security Violation",
                      reason: str = "Malicious payload detected by MDefender Pro WAF",
                      website_name: str = "Protected Website") -> str:
    """Renders the official MDefender Pro 403 Cyber Block Page or stealth Dead Network page for blacklists."""
    atk = str(attack_type or "Security Violation")
    atk_l = atk.lower()
    reason_l = str(reason or "").lower()
    
    # Absolute Stealth: Blacklisted IPs & Country blocks ALWAYS render the authentic browser offline screen
    if "blacklist" in atk_l or "country" in atk_l or "geoip" in atk_l or "geograph" in atk_l or "probe" in atk_l or "blacklisted" in reason_l:
        return render_dead_network_page(website_name)
    if _CHUNKS is None:
        _compile_chunks()

    now_dt = datetime.now(timezone.utc)
    now_str = now_dt.strftime("%Y-%m-%d %H:%M:%S")
    unix_ref = str(int(now_dt.timestamp()))
    
    atk = str(attack_type or "Security Violation")
    rule_id = str((abs(binascii.crc32(atk.encode())) % 10000) + 90000)

    data = {
        "reference_id": str(reference_id or "N/A"),
        "client_ip": str(client_ip or "127.0.0.1"),
        "attack_type": atk,
        "reason": str(reason or "Request blocked by MDefender Pro WAF policy"),
        "timestamp": now_str,
        "unix_ref": unix_ref,
        "rule_id": rule_id,
        "website_name": str(website_name or "Protected Website")
    }

    out = []
    for j, key in enumerate(_KEYS):
        out.append(_CHUNKS[j])
        out.append(data.get(key, ""))
    out.append(_CHUNKS[-1])
    return "".join(out)
