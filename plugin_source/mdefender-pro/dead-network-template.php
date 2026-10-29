<?php
/**
 * Dead Network Template — Offline / Connection Dropped Simulation
 * Displays a realistic browser offline network error screen for blacklisted IPs.
 * Zero MDefender branding. To the attacker, the host and network appear completely dead.
 */
if (!headers_sent()) {
    header('HTTP/1.1 444 No Response', true, 444);
    header('Status: 444 No Response');
    header('Connection: close');
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
            --bg: #ffffff;
            --text-heading: #202124;
            --text-body: #5f6368;
            --link: #1a73e8;
            --code: #5f6368;
            --btn-bg: #1a73e8;
            --btn-text: #ffffff;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --bg: #202124;
                --text-heading: #e8eaed;
                --text-body: #9aa0a6;
                --link: #8ab4f8;
                --code: #9aa0a6;
                --btn-bg: #8ab4f8;
                --btn-text: #202124;
            }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: var(--bg);
            color: var(--text-body);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }
        .main-frame {
            max-width: 560px;
            width: 100%;
        }
        .icon-wrap {
            margin-bottom: 24px;
            display: inline-block;
        }
        .icon-wrap svg {
            width: 56px;
            height: 56px;
            fill: #ea4335;
        }
        h1 {
            color: var(--text-heading);
            font-size: 24px;
            font-weight: 500;
            line-height: 1.35;
            margin-bottom: 16px;
        }
        p {
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 16px;
        }
        ul {
            margin: 0 0 24px 24px;
            font-size: 14px;
            line-height: 1.6;
        }
        li {
            margin-bottom: 8px;
        }
        .error-code {
            font-size: 12px;
            color: var(--code);
            font-family: monospace;
            margin-top: 24px;
        }
        .btn-reload {
            display: inline-block;
            background: var(--btn-bg);
            color: var(--btn-text);
            padding: 8px 22px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
            border: none;
            margin-top: 12px;
        }
    </style>
</head>
<body>
    <div class="main-frame">
        <div class="icon-wrap">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        </div>
        <h1>This site can’t be reached</h1>
        <p><strong><?php echo $host; ?></strong> unexpectedly closed the connection.</p>
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
</html>
<?php
while (ob_get_level() > 0) {
    @ob_end_flush();
}
@flush();
exit;
