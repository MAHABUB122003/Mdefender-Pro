<?php
/**
 * Dead Network Template — 100% Authentic Google Chrome Stealth Offline Screen
 *
 * Pixel-perfect replica of Google Chrome's authentic Dark Mode "This site can't be reached"
 * (ERR_NAME_NOT_RESOLVED / 502 Bad Gateway) matching official Chromium neterror specifications.
 * Zero MDefender branding. To the visitor or attacker, the site is completely unreachable.
 *
 * @package MDefender-Pro
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

$raw_host = $_SERVER['HTTP_HOST'] ?? ($_SERVER['SERVER_NAME'] ?? 'The site');
$clean_host = preg_replace('/:\d+$/', '', trim((string)$raw_host));
$host = htmlspecialchars($clean_host, ENT_QUOTES, 'UTF-8');
?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $host; ?></title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        html, body {
            height: 100%;
            background-color: #202124;
            color: #9aa0a6;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 15px;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
        }

        body {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 30px 24px;
        }

        .main-frame {
            max-width: 600px;
            width: 100%;
        }

        /* Exact Google Chrome NetError Sad Page Document Icon */
        .icon-wrap {
            margin-bottom: 24px;
            display: inline-block;
            color: #9aa0a6;
        }

        .icon-wrap svg {
            width: 48px;
            height: 48px;
            display: block;
        }

        h1 {
            color: #e8eaed;
            font-size: 24px;
            font-weight: 500;
            line-height: 1.35;
            margin-bottom: 16px;
            letter-spacing: -0.2px;
        }

        .sub-msg {
            color: #9aa0a6;
            font-size: 15px;
            line-height: 1.5;
            margin-bottom: 20px;
        }

        .sub-msg strong {
            font-weight: 600;
            color: #e8eaed;
        }

        .try-heading {
            font-size: 15px;
            margin-bottom: 8px;
            color: #9aa0a6;
        }

        ul.try-list {
            margin: 0 0 24px 22px;
            font-size: 15px;
            line-height: 1.6;
            color: #9aa0a6;
        }

        ul.try-list li {
            margin-bottom: 6px;
        }

        ul.try-list li::marker {
            color: #9aa0a6;
        }

        /* Authentic Blue Diagnostic Links */
        .blue-link {
            color: #8ab4f8;
            text-decoration: none;
            cursor: pointer;
        }

        .blue-link:hover {
            text-decoration: underline;
        }

        .error-code {
            font-size: 12px;
            color: #9aa0a6;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin-top: 24px;
            margin-bottom: 32px;
            letter-spacing: 0.3px;
        }

        /* Action Buttons Row */
        .btn-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .btn-reload {
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
        }

        .btn-reload:hover {
            opacity: 0.9;
        }

        .btn-details {
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
        }

        .btn-details:hover {
            background: rgba(138, 180, 248, 0.08);
        }

        .details-panel {
            display: none;
            margin-top: 24px;
            padding: 16px 20px;
            border-radius: 8px;
            background: rgba(128, 134, 139, 0.1);
            font-size: 13.5px;
            line-height: 1.6;
            color: #9aa0a6;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .details-panel strong {
            color: #e8eaed;
        }

        @media (max-width: 540px) {
            h1 {
                font-size: 21px;
            }
            .sub-msg, .try-heading, ul.try-list {
                font-size: 14px;
            }
        }
    </style>
</head>
<body>
    <div class="main-frame">
        <div class="icon-wrap">
            <!-- Exact Google Chrome Sad Page Document SVG (Official Chromium NetError) -->
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
                <path fill="#9aa0a6" d="M30 4H14c-2.2 0-4 1.8-4 4v32c0 2.2 1.8 4 4 4h20c2.2 0 4-1.8 4-4V12l-8-8zm-2 10V6.5L35.5 14H28zM18 22c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm12 0c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-6 12c-3.1 0-5.7-2.1-6.5-5h13c-.8 2.9-3.4 5-6.5 5z"/>
            </svg>
        </div>

        <h1>This site can’t be reached</h1>
        <p class="sub-msg"><strong><?php echo $host; ?></strong>’s server IP address could not be found.</p>

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
            <p style="margin-top: 8px;">Check if there is a typo in <?php echo $host; ?>. If spelling is correct, try running Windows Network Diagnostics.</p>
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
