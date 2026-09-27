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
                $geoip_info = $city && $country ? " (GeoIP: {$city}, {$country})" : ($country ? " (GeoIP: {$country})" : '');
                if (function_exists('set_transient')) {
                    $hour = defined('HOUR_IN_SECONDS') ? HOUR_IN_SECONDS : 3600;
                    set_transient($transient_key, ['info' => $geoip_info, 'code' => $country_code_lower], 12 * $hour);
                }
            }
        }
    }
}

if (empty($geoip_info)) {
    $geoip_info = " (GeoIP: Dhaka, Bangladesh)";
    $country_code_lower = 'bd';
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
$server_host = function_exists('gethostname') ? gethostname() : ($_SERVER['SERVER_NAME'] ?? 'app-srv-01-prod-us-east.net');
if (strpos($server_host, '.') === false || $server_host === 'localhost') {
    $server_host = '(e.g.) app-srv-01-prod-us-east.net';
}

$admin_email = get_option('admin_email') ?: 'security@' . $site_host;
?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>403 &mdash; SECURITY ACTION REQUIRED</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #f8fafc;
            --card-bg: #ffffff;
            --text-main: #0f172a;
            --text-body: #475569;
            --text-muted: #94a3b8;
            --border-table: #cbd5e1;
            --border-card: #e2e8f0;
            --primary-btn: #1e3a8a;
            --primary-hover: #172554;
            --danger: #dc2626;
            --font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            --font-mono: 'JetBrains Mono', monospace;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: var(--font-family);
            background-color: var(--bg);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            -webkit-font-smoothing: antialiased;
        }

        .block-card {
            width: 100%;
            max-width: 780px;
            background: var(--card-bg);
            border: 1px solid var(--border-card);
            border-radius: 20px;
            box-shadow: 0 20px 35px -10px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02);
            padding: 48px 44px;
            text-align: center;
        }

        /* Top Brand Header */
        .shield-icon-wrapper {
            margin-bottom: 16px;
            display: flex;
            justify-content: center;
        }

        .shield-badge {
            width: 68px;
            height: 68px;
            filter: drop-shadow(0 4px 6px rgba(15, 23, 42, 0.08));
        }

        .brand-title {
            font-size: 17px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-bottom: 6px;
        }

        .brand-subtitle {
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 2.2px;
            margin-bottom: 4px;
        }

        .brand-owner {
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 24px;
        }

        /* Main Headlines */
        .headline-403 {
            font-size: 24px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.3px;
            margin-bottom: 6px;
        }

        .headline-waf {
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 6px;
        }

        .headline-restricted {
            font-size: 13px;
            font-weight: 400;
            color: var(--text-body);
            margin-bottom: 28px;
        }

        /* Details Table */
        .table-wrap {
            border: 1px solid var(--border-table);
            border-radius: 10px;
            overflow: hidden;
            background: #ffffff;
            margin-bottom: 26px;
            text-align: left;
        }

        .details-table {
            width: 100%;
            border-collapse: collapse;
        }

        .details-table tr {
            border-bottom: 1px solid var(--border-table);
        }

        .details-table tr:last-child {
            border-bottom: none;
        }

        .details-table th {
            width: 250px;
            background-color: #f8fafc;
            color: #475569;
            font-weight: 700;
            font-size: 12.5px;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            padding: 14px 20px;
            border-right: 1px solid var(--border-table);
            vertical-align: middle;
        }

        .details-table td {
            color: #334155;
            font-weight: 500;
            font-size: 13.5px;
            padding: 14px 20px;
            vertical-align: middle;
            background-color: #ffffff;
        }

        /* Classification Row */
        .classification-row th {
            background-color: #f8fafc;
        }

        .classification-row td {
            background-color: #fff8f8;
        }

        .classification-flex {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .classification-text {
            color: var(--danger);
            font-weight: 700;
            font-size: 13.5px;
        }

        .info-tag {
            background: #f1f5f9;
            color: #475569;
            border: 1px solid #cbd5e1;
            font-size: 11.5px;
            font-weight: 600;
            padding: 3px 12px;
            border-radius: 4px;
            letter-spacing: 0.2px;
        }

        .ip-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .country-flag {
            display: inline-block;
            border-radius: 2px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            vertical-align: middle;
        }

        /* Why did this happen */
        .why-heading {
            font-size: 15px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 8px;
        }

        .why-paragraph {
            font-size: 13px;
            line-height: 1.6;
            color: var(--text-body);
            max-width: 660px;
            margin: 0 auto 22px;
        }

        /* Reference Box */
        .reference-badge {
            display: inline-block;
            background: #f8fafc;
            border: 1px dashed #cbd5e1;
            border-radius: 6px;
            padding: 11px 26px;
            font-family: var(--font-mono);
            font-size: 13.5px;
            font-weight: 700;
            color: #0f172a;
            letter-spacing: 0.8px;
            cursor: pointer;
            margin-bottom: 24px;
            transition: all 0.2s ease;
        }

        .reference-badge:hover {
            background: #f1f5f9;
            border-color: #94a3b8;
        }

        /* Action Button */
        .btn-contact {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background-color: var(--primary-btn);
            color: #ffffff;
            font-family: var(--font-family);
            font-size: 13.5px;
            font-weight: 600;
            text-decoration: none;
            padding: 11px 28px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            transition: background-color 0.2s ease, transform 0.1s ease;
            box-shadow: 0 2px 4px rgba(15, 23, 42, 0.06);
        }

        .btn-contact:hover {
            background-color: var(--primary-hover);
            transform: translateY(-1px);
        }

        /* Footer */
        .block-footer {
            margin-top: 32px;
            padding-top: 20px;
            border-top: 1px solid var(--border-card);
            font-size: 12px;
            color: var(--text-muted);
        }

        @media (max-width: 640px) {
            .block-card {
                padding: 28px 18px;
            }
            .details-table th, .details-table td {
                display: block;
                width: 100%;
                border-right: none;
            }
            .details-table th {
                padding-bottom: 4px;
            }
            .details-table td {
                padding-top: 4px;
            }
            .details-table tr {
                padding: 8px 0;
            }
            .classification-flex {
                flex-direction: column;
                align-items: flex-start;
                gap: 6px;
            }
        }
    </style>
</head>
<body>
    <div class="block-card">
        <!-- Shield Logo Badge -->
        <div class="shield-icon-wrapper">
            <svg class="shield-badge" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="shieldFill" x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stop-color="#cbd5e1" />
                        <stop offset="50%" stop-color="#94a3b8" />
                        <stop offset="100%" stop-color="#64748b" />
                    </linearGradient>
                    <linearGradient id="innerShield" x1="50" y1="10" x2="50" y2="90" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stop-color="#f1f5f9" />
                        <stop offset="100%" stop-color="#cbd5e1" />
                    </linearGradient>
                </defs>
                <!-- Shield Base -->
                <path d="M50 8C72 18 84 21 84 42C84 66 64 85 50 94C36 85 16 66 16 42C16 21 28 18 50 8Z" fill="url(#shieldFill)" stroke="#475569" stroke-width="2" />
                <path d="M50 14C68 23 78 26 78 43C78 63 61 79 50 87C39 79 22 63 22 43C22 26 32 23 50 14Z" fill="url(#innerShield)" />
                <!-- Dark Stylized Emblem -->
                <path d="M50 25C48 31 43 33 40 33C37 33 36 36 38 38C40 40 43 38 43 42C43 45 39 48 35 46C32 44 30 47 32 50C34 53 38 52 40 55C42 57 40 60 37 62C40 64 45 65 48 62C48 59 46 56 47 54C49 51 52 53 54 50C56 48 55 45 52 43C53 39 57 40 58 37C60 33 56 32 54 28C52 25 51 22 50 25Z" fill="#1e293b" />
            </svg>
        </div>

        <div class="brand-title">MDEFENDER-PRO AI</div>
        <div class="brand-subtitle">A.S.A.P. SECURITY FIREWALL</div>
        <div class="brand-owner"><?php echo esc_html(strtoupper($site_name)); ?></div>

        <h1 class="headline-403">403 &mdash; SECURITY ACTION REQUIRED</h1>
        <h2 class="headline-waf">Access Denied by Corporate WAF</h2>
        <div class="headline-restricted">Access to [<?php echo esc_html($site_host); ?>] restricted.</div>

        <!-- Details Table -->
        <div class="table-wrap">
            <table class="details-table">
                <tr class="classification-row">
                    <th>ATTACK CLASSIFICATION</th>
                    <td>
                        <div class="classification-flex">
                            <span class="classification-text"><?php echo esc_html($attack_type); ?></span>
                            <span class="info-tag">Detailed info tag</span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <th>ORIGIN CLIENT IP</th>
                    <td>
                        <div class="ip-content">
                            <?php if (!empty($country_code_lower)): ?>
                                <img src="https://flagcdn.com/w40/<?php echo esc_attr($country_code_lower); ?>.png" 
                                     srcset="https://flagcdn.com/w80/<?php echo esc_attr($country_code_lower); ?>.png 2x" 
                                     width="20" height="15" 
                                     alt="<?php echo esc_attr(strtoupper($country_code_lower)); ?>"
                                     class="country-flag">
                            <?php endif; ?>
                            <span><?php echo esc_html($client_ip); ?><?php echo esc_html($geoip_info); ?></span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <th>EVENT TIMESTAMP</th>
                    <td><?php echo esc_html($utc_timestamp); ?> (Ref: <?php echo esc_html($unix_ref); ?>)</td>
                </tr>
                <tr>
                    <th>VIOLATION REASON</th>
                    <td>Request blocked by rule ID: <?php echo esc_html($rule_id); ?> (Ref: <?php echo esc_html($rule_name); ?>)</td>
                </tr>
                <tr>
                    <th>PROTOCOL DETAILS</th>
                    <td><?php echo esc_html($_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.1'); ?> (WAF_VER: 4.1.0)</td>
                </tr>
                <tr>
                    <th>SERVER HOST</th>
                    <td><?php echo esc_html($server_host); ?></td>
                </tr>
            </table>
        </div>

        <!-- Explanatory Section -->
        <div class="why-heading">Why did this happen?</div>
        <p class="why-paragraph">
            To maintain system integrity, suspicious requests are automatically analyzed and filtered. If you believe this is a valid corporate action, please share the Reference ID below with your local IT/Security operations. Regular users should clear cache or contact support.
        </p>

        <!-- Reference ID -->
        <div class="reference-badge" id="refIdBadge" onclick="copyRefId()" title="Click to copy Reference ID">
            REFERENCE ID: <?php echo esc_html($reference_id); ?>
        </div>

        <!-- Action Button -->
        <div>
            <a href="mailto:<?php echo esc_attr($admin_email); ?>?subject=WAF Block Reference: <?php echo esc_attr($reference_id); ?>&body=Security Support,%0D%0A%0D%0AMy request was restricted by MDefender-Pro AI Firewall.%0D%0A%0D%0ADetails:%0D%0A- Reference ID: <?php echo esc_attr($reference_id); ?>%0D%0A- Client IP: <?php echo esc_attr($client_ip); ?>%0D%0A- Host: <?php echo esc_attr($site_host); ?>" 
               class="btn-contact">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                Contact Security Operations
            </a>
        </div>

        <div class="block-footer">
            Secured by MDefender-Pro AI Firewall. All critical system events are logged and audited.
        </div>
    </div>

    <script>
        function copyRefId() {
            const refText = "<?php echo esc_js($reference_id); ?>";
            navigator.clipboard.writeText(refText).then(() => {
                const el = document.getElementById('refIdBadge');
                const orig = el.innerText;
                el.innerText = 'COPIED TO CLIPBOARD';
                el.style.borderColor = '#10b981';
                el.style.color = '#10b981';
                setTimeout(() => {
                    el.innerText = orig;
                    el.style.borderColor = '';
                    el.style.color = '';
                }, 2000);
            });
        }
    </script>
</body>
</html>
