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
$attack_type  = !empty($result['attack_type']) ? $result['attack_type'] : 'Cross-Site Scripting (XSS)';
$client_ip    = !empty($result['ip']) ? $result['ip'] : ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
$reason       = !empty($result['message']) ? $result['message'] : '';
$reference_id = !empty($result['reference_id']) ? $result['reference_id'] : ('MDSF ' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8)));
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

// Rule details parsing
$rule_name = !empty($result['rule_matched']) ? $result['rule_matched'] : '';
if (empty($rule_name)) {
    if (!empty($result['attack_type']) && $result['attack_type'] !== 'Security Threat') {
        $rule_name = $result['attack_type'];
    } else {
        $rule_name = 'Pre-Flight WAAP: Script Tag & Event Handler Guard';
    }
}
$rule_id = !empty($result['rule_id']) ? $result['rule_id'] : ((abs(crc32($rule_name)) % 10000) + 50000);

// Violation reason text
if (!empty($reason)) {
    $violation_text = $reason;
} else {
    $violation_text = 'Request blocked by rule ID: ' . $rule_id . ' (Ref: ' . $rule_name . ')';
}

$protocol = !empty($_SERVER['SERVER_PROTOCOL']) ? sanitize_text_field($_SERVER['SERVER_PROTOCOL']) : 'HTTP/1.1';
$admin_email = function_exists('get_option') ? (get_option('admin_email') ?: 'security@' . $site_host) : ('security@' . $site_host);
?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
    <title>Attention Required! | MDefender Security Check</title>
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
                gap: 30px;
            }
            .blocked-title {
                font-size: 28px;
            }
            .mockup-section {
                padding: 30px 16px;
            }
            .browser-body {
                height: 210px;
            }
            .block-badge-circle {
                width: 76px;
                height: 76px;
            }
            .block-badge-circle svg {
                width: 36px;
                height: 36px;
            }
        }

        .col-heading {
            font-size: 19px;
            font-weight: 600;
            color: #222222;
            margin: 0 0 12px 0;
            line-height: 1.3;
        }

        .col-desc {
            font-size: 14.5px;
            line-height: 1.65;
            color: var(--text-sub);
            margin: 0;
        }

        .attack-pill {
            margin-top: 14px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 5px 12px;
            background: #fee2e2;
            border: 1px solid #fecaca;
            border-radius: 4px;
            font-size: 12.5px;
            color: #991b1b;
            font-weight: 500;
        }

        .action-tools {
            margin-top: 18px;
            display: flex;
            align-items: center;
            gap: 12px;
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
        }

        /* Footer Section */
        .footer-section {
            margin-top: auto;
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
        <!-- Top Heading -->
        <header class="header-section">
            <div class="content-wrap">
                <h1 class="blocked-title">Sorry, you have been blocked</h1>
                <p class="blocked-subtitle">You are unable to access <span class="blocked-domain"><?php echo esc_html($site_host); ?></span></p>
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