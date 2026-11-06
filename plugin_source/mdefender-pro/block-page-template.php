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
$reason       = !empty($result['message']) ? $result['message'] : 'Request blocked by active security rule (Pattern Match)';
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

$rule_name = !empty($result['rule_matched']) ? $result['rule_matched'] : '';
if (empty($rule_name)) {
    if (!empty($result['attack_type']) && $result['attack_type'] !== 'Security Threat') {
        $rule_name = $result['attack_type'];
    } else {
        $rule_name = 'Pre-Flight WAAP: Script Tag & Event Handler Guard';
    }
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
            --bg-page: #ffffff;
            --bg-banner: #ebebeb;
            --text-heading: #0f172a;
            --text-body: #334155;
            --text-sub: #475569;
            --text-muted: #64748b;
            --border-banner: #dadada;
            --border-btn: #cbd5e1;
            --font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", "Courier New", monospace;
        }

        *, *::before, *::after {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background-color: var(--bg-page);
            font-family: var(--font-family);
            color: var(--text-body);
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            overflow: hidden;
        }

        .page-container {
            width: 100%;
            height: 100vh;
            max-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
            box-sizing: border-box;
        }

        .content-wrap {
            max-width: 820px;
            width: 100%;
            margin: 0 auto;
            padding: 0 20px;
            box-sizing: border-box;
        }

        /* Top Section: Heading + Explainer Grid */
        .top-section {
            padding-top: 28px;
            padding-bottom: 16px;
            flex: 0 0 auto;
        }

        .main-heading-wrap {
            margin-bottom: 16px;
        }

        .main-title {
            font-size: 27px;
            font-weight: 600;
            color: var(--text-heading);
            margin: 0 0 5px 0;
            letter-spacing: -0.015em;
            line-height: 1.25;
        }

        .main-subtitle {
            font-size: 13.5px;
            font-weight: 400;
            color: var(--text-muted);
            margin: 0;
        }

        .site-host {
            color: var(--text-heading);
            font-weight: 600;
        }

        .explainer-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
        }

        .explainer-col h2 {
            font-size: 15px;
            font-weight: 700;
            color: var(--text-heading);
            margin: 0 0 6px 0;
            line-height: 1.3;
        }

        .explainer-col p {
            font-size: 13px;
            line-height: 1.6;
            color: var(--text-sub);
            margin: 0;
        }

        /* Center Full-Width Gray Mockup Banner */
        .mockup-section {
            width: 100%;
            background-color: var(--bg-banner);
            border-top: 1px solid var(--border-banner);
            border-bottom: 1px solid var(--border-banner);
            padding: 24px 0;
            box-sizing: border-box;
            display: flex;
            justify-content: center;
            align-items: center;
            flex: 1 1 auto;
            min-height: 0;
        }

        .browser-mockup {
            max-width: 780px;
            width: 100%;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 4px;
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
            overflow: hidden;
            border: 1px solid #d4d4d4;
        }

        .browser-header {
            background: #8c8c8c;
            height: 32px;
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
            opacity: 0.9;
            display: inline-block;
        }

        .browser-address-bar {
            margin-left: 12px;
            background: rgba(255, 255, 255, 0.35);
            height: 16px;
            border-radius: 3px;
            width: 45%;
            max-width: 240px;
        }

        .browser-body {
            height: 175px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
        }

        .block-badge-circle {
            width: 76px;
            height: 76px;
            border-radius: 50%;
            background-color: #bd2426;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 6px 18px rgba(189, 36, 38, 0.25);
        }

        .block-badge-circle svg {
            width: 34px;
            height: 34px;
            stroke: #ffffff;
            stroke-width: 3.5;
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        /* Bottom Section: Technical Details Card & Action Buttons */
        .bottom-section {
            padding-top: 16px;
            padding-bottom: 24px;
            flex: 0 0 auto;
        }

        .tech-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 14px 28px;
            margin-bottom: 16px;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 24px;
            align-items: center;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }

        .tech-item-label {
            font-size: 10.5px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 4px;
        }

        .tech-item-value {
            font-size: 13.5px;
            font-weight: 600;
            color: #0f172a;
        }

        .tech-item-mono {
            font-family: var(--font-mono);
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
        }

        /* Action Buttons Row */
        .action-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 14px;
            flex-wrap: wrap;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-family: var(--font-family);
            font-size: 13px;
            font-weight: 500;
            padding: 8.5px 22px;
            border-radius: 6px;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.15s ease;
            border: 1px solid transparent;
        }

        .btn-primary {
            background-color: #1e293b;
            color: #ffffff;
            box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
        }

        .btn-primary:hover {
            background-color: #0f172a;
        }

        .btn-secondary {
            background-color: #ffffff;
            color: #334155;
            border-color: var(--border-btn);
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        }

        .btn-secondary:hover {
            background-color: #f8fafc;
            border-color: #94a3b8;
            color: #0f172a;
        }

        @media (max-height: 640px) or (max-width: 820px) {
            html, body, .page-container {
                height: auto;
                max-height: none;
                overflow-y: auto;
            }
            .explainer-grid {
                grid-template-columns: 1fr;
                gap: 16px;
            }
            .tech-card {
                grid-template-columns: 1fr 1fr;
                gap: 12px;
            }
        }
    </style>
</head>
<body>
    <div class="page-container">
        <!-- Top Section: Header & Two Explainer Columns -->
        <header class="top-section">
            <div class="content-wrap">
                <div class="main-heading-wrap">
                    <h1 class="main-title">Access Restricted by Security Policy</h1>
                    <p class="main-subtitle">Your connection to <strong class="site-host"><?php echo esc_html($site_host); ?></strong> was intercepted by automated security protection.</p>
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

        <!-- Center Full-Width Gray Mockup Banner -->
        <section class="mockup-section">
            <div class="content-wrap" style="padding: 0;">
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
            </div>
        </section>

        <!-- Bottom Technical Section: Card & Action Buttons -->
        <footer class="bottom-section">
            <div class="content-wrap">
                <div class="tech-card">
                    <div>
                        <div class="tech-item-label">CLIENT IP ADDRESS</div>
                        <div class="tech-item-value tech-item-mono"><?php echo esc_html($client_ip); ?></div>
                    </div>
                    <div>
                        <div class="tech-item-label">INCIDENT REFERENCE ID</div>
                        <div class="tech-item-value tech-item-mono" id="refIdText"><?php echo esc_html($reference_id); ?></div>
                    </div>
                    <div>
                        <div class="tech-item-label">TIMESTAMP (UTC)</div>
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