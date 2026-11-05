<?php
if (!defined('ABSPATH') && !defined('WAF_FW_BOOTSTRAP_ACTIVE') && !defined('WAF_FW_PLUGIN_DIR')) {
    exit;
}

if (!function_exists('esc_html')) {
    function esc_html($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
}
if (!function_exists('esc_url')) {
    function esc_url($s) { return filter_var($s, FILTER_SANITIZE_URL); }
}
if (!function_exists('esc_attr')) {
    function esc_attr($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
}
if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field($s) { return strip_tags(trim((string)$s)); }
}
if (!function_exists('esc_js')) {
    function esc_js($s) { return addcslashes((string)$s, "\'\"\r\n\0\x08\x0c\x1a"); }
}

// Dynamic variables extracted from WAF analysis context
$attack_type  = !empty($result['attack_type']) ? $result['attack_type'] : 'Suspicious Request Pattern';
$client_ip    = !empty($result['ip']) ? $result['ip'] : ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
$reason       = !empty($result['message']) ? $result['message'] : '';
$reference_id = !empty($result['reference_id']) ? $result['reference_id'] : ('MDEF-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8)));
$timestamp    = !empty($result['timestamp']) ? $result['timestamp'] : (function_exists('current_time') ? current_time('mysql') : gmdate('Y-m-d H:i:s'));
$site_host    = !empty($_SERVER['HTTP_HOST']) ? sanitize_text_field($_SERVER['HTTP_HOST']) : (!empty($_SERVER['SERVER_NAME']) ? sanitize_text_field($_SERVER['SERVER_NAME']) : (function_exists('gethostname') ? gethostname() : 'localhost'));
$site_name    = function_exists('get_bloginfo') ? (get_bloginfo('name') ?: $site_host) : $site_host;

// Determine Policy vs Attack Type
$is_country_block = (
    $attack_type === 'Country Blocked' ||
    $attack_type === 'Country / Regional Restriction' ||
    stripos($attack_type, 'Country') !== false ||
    stripos($attack_type, 'GeoIP') !== false ||
    stripos($reason, 'country') !== false ||
    stripos($reason, 'geographic') !== false
);

$is_ip_blacklist = (
    !$is_country_block && (
        $attack_type === 'Blacklisted IP' ||
        stripos($attack_type, 'Blacklist') !== false ||
        stripos($reason, 'blacklisted') !== false
    )
);

// 1. IP Blacklist: Render dedicated authentic LiteSpeed-style 403 Forbidden page with visible IP disclosure
if ($is_ip_blacklist) {
    $ip_template = __DIR__ . '/ip-blacklist-template.php';
    if (file_exists($ip_template)) {
        include $ip_template;
        exit;
    }
}

// 2. Country / Geographic Block & Admin Probes: Stealth Dead Network (502 / ERR_NAME_NOT_RESOLVED)
if ($is_country_block || $attack_type === 'Server Admin Probe') {
    $dead_template = __DIR__ . '/dead-network-template.php';
    if (file_exists($dead_template)) {
        include $dead_template;
        exit;
    }
}

// Convert timestamp to UTC & get Unix ref
try {
    $dt = new DateTime($timestamp, new DateTimeZone('UTC'));
    $utc_timestamp = $dt->format('Y-m-d H:i:s') . ' UTC';
    $unix_ref = $dt->getTimestamp();
} catch (Exception $e) {
    $utc_timestamp = gmdate('Y-m-d H:i:s') . ' UTC';
    $unix_ref = time();
}

$protocol = !empty($_SERVER['SERVER_PROTOCOL']) ? sanitize_text_field($_SERVER['SERVER_PROTOCOL']) : 'HTTP/1.1';
$admin_email = function_exists('get_option') ? (get_option('admin_email') ?: 'security@' . $site_host) : ('security@' . $site_host);
$home_url = function_exists('home_url') ? home_url('/') : '/';
?><!DOCTYPE html>
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
            --text-heading: #1e293b;
            --text-body: #475569;
            --text-muted: #64748b;
            --bg-gray: #eeeeee;
            --border-gray: #e2e8f0;
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
            color: var(--text-body);
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
            max-width: 920px;
            width: 100%;
            margin: 0 auto;
            padding: 0 24px;
        }

        /* Top Section: Header Title + 2 Columns */
        .top-section {
            padding-top: 44px;
            padding-bottom: 34px;
        }

        .top-header {
            margin-bottom: 26px;
        }

        .main-title {
            font-size: 34px;
            font-weight: 500;
            color: var(--text-heading);
            margin: 0 0 8px 0;
            letter-spacing: -0.02em;
            line-height: 1.25;
        }

        .main-subtitle {
            font-size: 15px;
            font-weight: 400;
            color: var(--text-muted);
            margin: 0;
            line-height: 1.5;
        }

        .site-host {
            color: var(--text-heading);
            font-weight: 600;
        }

        .explainer-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 48px;
        }

        .explainer-col h2 {
            font-size: 17.5px;
            font-weight: 600;
            color: var(--text-heading);
            margin: 0 0 10px 0;
            line-height: 1.3;
        }

        .explainer-col p {
            font-size: 14px;
            line-height: 1.65;
            color: var(--text-body);
            margin: 0;
        }

        /* Center Full-Width Gray Section with Browser Mockup */
        .mockup-section {
            width: 100%;
            background-color: var(--bg-gray);
            border-top: 1px solid #e0e0e0;
            border-bottom: 1px solid #e0e0e0;
            padding: 44px 24px;
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
            height: 260px;
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

        /* Bottom Section: Technical Details & Actions */
        .bottom-section {
            padding-top: 36px;
            padding-bottom: 30px;
        }

        .tech-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 18px 24px;
            margin-bottom: 24px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }

        .tech-item-label {
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 4px;
        }

        .tech-item-value {
            font-size: 14px;
            font-weight: 600;
            color: #1e293b;
        }

        .tech-item-mono {
            font-family: var(--font-mono);
            font-size: 13.5px;
            color: #0f172a;
        }

        .action-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 14px;
            flex-wrap: wrap;
            margin-bottom: 24px;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 9px 20px;
            border-radius: 6px;
            font-size: 13.5px;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.15s ease;
            border: 1px solid transparent;
        }

        .btn-primary {
            background: #1e293b;
            color: #ffffff;
        }

        .btn-primary:hover {
            background: #0f172a;
        }

        .btn-secondary {
            background: #ffffff;
            color: #334155;
            border-color: #cbd5e1;
        }

        .btn-secondary:hover {
            background: #f1f5f9;
        }

        /* Footer */
        .footer-section {
            margin-top: auto;
            border-top: 1px solid #e2e8f0;
            padding: 20px 0 28px 0;
            text-align: center;
            font-size: 12.5px;
            color: #94a3b8;
        }

        .footer-section strong {
            color: #475569;
        }

        @media (max-width: 740px) {
            .explainer-grid {
                grid-template-columns: 1fr;
                gap: 24px;
            }
            .main-title {
                font-size: 26px;
            }
            .mockup-section {
                padding: 28px 16px;
            }
            .browser-body {
                height: 200px;
            }
            .block-badge-circle {
                width: 74px;
                height: 74px;
            }
            .block-badge-circle svg {
                width: 36px;
                height: 36px;
            }
            .tech-card {
                grid-template-columns: 1fr;
                gap: 14px;
            }
        }
    </style>
