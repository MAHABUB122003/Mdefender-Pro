<?php
/**
 * MDefender Pro - Enterprise WAF Block Page Template
 * 
 * High-performance, branded, Cloudflare-inspired enterprise block page.
 * 
 * @package MDefenderPro
 */

if (!defined('ABSPATH')) {
    exit;
}

// Variables available:
// $client_ip      - Visitor's IP address
// $reference_id   - Unique MDefender Ray/Incident ID
// $rule_name      - Triggered firewall rule name
// $attack_type    - Classification (SQLi, XSS, RCE, etc.)
// $site_host      - Target hostname (e.g., example.com)
// $utc_timestamp  - UTC timestamp formatted string
// $admin_email    - Site administrator contact email
// $home_url       - Homepage URL

$client_ip      = isset($client_ip) ? $client_ip : (isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '127.0.0.1');
$reference_id   = isset($reference_id) ? $reference_id : 'MDEF-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8));
$site_host      = isset($site_host) ? $site_host : (isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost');
$attack_type    = isset($attack_type) ? $attack_type : 'Web Application Attack';
$rule_name      = isset($rule_name) ? $rule_name : $attack_type;
$utc_timestamp  = isset($utc_timestamp) ? $utc_timestamp : gmdate('Y-m-d H:i:s') . ' UTC';
$admin_email    = isset($admin_email) ? $admin_email : get_option('admin_email', 'security@' . $site_host);
$home_url       = isset($home_url) ? $home_url : home_url('/');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
    <title>Access Restricted | MDefender Pro Security</title>
    <style>
        :root {
            --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", Arial, sans-serif;
            --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", "Courier New", monospace;
            --text-main: #333333;
            --text-sub: #555555;
            --text-muted: #777777;
            --bg-gray: #eeeeee;
            --border-gray: #e2e2e2;
            --browser-bar: #8a8a8a;
            --alert-red: #bd2426;
        }

        *, *::before, *::after {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html, body {
            width: 100%;
            min-height: 100%;
            background-color: #ffffff;
            font-family: var(--font-family);
            color: var(--text-main);
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        .page-container {
            width: 100%;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .content-wrap {
            max-width: 900px;
            width: 100%;
            margin: 0 auto;
            padding: 0 24px;
        }

        /* Top Heading Section */
        .header-section {
            padding-top: 52px;
            padding-bottom: 28px;
        }

        .policy-pill {
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #555555;
            background: #f3f4f6;
            border: 1px solid #e5e7eb;
            padding: 4px 12px;
            border-radius: 9999px;
            margin-bottom: 12px;
        }

        .blocked-title {
            font-size: 38px;
            font-weight: 400;
            color: #333333;
            margin: 0 0 8px 0;
            letter-spacing: -0.02em;
            line-height: 1.2;
        }

        .blocked-subtitle {
            font-size: 16px;
            font-weight: 400;
            color: #666666;
            margin: 0;
            line-height: 1.4;
        }

        .blocked-domain {
            color: #333333;
            font-weight: 500;
        }

        /* Center Full-Width Gray Section with Browser Mockup */
        .mockup-section {
            width: 100%;
            background-color: var(--bg-gray);
            border-top: 1px solid var(--border-gray);
            border-bottom: 1px solid var(--border-gray);
            padding: 48px 24px;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .browser-mockup {
            max-width: 720px;
            width: 100%;
            background: #ffffff;
            border-radius: 6px;
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
            overflow: hidden;
            border: 1px solid #dcdcdc;
        }

        .browser-header {
            background: var(--browser-bar);
            height: 38px;
            display: flex;
            align-items: center;
            padding: 0 14px;
            gap: 6px;
        }

        .browser-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #ffffff;
            opacity: 0.85;
            display: inline-block;
        }

        .browser-address-bar {
            margin-left: 14px;
            background: rgba(255, 255, 255, 0.3);
            height: 20px;
            border-radius: 3px;
            width: 38%;
            max-width: 220px;
        }

        .browser-body {
            height: 270px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
        }

        .block-badge-circle {
            width: 94px;
            height: 94px;
            border-radius: 50%;
            background-color: var(--alert-red);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 6px 18px rgba(189, 36, 38, 0.22);
        }

        .block-badge-circle svg {
            width: 44px;
            height: 44px;
            stroke: #ffffff;
            stroke-width: 3.4;
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        /* Bottom 2 Columns */
        .columns-section {
            padding-top: 48px;
            padding-bottom: 36px;
        }

        .columns-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 52px;
        }

        @media (max-width: 740px) {
            .columns-grid {
                grid-template-columns: 1fr;
                gap: 28px;
            }
        }

        .col-heading {
            font-size: 18px;
            font-weight: 500;
            color: #333333;
            margin: 0 0 12px 0;
            line-height: 1.3;
        }

        .col-desc {
            font-size: 14px;
            line-height: 1.65;
            color: #555555;
            margin: 0;
        }

        .attack-pill {
            margin-top: 14px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            background: #fee2e2;
            border: 1px solid #fca5a5;
            border-radius: 4px;
            font-size: 12px;
            color: #991b1b;
            font-family: var(--font-mono);
        }

        .action-tools {
            margin-top: 16px;
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }

        .btn-contact {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            background: #2b2b2b;
            color: #ffffff;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 500;
            text-decoration: none;
            transition: background 0.15s ease;
        }

        .btn-contact:hover {
            background: #111111;
        }

        .btn-copy {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            background: #f3f4f6;
            color: #374151;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .btn-copy:hover {
            background: #e5e7eb;
            color: #111111;
        }

        /* Footer Metadata */
        .footer-section {
            border-top: 1px solid var(--border-gray);
            padding: 26px 0 36px 0;
        }

        .footer-meta {
            font-size: 13px;
            color: var(--text-muted);
            line-height: 1.8;
            text-align: center;
        }

        .footer-meta strong {
            color: #222222;
        }

        .meta-dot {
            margin: 0 10px;
            color: #9ca3af;
        }

        .ip-mono {
            font-family: var(--font-mono);
            color: #374151;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="page-container">
        <!-- Top Heading Section -->
        <header class="header-section">
            <div class="content-wrap">
                <span class="policy-pill">MDEFENDER PRO &bull; EDGE POLICY ENFORCEMENT</span>
                <h1 class="blocked-title">Access Restricted by Security Policy</h1>
                <p class="blocked-subtitle">Your connection to <span class="blocked-domain"><?php echo esc_html($site_host); ?></span> was flagged and intercepted by automated threat protection.</p>
            </div>
        </header>

        <!-- Center Full-Width Gray Section with Browser Mockup -->
        <section class="mockup-section">
            <div class="browser-mockup">
                <div class="browser-header" aria-hidden="true">
                    <span class="browser-dot"></span>
                    <span class="browser-dot"></span>
                    <span class="browser-dot"></span>
                    <span class="browser-address-bar"></span>
                </div>
                <div class="browser-body">
                    <div class="block-badge-circle" role="img" aria-label="Blocked Access">
                        <svg viewBox="0 0 24 24" fill="none">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </div>
                </div>
            </div>
        </section>

        <!-- Bottom Explanations -->
        <main class="columns-section">
            <div class="content-wrap">
                <div class="columns-grid">
                    <!-- Left Column -->
                    <div>
                        <h2 class="col-heading">Why have I been blocked?</h2>
                        <p class="col-desc">This website is using a security service to protect itself from online attacks. The action you just performed triggered the security solution. There are several actions that could trigger this block including submitting a certain word or phrase, a SQL command or malformed data.</p>
                        <div class="attack-pill">
                            <span>Violation:</span>
                            <strong><?php echo esc_html($rule_name ?: $attack_type); ?></strong>
                        </div>
                    </div>

                    <!-- Right Column -->
                    <div>
                        <h2 class="col-heading">What can I do to resolve this?</h2>
                        <p class="col-desc">You can email the site owner to let them know you were blocked. Please include what you were doing when this page came up and the MDefender Ray ID found at the bottom of this page.</p>
                        <div class="action-tools">
                            <a href="mailto:<?php echo esc_attr($admin_email); ?>?subject=MDefender%20Block%20Ray%20ID:%20<?php echo esc_attr($reference_id); ?>" class="btn-contact">
                                Contact Site Administrator
                            </a>
                            <button type="button" class="btn-copy" id="copyBtn" onclick="copyReferenceId()">
                                Copy Ray ID
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <!-- Footer Metadata -->
        <footer class="footer-section">
            <div class="content-wrap">
                <div class="footer-meta">
                    <div>
                        <span>MDefender Ray ID: <strong id="rayIdVal"><?php echo esc_html($reference_id); ?></strong></span>
                        <span class="meta-dot">&bull;</span>
                        <span>Your IP: <span class="ip-mono"><?php echo esc_html($client_ip); ?></span></span>
                        <span class="meta-dot">&bull;</span>
                        <span>Performance &amp; security by <strong>MDefender Pro</strong></span>
                    </div>
                    <div style="margin-top: 4px; font-size: 12px; color: #888888;">
                        <span>Timestamp: <?php echo esc_html($utc_timestamp); ?></span>
                    </div>
                </div>
            </div>
        </footer>
    </div>

    <script>
        const refId = "<?php echo esc_js($reference_id); ?>";
        function copyReferenceId() {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(refId).then(function() {
                    var btn = document.getElementById('copyBtn');
                    if (btn) {
                        var original = btn.innerText;
                        btn.innerText = 'Copied!';
                        btn.style.borderColor = '#10b981';
                        btn.style.color = '#10b981';
                        setTimeout(function() {
                            btn.innerText = original;
                            btn.style.borderColor = '';
                            btn.style.color = '';
                        }, 2000);
                    }
                }).catch(function() {
                    alert('MDefender Ray ID: ' + refId);
                });
            } else {
                alert('MDefender Ray ID: ' + refId);
            }
        }
    </script>
</body>
</html>
