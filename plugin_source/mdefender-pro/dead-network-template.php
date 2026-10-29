<?php
/**
 * Dead Network Template — Stealth Network Error & Offline Simulation
 * Displays a 100% authentic browser network offline / connection dropped screen
 * for blacklisted IPs and geo-restricted countries.
 * Zero MDefender branding. To the attacker or visitor, the host and network appear completely down.
 */
if (function_exists('http_response_code')) {
    http_response_code(502);
}
if (!headers_sent()) {
    header('HTTP/1.1 502 Bad Gateway', true, 502);
    header('Status: 502 Bad Gateway');
    header('Connection: close');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
}
$host = htmlspecialchars($_SERVER['HTTP_HOST'] ?? 'The site');
?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $host; ?></title>
    <style>
        :root {
            --bg: #202124;
            --text-heading: #e8eaed;
            --text-body: #9aa0a6;
            --icon-color: #9aa0a6;
            --link: #8ab4f8;
            --code: #9aa0a6;
            --btn-reload-bg: #8ab4f8;
            --btn-reload-text: #202124;
            --btn-details-border: #5f6368;
            --btn-details-text: #8ab4f8;
        }
        @media (prefers-color-scheme: light) {
            :root {
                --bg: #ffffff;
                --text-heading: #202124;
                --text-body: #5f6368;
                --icon-color: #5f6368;
                --link: #1a73e8;
                --code: #5f6368;
                --btn-reload-bg: #1a73e8;
                --btn-reload-text: #ffffff;
                --btn-details-border: #dadce0;
                --btn-details-text: #1a73e8;
            }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: var(--bg);
            color: var(--text-body);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            font-size: 14px;
            line-height: 1.6;
        }
        .main-frame {
            max-width: 580px;
            width: 100%;
        }
        .icon-wrap {
            margin-bottom: 24px;
            display: inline-block;
            color: var(--icon-color);
        }
        .icon-wrap svg {
            width: 48px;
            height: 48px;
            display: block;
        }
        h1 {
            color: var(--text-heading);
            font-size: 24px;
            font-weight: 500;
            line-height: 1.35;
            margin-bottom: 16px;
        }
        .sub-msg {
            color: var(--text-body);
            font-size: 14px;
            margin-bottom: 16px;
        }
        .sub-msg strong {
            font-weight: 600;
            color: var(--text-heading);
        }
        .try-heading {
            font-size: 14px;
            margin-bottom: 8px;
            color: var(--text-body);
        }
        ul {
            margin: 0 0 20px 20px;
            font-size: 14px;
            line-height: 1.6;
        }
        li {
            margin-bottom: 6px;
        }
        .error-code {
            font-size: 12px;
            color: var(--code);
            font-family: monospace;
            margin-top: 16px;
            letter-spacing: 0.5px;
        }
        .btn-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 28px;
        }
        .btn-reload {
            display: inline-block;
            background: var(--btn-reload-bg);
            color: var(--btn-reload-text);
            padding: 8px 24px;
            border-radius: 100px;
            font-size: 14px;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
            border: none;
            transition: opacity 0.15s ease;
        }
        .btn-reload:hover {
            opacity: 0.9;
        }
        .btn-details {
            display: inline-block;
            background: transparent;
            color: var(--btn-details-text);
            border: 1px solid var(--btn-details-border);
            padding: 8px 20px;
            border-radius: 100px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.15s ease;
        }
        .btn-details:hover {
            background: rgba(138, 180, 248, 0.08);
        }
        .details-panel {
            display: none;
            margin-top: 20px;
            padding: 16px;
            border-radius: 8px;
            background: rgba(128, 134, 139, 0.1);
            font-size: 13px;
            line-height: 1.6;
            color: var(--text-body);
        }
    </style>
</head>
<body>
    <div class="main-frame">
        <div class="icon-wrap">
            <!-- Exact Google Chrome Sad Page Sheet Icon -->
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 4h16l10 10v28a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
                <polyline points="28 4 28 14 38 14"/>
                <circle cx="19" cy="24" r="1.5" fill="currentColor"/>
                <circle cx="29" cy="24" r="1.5" fill="currentColor"/>
                <path d="M21 33c1.5-2.5 4.5-2.5 6 0"/>
            </svg>
        </div>
        <h1>This site can’t be reached</h1>
        <p class="sub-msg"><strong><?php echo $host; ?></strong>’s server IP address could not be found.</p>
        <p class="try-heading">Try:</p>
        <ul>
            <li>Checking the connection</li>
            <li>Checking the proxy, firewall, and DNS configuration</li>
            <li>Running Windows Network Diagnostics</li>
        </ul>
        <div class="error-code">ERR_NAME_NOT_RESOLVED</div>
        <div class="btn-row">
            <button type="button" class="btn-reload" onclick="window.location.reload();">Reload</button>
            <button type="button" class="btn-details" id="btnDetails" onclick="toggleDetails()">Details</button>
        </div>
        <div id="detailsPanel" class="details-panel">
            <p><strong>DNS_PROBE_FINISHED_NXDOMAIN</strong></p>
            <p style="margin-top: 6px;">Check if there is a typo in <?php echo $host; ?>. If spelling is correct, try running Windows Network Diagnostics.</p>
        </div>
    </div>
    <script>
        function toggleDetails() {
            var panel = document.getElementById('detailsPanel');
            var btn = document.getElementById('btnDetails');
            if (panel.style.display === 'block') {
                panel.style.display = 'none';
                btn.textContent = 'Details';
            } else {
                panel.style.display = 'block';
                btn.textContent = 'Hide details';
            }
        }
    </script>
</body>
</html>
<?php
while (ob_get_level() > 0) {
    @ob_end_flush();
}
@flush();
exit;