</head>
<body>
    <div class="page-container">
        <!-- Top Section: Header Title + 2 Columns -->
        <header class="top-section">
            <div class="content-wrap">
                <div class="top-header">
                    <h1 class="main-title">Access Restricted by Security Policy</h1>
                    <p class="main-subtitle">Your connection to <span class="site-host"><?php echo esc_html($site_host); ?></span> was intercepted by automated security protection.</p>
                </div>
                <div class="explainer-grid">
                    <div class="explainer-col">
                        <h2>Why was this request blocked?</h2>
                        <p>This website employs MDefender Pro automated defense to safeguard infrastructure against malicious probes, automated abuse, and abnormal request patterns. Your interaction triggered an edge inspection security rule.</p>
                    </div>
                    <div class="explainer-col">
                        <h2>What can I do to resolve this?</h2>
                        <p>If you believe this restriction was triggered by mistake, you can return to the homepage or notify the website administrator with your incident Reference ID and Client IP shown below.</p>
                    </div>
                </div>
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
                    <div class="block-badge-circle" role="img" aria-label="Access Blocked">
                        <svg viewBox="0 0 24 24" fill="none">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </div>
                </div>
            </div>
        </section>

        <!-- Bottom Technical Details & Action Tools -->
        <main class="bottom-section">
            <div class="content-wrap">
                <div class="tech-card">
                    <div>
                        <div class="tech-item-label">Client IP Address</div>
                        <div class="tech-item-value tech-item-mono"><?php echo esc_html($client_ip); ?></div>
                    </div>
                    <div>
                        <div class="tech-item-label">Incident Reference ID</div>
                        <div class="tech-item-value tech-item-mono" id="rayIdVal"><?php echo esc_html($reference_id); ?></div>
                    </div>
                    <div>
                        <div class="tech-item-label">Timestamp (UTC)</div>
                        <div class="tech-item-value"><?php echo esc_html($utc_timestamp); ?></div>
                    </div>
                </div>

                <div class="action-row">
                    <a href="<?php echo esc_url($home_url); ?>" class="btn btn-primary">
                        Return to Homepage
                    </a>
                    <button type="button" class="btn btn-secondary" id="copyBtn" onclick="copyReferenceId()">
                        Copy Reference ID
                    </button>
                    <a href="mailto:<?php echo esc_attr($admin_email); ?>?subject=MDefender%20Security%20Incident:%20<?php echo esc_attr($reference_id); ?>" class="btn btn-secondary">
                        Email Administrator
                    </a>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="footer-section">
            <div class="content-wrap">
                <div>
                    Performance &amp; security by <strong>MDefender Pro</strong> Enterprise WAF. Security incident logged and audited.
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
                    alert('Reference ID: ' + refId);
                });
            } else {
                alert('Reference ID: ' + refId);
            }
        }
    </script>
</body>
</html>