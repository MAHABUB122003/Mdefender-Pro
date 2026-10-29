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

// Dynamic variables extracted from WAF analysis context
$attack_type  = !empty($result['attack_type']) ? $result['attack_type'] : 'Security Threat';
$client_ip    = !empty($result['ip']) ? $result['ip'] : ($_SERVER['REMOTE_ADDR'] ?? 'Unknown');
$reason       = !empty($result['message']) ? $result['message'] : 'Request blocked by security firewall rule';
$reference_id = !empty($result['reference_id']) ? $result['reference_id'] : ('MDF-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8)));
$timestamp    = !empty($result['timestamp']) ? $result['timestamp'] : (function_exists('current_time') ? current_time('mysql') : gmdate('Y-m-d H:i:s'));
$site_host    = $_SERVER['HTTP_HOST'] ?? 'localhost';
$site_name    = function_exists('get_bloginfo') ? (get_bloginfo('name') ?: 'MAHABUB') : 'MAHABUB';

// GeoIP Resolution (with fallback matching design)
$geoip_info = '';
$country_code_lower = 'bd';

if (!empty($client_ip) && $client_ip !== '127.0.0.1' && $client_ip !== '::1' && filter_var($client_ip, FILTER_VALIDATE_IP)) {
    $transient_key = 'waf_fw_geoip_' . md5($client_ip);
    $cached = function_exists('get_transient') ? get_transient($transient_key) : false;
    if ($cached !== false && is_array($cached)) {
        $geoip_info = $cached['info'] ?? '';
        $country_code_lower = $cached['code'] ?? 'bd';
    } elseif (function_exists('wp_remote_get') && function_exists('is_wp_error') && function_exists('wp_remote_retrieve_body')) {
        $response = wp_remote_get("http://ip-api.com/json/{$client_ip}?fields=status,country,city,countryCode", ['timeout' => 3]);
        if (!is_wp_error($response)) {
            $data = json_decode(wp_remote_retrieve_body($response), true);
            if (!empty($data['status']) && $data['status'] === 'success') {
                $city = !empty($data['city']) ? $data['city'] : '';
                $country = !empty($data['country']) ? $data['country'] : '';
                $country_code_lower = !empty($data['countryCode']) ? strtolower($data['countryCode']) : 'bd';
                $geoip_info = $country_code_lower ? " (GeoIP: " . strtoupper($country_code_lower) . ")" : '';
                if (function_exists('set_transient')) {
                    $hour = defined('HOUR_IN_SECONDS') ? HOUR_IN_SECONDS : 3600;
                    set_transient($transient_key, ['info' => $geoip_info, 'code' => $country_code_lower], 12 * $hour);
                }
            }
        }
    }
}

if (empty($geoip_info)) {
    $geoip_info = " (GeoIP: " . strtoupper($country_code_lower) . ")";
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
    <title>403 Forbidden &mdash; Access Denied | MDefender-Pro AI</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
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
            --font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            --font-mono: 'JetBrains Mono', Consolas, monospace;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: var(--font-family);
            background-color: var(--bg-color);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 50px 24px;
            -webkit-font-smoothing: antialiased;
        }

        .block-wrapper {
            width: 100%;
            max-width: 960px;
            margin: 0 auto;
            text-align: center;
        }

        /* Header / Brand Logo */
        .brand-header {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 18px;
            margin-bottom: 32px;
            text-align: left;
        }

        .brand-logo-wrap {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .brand-logo-img {
            width: 58px;
            height: 58px;
            border-radius: 14px;
            object-fit: contain;
            box-shadow: 0 6px 18px rgba(11, 37, 34, 0.16);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .brand-logo-img:hover {
            transform: scale(1.06);
            box-shadow: 0 8px 24px rgba(232, 121, 47, 0.28);
        }

        .brand-info {
            display: flex;
            flex-direction: column;
        }

        .brand-title {
            font-size: 18px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: 0.8px;
            line-height: 1.2;
            text-transform: uppercase;
        }

        .brand-subtitle {
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-top: 3px;
        }

        .brand-owner {
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            margin-top: 3px;
        }

        /* Main Headlines */
        .headline-403 {
            font-size: 40px;
            font-weight: 900;
            color: var(--text-heading);
            letter-spacing: -0.6px;
            line-height: 1.15;
            margin-bottom: 6px;
        }

        .headline-denied {
            font-size: 25px;
            font-weight: 800;
            color: var(--text-heading);
            margin-bottom: 10px;
        }

        .headline-restricted {
            font-size: 16px;
            font-weight: 600;
            color: var(--orange-alert);
            margin-bottom: 42px;
        }

        /* Two Columns Explanation */
        .info-columns {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 48px;
            text-align: left;
            margin-bottom: 42px;
            max-width: 900px;
            margin-left: auto;
            margin-right: auto;
        }

        .info-box-title {
            font-size: 20px;
            font-weight: 800;
            color: var(--text-heading);
            margin-bottom: 12px;
        }

        .info-box-text {
            font-size: 15px;
            line-height: 1.65;
            color: var(--text-sub);
        }

        .info-box-text p + p {
            margin-top: 12px;
        }

        /* Technical Details Grid */
        .tech-details-container {
            border-top: 1px solid var(--border-light);
            border-bottom: 1px solid var(--border-light);
            padding: 30px 0;
            margin-bottom: 34px;
            max-width: 900px;
            margin-left: auto;
            margin-right: auto;
        }

        .tech-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 24px 32px;
            text-align: left;
        }

        .tech-item-label {
            font-size: 13.5px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 6px;
        }

        .tech-item-value {
            font-size: 14.5px;
            color: #334155;
            line-height: 1.5;
            word-break: break-word;
        }

        .tech-item-value-bold {
            font-size: 15px;
            font-weight: 700;
            color: #0f172a;
            font-family: var(--font-mono);
        }

        .ip-flag-wrap {
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .flag-icon {
            width: 18px;
            height: 13px;
            border-radius: 2px;
            border: 1px solid rgba(0, 0, 0, 0.08);
            vertical-align: middle;
        }

        /* Attack Classification Badge */
        .attack-badge {
            display: inline-block;
            background-color: #ffedd5;
            color: #9a3412;
            border: 1px solid #fed7aa;
            font-size: 11.5px;
            font-weight: 600;
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
            font-size: 12px;
            font-weight: 600;
            padding: 8px 16px;
            border-radius: 6px;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.15s ease;
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
            font-size: 11px;
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
            <div class="brand-logo-wrap">
                <?php
                $plugin_logo_url = defined('WAF_FW_PLUGIN_URL') ? esc_url(WAF_FW_PLUGIN_URL . 'assets/images/mdefender-logo.png') : '';
                ?>
                <img class="brand-logo-img" src="<?php echo $plugin_logo_url ?: 'data:image/png;base64,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'; ?>" alt="MDefender Pro Logo">
            </div>
            <div class="brand-info">
                <div class="brand-title">MDEFENDER-PRO AI</div>
                <div class="brand-subtitle">A.S.A.P. SECURITY FIREWALL</div>
                <div class="brand-owner"><?php echo esc_html(strtoupper($site_name)); ?></div>
            </div>
        </div>

        <!-- Headline -->
        <h1 class="headline-403">403 Forbidden</h1>
        <h2 class="headline-denied">Access Denied</h2>
        <div class="headline-restricted">Access to <?php echo esc_html($server_host); ?> is restricted</div>

        <!-- 2 Columns: What happened? & What can I do? -->
        <div class="info-columns">
            <div class="info-box">
                <div class="info-box-title">What happened?</div>
                <div class="info-box-text">
                    <p>This website is using a security service (MDefender-Pro AI) to protect itself from online attacks. The action you tried to perform has been blocked by corporate WAF.</p>
                </div>
            </div>
            <div class="info-box">
                <div class="info-box-title">What can I do?</div>
                <div class="info-box-text">
                    <p>If you are a visitor, please contact the site owner or support operations with the details below.</p>
                    <p>If you believe this is a valid corporate action, please share the Reference ID below.</p>
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
                            <span><?php echo esc_html($client_ip); ?><?php echo esc_html($geoip_info); ?></span>
                            <?php if (!empty($country_code_lower)): ?>
                                <img src="https://flagcdn.com/w40/<?php echo esc_attr($country_code_lower); ?>.png" 
                                     srcset="https://flagcdn.com/w80/<?php echo esc_attr($country_code_lower); ?>.png 2x" 
                                     alt="<?php echo esc_attr(strtoupper($country_code_lower)); ?>" 
                                     class="flag-icon">
                            <?php endif; ?>
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
                    <div class="tech-item-value">Request blocked by rule ID: <?php echo esc_html($rule_id); ?> (Ref: <?php echo esc_html($rule_name); ?>)</div>
                </div>

                <!-- Column 2, Row 2 -->
                <div>
                    <div class="tech-item-label">Attack Classification</div>
                    <div class="tech-item-value">
                        <span class="attack-badge"><?php echo esc_html($attack_type); ?></span>
                    </div>
                </div>

                <!-- Column 3, Row 2 -->
                <div>
                    <div class="tech-item-label">Protocol Details</div>
                    <div class="tech-item-value">
                        <?php echo esc_html($_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.1'); ?> (WAF_VER: 4.1.0)<br>
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
            Performance & security by MDefender-Pro AI Firewall. All critical system events are logged and audited.
        </div>
    </div>

    <script>
        const refId = "<?php echo esc_js($reference_id); ?>";
        function copyReferenceId() {
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
        }
    </script>
</body>
</html>
