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

// Fast In-Memory GeoIP Resolution (Zero External HTTP Latency)
$country_code_lower = 'bd';
if (!empty($_GET['country_test'])) {
    $country_code_lower = strtolower(substr(trim($_GET['country_test']), 0, 2));
} elseif (!empty($result['country_code'])) {
    $country_code_lower = strtolower(substr(trim($result['country_code']), 0, 2));
} elseif (!empty($_SERVER['HTTP_CF_IPCOUNTRY'])) {
    $country_code_lower = strtolower(substr(trim($_SERVER['HTTP_CF_IPCOUNTRY']), 0, 2));
} elseif (!empty($_SERVER['GEOIP_COUNTRY_CODE'])) {
    $country_code_lower = strtolower(substr(trim($_SERVER['GEOIP_COUNTRY_CODE']), 0, 2));
} elseif (!empty($client_ip) && filter_var($client_ip, FILTER_VALIDATE_IP)) {
    $transient_key = 'waf_fw_geoip_' . md5($client_ip);
    $cached = function_exists('get_transient') ? get_transient($transient_key) : false;
    if ($cached !== false && is_array($cached) && !empty($cached['code'])) {
        $country_code_lower = strtolower(substr(trim($cached['code']), 0, 2));
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
    <title>403 Forbidden &mdash; Access Denied | MDefender-Pro AI</title>
    <style>
        :root {
            --bg-page: #ffffff;
            --bg-banner: #eceff1;
            --text-heading: #0f172a;
            --text-num403: #3f4753;
            --text-sub: #4b5563;
            --text-muted: #64748b;
            --text-dark: #1e293b;
            --color-alert: #dc2626;
            --color-badge-bg: #fee2e2;
            --color-badge-text: #dc2626;
            --color-badge-border: #fecdd3;
            --border-banner: #e2e8f0;
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
            min-height: 100%;
            background-color: var(--bg-page);
            font-family: var(--font-family);
            color: var(--text-dark);
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
            position: relative;
        }

        body {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 40px 0;
            overflow-x: hidden;
        }

        /* Subtle Corner Geometric Dot Pattern (matching screenshot) */
        .top-pattern {
            position: absolute;
            top: 0;
            right: 0;
            width: 240px;
            height: 160px;
            background-image: radial-gradient(#cbd5e1 1.2px, transparent 1.2px);
            background-size: 14px 14px;
            opacity: 0.65;
            pointer-events: none;
            z-index: 0;
        }

        .page-container {
            width: 100%;
            position: relative;
            z-index: 1;
        }

        /* Top 2 Columns ("What happened?" and "What can I do?") */
        .top-columns-wrap {
            max-width: 940px;
            margin: 0 auto 34px auto;
            padding: 0 24px;
        }

        .top-columns-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 56px;
            text-align: left;
        }

        .col-heading {
            font-size: 17px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 10px;
            line-height: 1.3;
        }

        .col-text {
            font-size: 13.5px;
            line-height: 1.6;
            color: var(--text-sub);
        }

        .col-text p + p {
            margin-top: 10px;
        }

        /* Full Width Center Gray Ribbon Banner */
        .banner-ribbon {
            width: 100%;
            background-color: var(--bg-banner);
            border-top: 1px solid var(--border-banner);
            border-bottom: 1px solid var(--border-banner);
            padding: 44px 20px 38px 20px;
            text-align: center;
            margin-bottom: 34px;
        }

        .banner-inner {
            max-width: 940px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        .banner-num-403 {
            font-size: clamp(86px, 11vw, 118px);
            font-weight: 900;
            color: var(--text-num403);
            line-height: 0.95;
            letter-spacing: -3px;
            margin-bottom: 8px;
        }

        .banner-forbidden {
            font-size: clamp(28px, 4vw, 36px);
            font-weight: 800;
            color: #1e293b;
            line-height: 1.15;
            letter-spacing: -0.5px;
        }

        /* Curved Accent Underline Under Forbidden */
        .curved-underline {
            display: block;
            margin: 5px auto 10px auto;
            width: 145px;
            height: 9px;
        }

        .banner-denied {
            font-size: 23px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 6px;
            letter-spacing: -0.3px;
        }

        .banner-restricted {
            font-size: 14.5px;
            font-weight: 600;
            color: var(--color-alert);
            letter-spacing: 0.1px;
        }

        /* Technical Details Section */
        .tech-section-wrap {
            max-width: 940px;
            margin: 0 auto 30px auto;
            padding: 0 24px;
        }

        /* Hatched Diagonal Divider Lines */
        .hatched-divider {
            width: 100%;
            height: 6px;
            background: repeating-linear-gradient(45deg, #cbd5e1, #cbd5e1 2px, transparent 2px, transparent 6px);
            opacity: 0.7;
        }

        .hatched-top {
            margin-bottom: 22px;
        }

        .hatched-bottom {
            margin-top: 22px;
            margin-bottom: 26px;
        }

        /* 3 Columns x 2 Rows Technical Grid */
        .tech-grid {
            display: grid;
            grid-template-columns: 1.1fr 1fr 1.1fr;
            gap: 22px 36px;
            text-align: left;
        }

        .tech-item-label {
            font-size: 11px;
            font-weight: 700;
            color: #111827;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }

        .tech-item-value {
            font-size: 13px;
            color: #374151;
            line-height: 1.45;
            word-break: break-word;
        }

        .tech-item-value-mono {
            font-family: var(--font-mono);
            font-size: 13.5px;
            font-weight: 700;
            color: #0f172a;
            letter-spacing: 0.3px;
        }

        .country-pill {
            display: inline-block;
            background: #e0e7ff;
            color: #4338ca;
            font-size: 10.5px;
            font-weight: 700;
            padding: 1px 6px;
            border-radius: 4px;
            margin-left: 6px;
            vertical-align: middle;
            text-transform: lowercase;
            letter-spacing: 0.2px;
        }

        /* Classification Pill Badge */
        .attack-badge {
            display: inline-block;
            background-color: var(--color-badge-bg);
            color: var(--color-badge-text);
            border: 1px solid var(--color-badge-border);
            font-size: 11.5px;
            font-weight: 600;
            padding: 2.5px 12px;
            border-radius: 9999px;
            margin-top: 2px;
            letter-spacing: 0.2px;
        }

        /* Action Buttons Row */
        .actions-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            flex-wrap: wrap;
            margin-bottom: 22px;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-family: var(--font-family);
            font-size: 12.5px;
            font-weight: 600;
            padding: 9px 18px;
            border-radius: 7px;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .btn-primary {
            background-color: #0f172a;
            color: #ffffff;
            border: 1px solid #0f172a;
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
        }

        .btn-primary:hover {
            background-color: #1e293b;
            border-color: #1e293b;
        }

        .btn-secondary {
            background-color: #ffffff;
            color: #334155;
            border: 1px solid var(--border-btn);
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        }

        .btn-secondary:hover {
            background-color: #f8fafc;
            border-color: #94a3b8;
            color: #0f172a;
        }

        /* Footer */
        .footer-note {
            font-size: 11.5px;
            color: var(--text-muted);
            text-align: center;
            line-height: 1.5;
            padding: 0 20px;
        }

        @media (max-width: 768px) {
            .top-columns-grid {
                grid-template-columns: 1fr;
                gap: 24px;
            }
            .tech-grid {
                grid-template-columns: 1fr;
                gap: 18px;
            }
            .banner-ribbon {
                padding: 34px 16px 28px 16px;
            }
            .banner-num-403 {
                font-size: 78px;
                letter-spacing: -2px;
            }
            .banner-forbidden {
                font-size: 28px;
            }
        }
    </style>
</head>
<body>
    <!-- Top Corner Subtle Geometric Pattern -->
    <div class="top-pattern" aria-hidden="true"></div>

    <div class="page-container">
        <!-- 2 Columns: What happened? & What can I do? -->
        <div class="top-columns-wrap">
            <div class="top-columns-grid">
                <div class="top-col">
                    <h3 class="col-heading">What happened?</h3>
                    <div class="col-text">
                        <p>This website is using a security service (MDefender-Pro AI) protect itself from online attacks. This action you to perform has been blocked by corporate WAF.</p>
                    </div>
                </div>
                <div class="top-col">
                    <h3 class="col-heading">What can I do?</h3>
                    <div class="col-text">
                        <p>If you are a visitor, please contact the site owner or support operations with the details below.</p>
                        <p>If you believe this is a valid corporate action, please share the Reference ID below.</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Full-Width Center Ribbon Banner -->
        <div class="banner-ribbon">
            <div class="banner-inner">
                <div class="banner-num-403">403</div>
                <div class="banner-forbidden">Forbidden</div>
                <svg class="curved-underline" viewBox="0 0 130 8" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M2 3C40 8 90 8 128 3" stroke="#e05252" stroke-width="2.5" stroke-linecap="round"/>
                </svg>
                <div class="banner-denied">Access Denied</div>
                <div class="banner-restricted">Access to <?php echo esc_html($site_host); ?> is restricted</div>
            </div>
        </div>

        <!-- Technical Details Grid -->
        <div class="tech-section-wrap">
            <!-- Hatched Divider (Top) -->
            <div class="hatched-divider hatched-top" aria-hidden="true"></div>

            <div class="tech-grid">
                <!-- Column 1, Row 1: Your IP -->
                <div>
                    <div class="tech-item-label">YOUR IP</div>
                    <div class="tech-item-value">
                        <span style="font-family: var(--font-mono); font-size: 13px; font-weight: 500; color: #374151;"><?php echo esc_html($client_ip); ?></span>
                        <span class="country-pill"><?php echo strtolower(esc_html($country_code_lower)); ?></span>
                    </div>
                </div>

                <!-- Column 2, Row 1: Reference ID -->
                <div>
                    <div class="tech-item-label">REFERENCE ID</div>
                    <div class="tech-item-value tech-item-value-mono" id="refIdText"><?php echo esc_html($reference_id); ?></div>
                </div>

                <!-- Column 3, Row 1: Timestamp -->
                <div>
                    <div class="tech-item-label">TIMESTAMP</div>
                    <div class="tech-item-value"><?php echo esc_html($utc_timestamp); ?> (ref: <?php echo esc_html($unix_ref); ?>)</div>
                </div>

                <!-- Column 1, Row 2: Violation Reason -->
                <div>
                    <div class="tech-item-label">VIOLATION REASON</div>
                    <div class="tech-item-value"><?php echo esc_html($violation_text); ?></div>
                </div>

                <!-- Column 2, Row 2: Attack Classification -->
                <div>
                    <div class="tech-item-label">ATTACK CLASSIFICATION</div>
                    <div class="tech-item-value">
                        <span class="attack-badge"><?php echo esc_html($attack_type); ?></span>
                    </div>
                </div>

                <!-- Column 3, Row 2: Protocol Details -->
                <div>
                    <div class="tech-item-label">PROTOCOL DETAILS</div>
                    <div class="tech-item-value">
                        <?php echo esc_html($protocol); ?> (WAF_VER: 4.3.0)<br>
                        <?php echo esc_html($site_host); ?>
                    </div>
                </div>
            </div>

            <!-- Hatched Divider (Bottom) -->
            <div class="hatched-divider hatched-bottom" aria-hidden="true"></div>

            <!-- Buttons -->
            <div class="actions-row">
                <a href="mailto:<?php echo esc_attr($admin_email); ?>?subject=WAF Block Reference: <?php echo esc_attr($reference_id); ?>&body=Security Support,%0D%0A%0D%0AMy request was restricted by MDefender-Pro AI Firewall.%0D%0A%0D%0ADetails:%0D%0A- Reference ID: <?php echo esc_attr($reference_id); ?>%0D%0A- Client IP: <?php echo esc_attr($client_ip); ?>%0D%0A- Host: <?php echo esc_attr($site_host); ?>" 
                   class="btn btn-primary">
                    Contact Security Operations
                </a>
                <a href="/" class="btn btn-secondary">
                    Return to Homepage
                </a>
                <button type="button" class="btn btn-secondary" id="copyBtn" onclick="copyReferenceId()">
                    Copy Reference ID
                </button>
            </div>

            <!-- Footer -->
            <div class="footer-note">
                Performance &amp; security by Mdefender Pro AI Firewall. All critical system events are logged and audited.
            </div>
        </div>
    </div>

    <script>
        const refId = "<?php echo esc_js($reference_id); ?>";
        function copyReferenceId() {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(refId).then(() => {
                    const btn = document.getElementById('copyBtn');
                    if (btn) {
                        const original = btn.innerText;
                        btn.innerText = 'Copied!';
                        btn.style.borderColor = '#10b981';
                        btn.style.color = '#10b981';
                        setTimeout(() => {
                            btn.innerText = original;
                            btn.style.borderColor = '';
                            btn.style.color = '';
                        }, 2000);
                    }
                }).catch(() => {
                    alert('Reference ID: ' + refId);
                });
            } else {
                alert('Reference ID: ' + refId);
            }
        }
    </script>
</body>
</html>
