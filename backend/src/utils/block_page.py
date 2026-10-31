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


def render_real_403_forbidden(website_name: str = "This site") -> str:
    """Authentic, universal standard 403 Forbidden network screen matching Nginx / Chromium."""
    return """<html>
<head><title>403 Forbidden</title></head>
<body>
<center><h1>403 Forbidden</h1></center>
<hr><center>nginx</center>
</body>
</html>"""


def render_real_502_bad_gateway(website_name: str = "This site") -> str:
    """Authentic, universal standard 502 Bad Gateway network screen."""
    return """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>502 Bad Gateway</title>
<style>
body {
    background-color: #ffffff;
    color: #222222;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    margin: 0;
    padding: 0;
}
@media (prefers-color-scheme: dark) {
    body { background-color: #121212; color: #eeeeee; }
    hr { border-color: #333333 !important; }
}
.container {
    margin: 0 auto;
    margin-top: 22vh;
    text-align: center;
    max-width: 600px;
    padding: 0 20px;
}
h1 {
    font-size: 34px;
    font-weight: 500;
    margin: 0 0 12px 0;
    letter-spacing: -0.5px;
}
hr {
    border: 0;
    border-top: 1px solid #dddddd;
    margin: 16px auto;
    max-width: 500px;
}
.server {
    font-size: 14px;
    color: #777777;
}
</style>
</head>
<body>
<div class="container">
    <h1>502 Bad Gateway</h1>
    <hr>
    <div class="server">nginx</div>
</div>
</body>
</html>"""


def render_dead_network_page(website_name: str = "This site") -> str:
    return render_real_502_bad_gateway(website_name)


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
    
    # 1. IP Blacklist: Return authentic standard 403 Forbidden
    if "blacklist" in atype:
        return render_real_403_forbidden(website_name)

    # 2. Country Restrictions & GeoIP: Authentic 502 Bad Gateway
    is_geo = (
        "country" in atype
        or "geoip" in atype
        or "geograph" in atype
    )
    if is_geo:
        return render_real_502_bad_gateway(website_name)

    # 3. Host Administration / Port / Probe Block: Authentic 403 Forbidden
    if any(k in atype for k in ["probe", "cpanel", "port", "admin"]):
        return render_real_403_forbidden(website_name)

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
