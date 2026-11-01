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
$attack_type  = !empty($result['attack_type']) ? $result['attack_type'] : 'Security Threat';
$client_ip    = !empty($result['ip']) ? $result['ip'] : ($_SERVER['REMOTE_ADDR'] ?? 'Unknown');
$reason       = !empty($result['message']) ? $result['message'] : 'Request blocked by security firewall rule';
$reference_id = !empty($result['reference_id']) ? $result['reference_id'] : ('MDF-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8)));
$timestamp    = !empty($result['timestamp']) ? $result['timestamp'] : (function_exists('current_time') ? current_time('mysql') : gmdate('Y-m-d H:i:s'));
$site_host    = $_SERVER['HTTP_HOST'] ?? 'localhost';
$site_name    = function_exists('get_bloginfo') ? (get_bloginfo('name') ?: 'MAHABUB') : 'MAHABUB';

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
$geoip_info = '';

if (!empty($_GET['country_test'])) {
    $country_code_lower = strtolower(substr(trim($_GET['country_test']), 0, 2));
} elseif (!empty($result['country_code'])) {
    $country_code_lower = strtolower(substr(trim($result['country_code']), 0, 2));
} elseif (!empty($_SERVER['HTTP_CF_IPCOUNTRY'])) {
    $country_code_lower = strtolower(substr(trim($_SERVER['HTTP_CF_IPCOUNTRY']), 0, 2));
} elseif (!empty($_SERVER['GEOIP_COUNTRY_CODE'])) {
    $country_code_lower = strtolower(substr(trim($_SERVER['GEOIP_COUNTRY_CODE']), 0, 2));
} elseif (!empty($client_ip) && filter_var($client_ip, FILTER_VALIDATE_IP)) {
    // Only check local cached transient without blocking outbound HTTP
    $transient_key = 'waf_fw_geoip_' . md5($client_ip);
    $cached = function_exists('get_transient') ? get_transient($transient_key) : false;
    if ($cached !== false && is_array($cached) && !empty($cached['code'])) {
        $country_code_lower = strtolower(substr(trim($cached['code']), 0, 2));
    }
}

$geoip_info = " (GeoIP: " . strtoupper($country_code_lower) . ")";

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
    $rule_name = !empty($result['attack_type']) && $result['attack_type'] !== 'Security Threat' ? $result['attack_type'] : 'System Command Injection';
}
$rule_id = (abs(crc32($rule_name)) % 10000) + 90000;

// Server Host
$server_host = !empty($_SERVER['HTTP_HOST']) ? sanitize_text_field($_SERVER['HTTP_HOST']) : (!empty($_SERVER['SERVER_NAME']) ? sanitize_text_field($_SERVER['SERVER_NAME']) : (function_exists('gethostname') ? gethostname() : 'localhost'));
$admin_email = function_exists('get_option') ? (get_option('admin_email') ?: 'security@' . $site_host) : ('security@' . $site_host);
?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
<?php if ($is_country_block): ?>
    <title>403 Forbidden &mdash; Geographic Restriction | MDefender-Pro AI</title>
<?php elseif ($is_ip_blacklist): ?>
    <title>403 Forbidden &mdash; IP Blacklisted | MDefender-Pro AI</title>
<?php else: ?>
    <title>403 Forbidden &mdash; Access Denied | MDefender-Pro AI</title>
