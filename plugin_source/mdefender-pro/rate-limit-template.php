<?php
/**
 * MDefender-Pro Authentic RFC 6585 HTTP 429 Too Many Requests / Rate Limit Template
 *
 * Professional, reassuring Enterprise Security Cooldown Page for legitimate visitors
 * and automated bot mitigation. Does not panic the user with harsh 403 errors.
 *
 * @package MDefender-Pro
 */

if (!defined('ABSPATH') && !defined('WAF_FW_BOOTSTRAP_ACTIVE') && !defined('WAF_FW_PLUGIN_DIR')) {
    exit;
}

$remaining_seconds = isset($remaining_seconds) ? max(5, intval($remaining_seconds)) : 60;
$retry_after = $remaining_seconds;

if (!headers_sent()) {
    if (function_exists('http_response_code')) {
        http_response_code(429);
    }
    header('HTTP/1.1 429 Too Many Requests', true, 429);
    header('Status: 429 Too Many Requests');
    header('Retry-After: ' . $retry_after);
    header('Content-Type: text/html; charset=UTF-8');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('X-Protected-By: MDefender-Pro-WAAP');
}

$client_ip = !empty($client_ip) ? $client_ip : (!empty($result['ip']) ? $result['ip'] : ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'));
$site_host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$site_name = function_exists('get_bloginfo') ? (get_bloginfo('name') ?: $site_host) : $site_host;
$home_url  = function_exists('home_url') ? home_url('/') : '/';
$ref_id    = !empty($result['reference_id']) ? $result['reference_id'] : ('RL-' . strtoupper(substr(md5(uniqid((string) mt_rand(), true)), 0, 8)));
$cooldown_reason = !empty($cooldown_reason) ? $cooldown_reason : 'Multiple failed attempts or elevated request velocity detected from your network.';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>429 Too Many Requests - Security Cooldown | <?php echo htmlspecialchars($site_name); ?></title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: radial-gradient(circle at 50% 20%, #0D2D29 0%, #071A18 60%, #040F0E 100%);
            color: #E2E8F0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            overflow-x: hidden;
        }
        .cooldown-card {
            background: rgba(11, 37, 34, 0.85);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(232, 121, 47, 0.35);
            border-radius: 20px;
            max-width: 560px;
            width: 100%;
            padding: 40px 36px;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55), 0 0 40px rgba(232, 121, 47, 0.12);
            text-align: center;
            position: relative;
        }
        .header-badge {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            background: rgba(232, 121, 47, 0.14);
            border: 1px solid rgba(232, 121, 47, 0.35);
            color: #E8792F;
            font-size: 11.5px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            padding: 6px 14px;
            border-radius: 999px;
            margin-bottom: 24px;
        }
        .icon-orbit {
            width: 72px;
            height: 72px;
            margin: 0 auto 20px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(232, 121, 47, 0.2), rgba(11, 37, 34, 0.4));
            border: 1.5px solid rgba(232, 121, 47, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 24px rgba(232, 121, 47, 0.25);
        }
        .icon-orbit svg {
            width: 36px;
            height: 36px;
            stroke: #E8792F;
            fill: none;
            stroke-width: 2.2;
            stroke-linecap: round;
            stroke-linejoin: round;
        }
        h1 {
            font-size: 24px;
            font-weight: 800;
            color: #FFFFFF;
            letter-spacing: -0.02em;
            margin-bottom: 12px;
        }
        .reason-text {
            font-size: 14.5px;
            color: #94A3B8;
            line-height: 1.6;
            margin-bottom: 26px;
        }
        .timer-box {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 14px;
            padding: 20px 24px;
            margin-bottom: 28px;
        }
        .timer-label {
            font-size: 12px;
            color: #889895;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 8px;
        }
        .timer-clock {
            font-size: 40px;
            font-weight: 800;
            font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
            color: #FFFFFF;
            letter-spacing: 0.05em;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
        }
        .timer-subtext {
            font-size: 12.5px;
            color: #CBD5E1;
            margin-top: 6px;
        }
        .safe-notice {
            background: rgba(16, 185, 129, 0.08);
            border: 1px solid rgba(16, 185, 129, 0.25);
            border-radius: 10px;
            padding: 12px 16px;
            font-size: 13px;
            color: #A7F3D0;
            margin-bottom: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .actions-group {
            display: flex;
            gap: 12px;
            justify-content: center;
            flex-wrap: wrap;
            margin-bottom: 28px;
        }
        .btn-primary {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #E8792F;
            color: #FFFFFF;
            font-size: 13.5px;
            font-weight: 700;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 10px;
            transition: all 0.2s ease;
            box-shadow: 0 4px 14px rgba(232, 121, 47, 0.35);
        }
        .btn-primary:hover {
            background: #D4661E;
            transform: translateY(-1px);
        }
        .btn-secondary {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(255, 255, 255, 0.06);
            color: #E2E8F0;
            border: 1px solid rgba(255, 255, 255, 0.15);
            font-size: 13.5px;
            font-weight: 600;
            text-decoration: none;
            padding: 12px 20px;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.12);
        }
        .diag-meta {
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            padding-top: 18px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11.5px;
            color: #64748B;
            flex-wrap: wrap;
            gap: 8px;
        }
        .diag-meta code {
            color: #CBD5E1;
            background: rgba(255, 255, 255, 0.06);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div class="cooldown-card">
        <div class="header-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <span>HTTP 429 • Security Rate Limited</span>
        </div>

        <div class="icon-orbit">
            <svg viewBox="0 0 24 24">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <circle cx="12" cy="11" r="3"></circle>
                <polyline points="12 9.5 12 11 13.5 11"></polyline>
            </svg>
        </div>

        <h1>Login Portal Temporary Cooldown</h1>
        <p class="reason-text">
            <?php echo htmlspecialchars($cooldown_reason); ?>
        </p>

        <div class="timer-box">
            <div class="timer-label">Cooldown Active • Resumes Automatically In</div>
            <div class="timer-clock" id="countdownClock">--:--</div>
            <div class="timer-subtext">The page will refresh and restore access as soon as the cooldown finishes.</div>
        </div>

        <div class="safe-notice">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span><strong>Isolated Scope:</strong> Your access to all public website pages remains completely active.</span>
        </div>

        <div class="actions-group">
            <a href="<?php echo htmlspecialchars($home_url); ?>" class="btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                <span>Return to Public Homepage</span>
            </a>
            <button onclick="window.location.reload()" class="btn-secondary">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
                <span>Check Now</span>
            </button>
        </div>

        <div class="diag-meta">
            <div>Client IP: <code><?php echo htmlspecialchars($client_ip); ?></code></div>
            <div>Ref ID: <code><?php echo htmlspecialchars($ref_id); ?></code></div>
            <div>Protected by <strong>MDefender Pro</strong></div>
        </div>
    </div>

    <script>
        (function() {
            var remaining = <?php echo intval($remaining_seconds); ?>;
            var clockEl = document.getElementById('countdownClock');

            function updateDisplay() {
                if (remaining <= 0) {
                    clockEl.textContent = '00:00';
                    setTimeout(function() {
                        window.location.reload();
                    }, 1000);
                    return;
                }
                var mins = Math.floor(remaining / 60);
                var secs = remaining % 60;
                clockEl.textContent = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
                remaining--;
            }

            updateDisplay();
            var timerId = setInterval(function() {
                updateDisplay();
                if (remaining < 0) {
                    clearInterval(timerId);
                }
            }, 1000);
        })();
    </script>
</body>
</html>

