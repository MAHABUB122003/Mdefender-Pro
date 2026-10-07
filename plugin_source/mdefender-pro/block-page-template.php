<?php
defined('ABSPATH') || exit;

// Dynamic variables extracted from WAF analysis context
$attack_type  = !empty($result['attack_type']) ? $result['attack_type'] : 'Security Threat';
$client_ip    = !empty($result['ip']) ? $result['ip'] : ($_SERVER['REMOTE_ADDR'] ?? 'Unknown');
$reason       = !empty($result['message']) ? $result['message'] : 'Request blocked by security firewall rule';
$reference_id = !empty($result['reference_id']) ? $result['reference_id'] : ('MDF-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8)));
$timestamp    = !empty($result['timestamp']) ? $result['timestamp'] : current_time('mysql');
$site_name    = get_bloginfo('name') ?: 'MAHABUB';
$site_host    = $_SERVER['HTTP_HOST'] ?? 'localhost';

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
$admin_email = get_option('admin_email') ?: 'security@' . $site_host;
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
            padding: 40px 20px;
            -webkit-font-smoothing: antialiased;
        }

        .block-wrapper {
            width: 100%;
            max-width: 900px;
            margin: 0 auto;
            text-align: center;
        }

        /* Header / Brand Logo */
        .brand-header {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            margin-bottom: 28px;
            text-align: left;
        }

        .brand-logo-wrap {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .brand-logo-svg {
            width: 58px;
            height: 42px;
            filter: drop-shadow(0 4px 10px rgba(234, 88, 12, 0.22));
            transition: transform 0.2s ease;
        }

        .brand-logo-svg:hover {
            transform: scale(1.05);
        }

        .brand-info {
            display: flex;
            flex-direction: column;
        }

        .brand-title {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: 0.5px;
            line-height: 1.2;
            text-transform: uppercase;
        }

        .brand-subtitle {
            font-size: 9.5px;
            font-weight: 700;
            color: #64748b;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            margin-top: 2px;
        }

        .brand-owner {
            font-size: 12px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-top: 2px;
        }

        /* Main Headlines */
        .headline-403 {
            font-size: 34px;
            font-weight: 800;
            color: var(--text-heading);
            letter-spacing: -0.5px;
            line-height: 1.15;
            margin-bottom: 4px;
        }

        .headline-denied {
            font-size: 22px;
            font-weight: 700;
            color: var(--text-heading);
            margin-bottom: 8px;
        }

        .headline-restricted {
            font-size: 14.5px;
            font-weight: 600;
            color: var(--orange-alert);
            margin-bottom: 36px;
        }

        /* Two Columns Explanation */
        .info-columns {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            text-align: left;
            margin-bottom: 36px;
            max-width: 820px;
            margin-left: auto;
            margin-right: auto;
        }

        .info-box-title {
            font-size: 18px;
            font-weight: 700;
            color: var(--text-heading);
            margin-bottom: 10px;
        }

        .info-box-text {
            font-size: 13.5px;
            line-height: 1.55;
            color: var(--text-sub);
        }

        .info-box-text p + p {
            margin-top: 10px;
        }

        /* Technical Details Grid */
        .tech-details-container {
            border-top: 1px solid var(--border-light);
            border-bottom: 1px solid var(--border-light);
            padding: 24px 0;
            margin-bottom: 28px;
            max-width: 820px;
            margin-left: auto;
            margin-right: auto;
        }

        .tech-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px 24px;
            text-align: left;
        }

        .tech-item-label {
            font-size: 12px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 4px;
        }

        .tech-item-value {
            font-size: 12.5px;
            color: #334155;
            line-height: 1.4;
            word-break: break-word;
        }

        .tech-item-value-bold {
            font-size: 13px;
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
                <svg class="brand-logo-svg" viewBox="0 0 80 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="cloudOrangeGrad" x1="10%" y1="5%" x2="90%" y2="95%">
                            <stop offset="0%" stop-color="#ff9d42" />
                            <stop offset="35%" stop-color="#f97316" />
                            <stop offset="75%" stop-color="#ea580c" />
                            <stop offset="100%" stop-color="#c2410c" />
                        </linearGradient>
                        <linearGradient id="cloudInnerHighlight" x1="20%" y1="0%" x2="80%" y2="100%">
                            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35" />
                            <stop offset="60%" stop-color="#ffffff" stop-opacity="0.05" />
                            <stop offset="100%" stop-color="#ea580c" stop-opacity="0" />
                        </linearGradient>
                    </defs>
                    <!-- Main Cloud Body -->
                    <path d="M22 46C13.163 46 6 38.837 6 30C6 21.688 12.336 14.864 20.485 14.086C23.635 7.828 30.134 3.5 37.5 3.5C46.889 3.5 54.728 9.941 56.794 18.799C64.12 19.825 69.5 26.046 69.5 33.5C69.5 40.404 63.904 46 57 46H22Z" 
                          fill="url(#cloudOrangeGrad)"/>
                    <!-- Subtle 3D Top Inner Glow & Depth -->
                    <path d="M22 44C14.268 44 8 37.732 8 30C8 22.84 13.388 16.945 20.352 16.1C21.492 16.02 22.427 15.22 22.75 14.12C25.433 8.784 31.026 5.5 37.5 5.5C45.397 5.5 52.052 10.875 54.004 18.35C54.341 19.64 55.485 20.57 56.815 20.73C63.02 21.57 67.5 26.88 67.5 33.25C67.5 39.187 62.687 44 56.75 44H22Z" 
                          fill="url(#cloudInnerHighlight)"/>
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