<?php endif; ?>
    <style>
        :root {
            --bg-color: #ffffff;
            --text-main: #1e293b;
            --text-heading: #0f172a;
            --text-sub: #475569;
            --text-muted: #64748b;
            --border-light: #e2e8f0;
            --border-dark: #cbd5e1;
            --orange-alert: #ea580c;
            /* High-Performance Zero-FOUT Native System Font Stack (Instant 0ms Paint, Zero Layout Shift) */
            --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", "Courier New", monospace;
        }

        *, *::before, *::after {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html {
            font-size: 16px;
            -webkit-text-size-adjust: 100%;
            text-rendering: optimizeLegibility;
        }

        body {
            font-family: var(--font-family);
            background-color: var(--bg-color);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 48px 24px;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        /* Hardware-Accelerated Zero-Jitter Container */
        .block-wrapper {
            width: 100%;
            max-width: 960px;
            margin: 0 auto;
            text-align: center;
            contain: layout style;
        }

        /* Header / Brand Logo */
        .brand-header {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            margin-bottom: 30px;
            text-align: left;
        }

        .brand-logo-wrap {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            width: 54px;
            height: 54px;
            background: #0B2522;
            border-radius: 12px;
            box-shadow: 0 4px 14px rgba(11, 37, 34, 0.15);
        }

        .brand-shield-svg {
            width: 28px;
            height: 28px;
            fill: none;
            stroke: #E8792F;
            stroke-width: 2.2;
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        .brand-info {
            display: flex;
            flex-direction: column;
        }

        .brand-title {
            font-size: 17px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: 0.8px;
            line-height: 1.2;
            text-transform: uppercase;
        }

        .brand-subtitle {
            font-size: 10.5px;
            font-weight: 700;
            color: #64748b;
            letter-spacing: 1.8px;
            text-transform: uppercase;
            margin-top: 2px;
        }

        .brand-owner {
            font-size: 13.5px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: 1.2px;
            text-transform: uppercase;
            margin-top: 2px;
        }

        /* Main Headlines - Stabilized Metrics */
        .headline-403 {
            font-size: 38px;
            font-weight: 800;
            color: var(--text-heading);
            letter-spacing: -0.5px;
            line-height: 1.15;
            margin-bottom: 6px;
        }

        .headline-denied {
            font-size: 24px;
            font-weight: 800;
            color: var(--text-heading);
            margin-bottom: 8px;
            line-height: 1.2;
        }

        .headline-restricted {
            font-size: 15.5px;
            font-weight: 600;
            color: var(--orange-alert);
            margin-bottom: 38px;
            line-height: 1.35;
        }

        /* Two Columns Explanation */
        .info-columns {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 44px;
            text-align: left;
            margin-bottom: 38px;
            max-width: 900px;
            margin-left: auto;
            margin-right: auto;
        }

        .info-box-title {
            font-size: 19px;
            font-weight: 800;
            color: var(--text-heading);
            margin-bottom: 10px;
            line-height: 1.3;
        }

        .info-box-text {
            font-size: 14.5px;
            line-height: 1.6;
            color: var(--text-sub);
        }

        .info-box-text p + p {
            margin-top: 10px;
        }

        /* Technical Details Grid */
        .tech-details-container {
            border-top: 1px solid var(--border-light);
            border-bottom: 1px solid var(--border-light);
            padding: 26px 0;
            margin-bottom: 32px;
            max-width: 900px;
            margin-left: auto;
            margin-right: auto;
        }

        .tech-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 22px 30px;
            text-align: left;
        }

        .tech-item-label {
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
        }

        .tech-item-value {
            font-size: 14px;
            color: #334155;
            line-height: 1.45;
            word-break: break-word;
        }

        .tech-item-value-bold {
            font-size: 14.5px;
            font-weight: 700;
            color: #0f172a;
            font-family: var(--font-mono);
            letter-spacing: 0.5px;
        }

        .ip-flag-wrap {
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .country-pill {
            display: inline-block;
            font-size: 11px;
            font-weight: 800;
            background: #F1F5F9;
            color: #0F172A;
            border: 1px solid #CBD5E1;
            padding: 1px 6px;
            border-radius: 4px;
            line-height: 1.3;
            letter-spacing: 0.5px;
        }

        /* Attack Classification Badge */
        .attack-badge {
            display: inline-block;
            background-color: #ffedd5;
            color: #9a3412;
            border: 1px solid #fed7aa;
            font-size: 11.5px;
            font-weight: 700;
            padding: 3px 10px;
            border-radius: 5px;
            margin-top: 2px;
        }

        /* Actions / Buttons */
        .actions-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 24px;
            flex-wrap: wrap;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-family: var(--font-family);
            font-size: 12.5px;
            font-weight: 700;
            padding: 9px 18px;
            border-radius: 6px;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.15s ease;
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
        }

        .btn-primary {
            background-color: #0f172a;
            color: #ffffff;
            border: 1px solid #0f172a;
        }

        .btn-primary:hover {
            background-color: #1e293b;
            border-color: #1e293b;
        }

        .btn-secondary {
            background-color: #ffffff;
            color: #334155;
            border: 1px solid var(--border-dark);
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
            line-height: 1.5;
        }

        @media (max-width: 720px) {
            .info-columns {
                grid-template-columns: 1fr;
                gap: 20px;
            }
            .tech-grid {
                grid-template-columns: 1fr;
                gap: 16px;
            }
            .brand-header {
                flex-direction: column;
                text-align: center;
                gap: 10px;
            }
            .brand-info {
                align-items: center;
            }
        }
    </style>
</head>
<body>
    <div class="block-wrapper">
        <!-- Top Logo & Brand Header -->
        <div class="brand-header">
            <div class="brand-logo-wrap" title="MDefender Pro Enterprise Firewall">
                <svg class="brand-shield-svg" viewBox="0 0 24 24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="M9 12l2 2 4-4"/>
                </svg>
            </div>
            <div class="brand-info">
                <div class="brand-title">MDEFENDER-PRO AI</div>
                <div class="brand-subtitle">A.S.A.P. SECURITY FIREWALL</div>
                <div class="brand-owner"><?php echo esc_html(strtoupper($site_name)); ?></div>
            </div>
        </div>

        <!-- Headline -->
        <h1 class="headline-403">403 Forbidden</h1>
        <?php if ($is_country_block): ?>
            <h2 class="headline-denied" style="color: #0369a1;">Access Denied &mdash; Geographic Restriction</h2>
            <div class="headline-restricted">Access to <?php echo esc_html($server_host); ?> is restricted from your geographic location</div>
        <?php elseif ($is_ip_blacklist): ?>
            <h2 class="headline-denied" style="color: #ea580c;">Access Denied &mdash; IP Blacklisted</h2>
            <div class="headline-restricted">Access to <?php echo esc_html($server_host); ?> is restricted for IP <?php echo esc_html($client_ip); ?></div>
        <?php else: ?>
            <h2 class="headline-denied">Access Denied</h2>
            <div class="headline-restricted">Access to <?php echo esc_html($server_host); ?> is restricted</div>
        <?php endif; ?>

        <!-- 2 Columns: What happened? & What can I do? -->
        <div class="info-columns">
            <div class="info-box">
                <div class="info-box-title">What happened?</div>
                <div class="info-box-text">
                    <?php if ($is_country_block): ?>
                        <p>Access to this website from your geographic region (<strong><?php echo strtoupper(esc_html($country_code_lower)); ?></strong>) has been restricted by the site administrator's security policy.</p>
                        <p>Your connection is not identified as an attack, but inbound traffic from this country or region is not permitted.</p>
                    <?php elseif ($is_ip_blacklist): ?>
                        <p>Your IP address (<strong><?php echo esc_html($client_ip); ?></strong>) has been placed on the access restriction blacklist by the security administrator or automated defense rules.</p>
                        <p>Requests originating from this IP address are denied access to protected resources.</p>
                    <?php else: ?>
                        <p>This website is using a security service (MDefender-Pro AI) to protect itself from online attacks. The action you tried to perform has been blocked by corporate WAF.</p>
                    <?php endif; ?>
                </div>
            </div>
            <div class="info-box">
                <div class="info-box-title">What can I do?</div>
                <div class="info-box-text">
                    <?php if ($is_country_block): ?>
                        <p>If you are an authorized visitor, customer, or partner traveling abroad, please contact the site administrator or support operations with your Reference ID to request access.</p>
                        <p>If you are using a VPN or proxy from an unintended region, try connecting directly or via an authorized network.</p>
                    <?php elseif ($is_ip_blacklist): ?>
                        <p>If you believe this restriction is an error, please share your Reference ID and IP address with the site administrator for review.</p>
                    <?php else: ?>
                        <p>If you are a visitor, please contact the site owner or support operations with the details below.</p>
                        <p>If you believe this is a valid corporate action, please share the Reference ID below.</p>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <!-- Technical Details (3 Columns x 2 Rows) -->
        <div class="tech-details-container">
            <div class="tech-grid">
                <!-- Column 1, Row 1 -->
                <div>
                    <div class="tech-item-label">Your IP</div>
                    <div class="tech-item-value">
                        <span class="ip-flag-wrap">
                            <span><?php echo esc_html($client_ip); ?></span>
                            <span class="country-pill"><?php echo strtoupper(esc_html($country_code_lower)); ?></span>
                        </span>
                    </div>
                </div>

                <!-- Column 2, Row 1 -->
                <div>
                    <div class="tech-item-label">Reference ID</div>
                    <div class="tech-item-value-bold" id="refIdText"><?php echo esc_html($reference_id); ?></div>
                </div>

                <!-- Column 3, Row 1 -->
                <div>
                    <div class="tech-item-label">Timestamp</div>
                    <div class="tech-item-value"><?php echo esc_html($utc_timestamp); ?> (Ref: <?php echo esc_html($unix_ref); ?>)</div>
                </div>

                <!-- Column 1, Row 2 -->
                <div>
                    <div class="tech-item-label">Violation Reason</div>
                    <div class="tech-item-value">
                        <?php if ($is_country_block): ?>
                            Geographic Access Policy (Region: <?php echo strtoupper(esc_html($country_code_lower)); ?> restricted)
                        <?php elseif ($is_ip_blacklist): ?>
                            IP Blacklist Policy (IP: <?php echo esc_html($client_ip); ?> blacklisted)
                        <?php else: ?>
                            Request blocked by rule ID: <?php echo esc_html($rule_id); ?> (Ref: <?php echo esc_html($rule_name); ?>)
                        <?php endif; ?>
                    </div>
                </div>

                <!-- Column 2, Row 2 -->
                <div>
                    <div class="tech-item-label"><?php echo ($is_country_block || $is_ip_blacklist) ? 'Policy Classification' : 'Attack Classification'; ?></div>
                    <div class="tech-item-value">
                        <?php if ($is_country_block): ?>
                            <span class="attack-badge" style="background: #e0f2fe; color: #0369a1; border-color: #bae6fd;">🌍 GeoIP Country Restriction</span>
                        <?php elseif ($is_ip_blacklist): ?>
                            <span class="attack-badge" style="background: #fef3c7; color: #b45309; border-color: #fde68a;">🚫 IP Blacklist Policy</span>
                        <?php else: ?>
                            <span class="attack-badge"><?php echo esc_html($attack_type); ?></span>
                        <?php endif; ?>
                    </div>
                </div>

                <!-- Column 3, Row 2 -->
                <div>
                    <div class="tech-item-label">Protocol Details</div>
                    <div class="tech-item-value">
                        <?php echo esc_html($_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.1'); ?> (WAF_VER: 4.3.0)<br>
                        <?php echo esc_html($server_host); ?>
                    </div>
                </div>
            </div>
        </div>

        <!-- Buttons -->
        <div class="actions-row">
            <a href="mailto:<?php echo esc_attr($admin_email); ?>?subject=WAF Block Reference: <?php echo esc_attr($reference_id); ?>&body=Security Support,%0D%0A%0D%0AMy request was restricted by MDefender-Pro AI Firewall.%0D%0A%0D%0ADetails:%0D%0A- Reference ID: <?php echo esc_attr($reference_id); ?>%0D%0A- Client IP: <?php echo esc_attr($client_ip); ?>%0D%0A- Host: <?php echo esc_attr($server_host); ?>" 
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
            Performance &amp; security by MDefender-Pro AI Firewall. All critical system events are logged and audited.
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
                        btn.style.borderColor = '#2A8B68';
                        btn.style.color = '#2A8B68';
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