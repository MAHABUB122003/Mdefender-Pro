<?php
defined('ABSPATH') || exit;
$attack_type  = !empty($result['attack_type']) ? $result['attack_type'] : 'Security Threat';
$client_ip    = !empty($result['ip']) ? $result['ip'] : ($_SERVER['REMOTE_ADDR'] ?? 'Unknown');
$reason       = !empty($result['message']) ? $result['message'] : 'This request has been blocked by Web Application Firewall';
$reference_id = !empty($result['reference_id']) ? $result['reference_id'] : ('MDF-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8)));
$timestamp    = !empty($result['timestamp']) ? $result['timestamp'] : current_time('mysql');
$colors       = get_option('waf_fw_block_colors', '#4f46e5,#6366f1');
$message      = get_option('waf_fw_block_message', 'This request has been blocked by Web Application Firewall');
$site_name    = get_bloginfo('name') ?: 'Website Security';

$colors_arr = explode(',', $colors);
$color1 = trim($colors_arr[0] ?? '#4f46e5');
$color2 = trim($colors_arr[1] ?? '#6366f1');

// Dynamic GeoIP details resolution with transient cache
$geoip_info = '';
$country_code_lower = '';
if (!empty($client_ip) && $client_ip !== '127.0.0.1' && $client_ip !== '::1' && filter_var($client_ip, FILTER_VALIDATE_IP)) {
    $transient_key = 'waf_fw_geoip_full_new_' . md5($client_ip);
    $cached = get_transient($transient_key);
    if ($cached !== false && is_array($cached)) {
        $geoip_info = $cached['info'] ?? '';
        $country_code_lower = $cached['code'] ?? '';
    } else {
        $response = wp_remote_get("http://ip-api.com/json/{$client_ip}?fields=status,country,city,countryCode", ['timeout' => 3]);
        if (!is_wp_error($response)) {
            $data = json_decode(wp_remote_retrieve_body($response), true);
            if (!empty($data['status']) && $data['status'] === 'success') {
                $city = !empty($data['city']) ? $data['city'] : '';
                $country = !empty($data['country']) ? $data['country'] : '';
                $cc = !empty($data['countryCode']) ? strtolower($data['countryCode']) : '';
                
                if ($city && $country) {
                    $geoip_info = " (GeoIP: {$city}, {$country})";
                } elseif ($country) {
                    $geoip_info = " (GeoIP: {$country})";
                }
                
                $country_code_lower = $cc;
                set_transient($transient_key, ['info' => $geoip_info, 'code' => $country_code_lower], 12 * HOUR_IN_SECONDS);
            }
        }
    }
} else {
    // Local / private IP fallback matching example mockup
    $geoip_info = " (GeoIP: Dhaka, Bangladesh)";
    $country_code_lower = 'bd';
}

// Convert MySQL timestamp to UTC format & get Unix ref
try {
    $dt = new DateTime($timestamp);
    $utc_timestamp = $dt->format('Y-m-d H:i:s') . ' UTC';
    $unix_ref = $dt->getTimestamp();
} catch (Exception $e) {
    $utc_timestamp = $timestamp;
    $unix_ref = time();
}

// Rule details parsing
$rule_name = !empty($result['rule_matched']) ? $result['rule_matched'] : '';
$rule_id = '90001';
if (!empty($rule_name)) {
    $rule_id = (abs(crc32($rule_name)) % 10000) + 90000;
} else {
    $rule_name = 'System Command Injection';
}

// Server Host details
$server_host = function_exists('gethostname') ? gethostname() : ($_SERVER['SERVER_NAME'] ?? 'app-srv-01-prod-us-east.net');
if (strpos($server_host, '.') === false) {
    $server_host = '(e.g.) app-srv-01-prod-us-east.net';
}
?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>403 &mdash; Security Action Required</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --brand-1: <?php echo esc_attr($color1); ?>;
            --brand-2: <?php echo esc_attr($color2); ?>;
            --bg-color: #f8fafc;
            --card-bg: #ffffff;
            --text-primary: #0f172a;
            --text-secondary: #475569;
            --text-muted: #94a3b8;
            --border-color: #cbd5e1;
            --font-main: 'Outfit', sans-serif;
            --font-mono: 'JetBrains Mono', monospace;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: var(--font-main);
            background-color: var(--bg-color);
            background-image: 
                radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.02) 0%, transparent 40%),
                radial-gradient(circle at 90% 80%, rgba(59, 130, 246, 0.02) 0%, transparent 40%);
            color: var(--text-primary);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
        }
        .container {
            width: 100%;
            max-width: 850px;
            background: var(--card-bg);
            border: 1px solid rgba(226, 232, 240, 0.9);
            border-radius: 16px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.03), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
            padding: 48px;
            text-align: center;
            animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .logo-wrap {
            margin-bottom: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .logo-svg {
            width: 80px;
            height: 80px;
        }
        .logo-text {
            font-size: 18px;
            font-weight: 800;
            color: #1e293b;
            letter-spacing: 0.5px;
            margin-top: 6px;
            text-transform: uppercase;
        }
        .fw-badge {
            font-size: 11.5px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 4px;
        }
        .fw-owner {
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 24px;
        }
        .main-title {
            font-size: 25px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.5px;
            margin-bottom: 6px;
        }
        .sub-title {
            font-size: 19px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 8px;
        }
        .desc-text {
            font-size: 13.5px;
            color: var(--text-secondary);
            margin-bottom: 28px;
        }
        
        .table-container {
            border: 1px solid var(--border-color);
            border-radius: 8px;
            overflow: hidden;
            background: #ffffff;
            margin-bottom: 24px;
            text-align: left;
        }
        .details-table {
            width: 100%;
            border-collapse: collapse;
        }
        .details-table tr {
            border-bottom: 1px solid var(--border-color);
        }
        .details-table tr:last-child {
            border-bottom: none;
        }
        .details-table th {
            background-color: #f8fafc;
            color: #475569;
            font-weight: 700;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            width: 240px;
            padding: 14px 20px;
            border-right: 1px solid var(--border-color);
            vertical-align: middle;
        }
        .details-table td {
            color: #334155;
            font-weight: 500;
            font-size: 13.5px;
            padding: 14px 20px;
            vertical-align: middle;
        }
        
        .threat-row td {
            background-color: #fff5f5 !important;
            color: #991b1b !important;
        }
        .threat-cell-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
        }
        .threat-text {
            font-weight: 700;
            color: #dc2626;
        }
        .info-tag {
            background: #f1f5f9;
            color: #475569;
            border: 1px solid #cbd5e1;
            font-size: 11.5px;
            font-weight: 600;
            padding: 3px 10px;
            border-radius: 4px;
            text-decoration: none;
        }
        
        .ip-wrap {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .flag-img {
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-radius: 2px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            display: inline-block;
            vertical-align: middle;
        }
        
        .why-header {
            font-size: 15px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 24px;
            margin-bottom: 8px;
        }
        .why-desc {
            font-size: 13.5px;
            color: var(--text-secondary);
            line-height: 1.6;
            max-width: 680px;
            margin: 0 auto 24px;
        }
        
        .ref-box {
            background: #f8fafc;
            border: 1px dashed var(--border-color);
            border-radius: 6px;
            padding: 12px 24px;
            font-family: var(--font-mono);
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
            display: inline-block;
            margin-bottom: 30px;
            letter-spacing: 0.5px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .ref-box:hover {
            background: #f1f5f9;
            border-color: #94a3b8;
            transform: scale(1.01);
        }
        
        .actions {
            display: flex;
            justify-content: center;
            gap: 12px;
            margin-bottom: 12px;
            flex-wrap: wrap;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 12px 28px;
            border-radius: 6px;
            font-size: 13.5px;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s ease;
            gap: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .btn-primary {
            background-color: #1e3a8a;
            color: #ffffff;
            border: none;
        }
        .btn-primary:hover {
            background-color: #172554;
            transform: translateY(-1px);
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        
        .footer {
            font-size: 12px;
            color: var(--text-muted);
            border-top: 1px solid var(--border-color);
            padding-top: 24px;
            margin-top: 24px;
        }
        
        @media (max-width: 768px) {
            .container { padding: 24px; }
            .details-table th, .details-table td {
                display: block;
                width: 100%;
                border-right: none;
            }
            .details-table th {
                background-color: #f8fafc;
                padding-bottom: 6px;
            }
            .details-table td {
                padding-top: 6px;
                border-bottom: none;
            }
            .details-table tr {
                border-bottom: 1px solid var(--border-color);
                display: block;
            }
            .threat-cell-content {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }
            .actions {
                flex-direction: column;
                width: 100%;
                max-width: 400px;
                margin: 0 auto 12px;
            }
            .btn {
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Logo Header -->
        <div class="logo-wrap">
            <svg class="logo-svg" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="shieldBg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#f8fafc" />
                        <stop offset="30%" stop-color="#cbd5e1" />
                        <stop offset="70%" stop-color="#94a3b8" />
                        <stop offset="100%" stop-color="#475569" />
                    </linearGradient>
                    <linearGradient id="shieldBorder" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#94a3b8" />
                        <stop offset="50%" stop-color="#f1f5f9" />
                        <stop offset="100%" stop-color="#475569" />
                    </linearGradient>
                    <linearGradient id="dragonColor" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#1e293b" />
                        <stop offset="100%" stop-color="#0f172a" />
                    </linearGradient>
                    <filter id="dropShadow" x="-10%" y="-10%" width="120%" height="120%">
                        <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#0f172a" flood-opacity="0.15" />
                    </filter>
                </defs>
                <path d="M60 10 C85 22 98 25 98 48 C98 75 75 98 60 108 C45 98 22 75 22 48 C22 25 35 22 60 10 Z" fill="url(#shieldBg)" stroke="url(#shieldBorder)" stroke-width="3" filter="url(#dropShadow)" />
                <path d="M60 18 C80 28 90 30 90 48 C90 70 70 90 60 98 C50 90 30 70 30 48 C30 30 40 28 60 18 Z" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.8" stroke-dasharray="3 2" />
                <path d="M60 28 C58 35 52 38 48 38 C44 38 43 42 45 44 C47 46 51 44 51 48 C51 52 46 55 42 53 C38 51 36 54 38 58 C40 62 45 60 48 64 C50 66 48 70 44 72 C48 74 54 75 58 72 C58 68 55 65 57 62 C59 59 63 61 65 58 C67 55 66 52 62 50 C64 45 68 46 70 42 C72 38 67 36 65 32 C63 28 61 25 60 28 Z" fill="url(#dragonColor)" />
            </svg>
            <div class="logo-text">MDefender-Pro AI</div>
        </div>
        
        <div class="fw-badge">A.S.A.P. Security Firewall</div>
        <div class="fw-owner">Mahabub</div>
        
        <h1 class="main-title">403 — SECURITY ACTION REQUIRED</h1>
        <h2 class="sub-title">Access Denied by Corporate WAF</h2>
        
        <?php if ($message && $message !== 'This request has been blocked by Web Application Firewall'): ?>
            <div class="desc-text"><?php echo esc_html($message); ?></div>
        <?php else: ?>
            <div class="desc-text">Access to [<?php echo esc_html($_SERVER['HTTP_HOST'] ?? 'target_domain_here.com'); ?>] restricted.</div>
        <?php endif; ?>
        
        <!-- Table Section -->
        <div class="table-container">
            <table class="details-table">
                <tr class="threat-row">
                    <th>Attack Classification</th>
                    <td>
                        <div class="threat-cell-content">
                            <span class="threat-text"><?php echo esc_html($attack_type); ?></span>
                            <span class="info-tag">Detailed info tag</span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <th>Origin Client IP</th>
                    <td>
                        <div class="ip-wrap">
                            <?php if (!empty($country_code_lower)): ?>
                                <img src="https://flagcdn.com/w40/<?php echo esc_attr($country_code_lower); ?>.png" 
                                     srcset="https://flagcdn.com/w80/<?php echo esc_attr($country_code_lower); ?>.png 2x" 
                                     width="20" height="15" 
                                     alt="<?php echo esc_attr(strtoupper($country_code_lower)); ?>"
                                     class="flag-img">
                            <?php endif; ?>
                            <span><?php echo esc_html($client_ip); ?><?php echo esc_html($geoip_info); ?></span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <th>Event Timestamp</th>
                    <td><?php echo esc_html($utc_timestamp); ?> (Ref: <?php echo esc_html($unix_ref); ?>)</td>
                </tr>
                <tr>
                    <th>Violation Reason</th>
                    <td>Request blocked by rule ID: <?php echo esc_html($rule_id); ?> (Ref: <?php echo esc_html($rule_name); ?>)</td>
                </tr>
                <tr>
                    <th>Protocol Details</th>
                    <td><?php echo esc_html($_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.1'); ?> (WAF_VER: <?php echo esc_html(defined('WAF_FW_VERSION') ? WAF_FW_VERSION : '4.1.0'); ?>)</td>
                </tr>
                <tr>
                    <th>Server Host</th>
                    <td><?php echo esc_html($server_host); ?></td>
                </tr>
            </table>
        </div>
        
        <!-- Bottom Explanatory Section -->
        <h3 class="why-header">Why did this happen?</h3>
        <p class="why-desc">
            To maintain system integrity, suspicious requests are automatically analyzed and filtered. If you believe this is a valid corporate action, please share the Reference ID below with your local IT/Security operations. Regular users should clear cache or contact support.
        </p>
        
        <div class="ref-box" id="ref-id-box" title="Click to copy Reference ID" onclick="copyRef()">
            REFERENCE ID: <?php echo esc_html($reference_id); ?>
        </div>
        
        <!-- Actions Button Section -->
        <div class="actions">
            <a href="mailto:<?php echo esc_attr(get_option('admin_email')); ?>?subject=WAF Block Reference: <?php echo esc_attr($reference_id); ?>&body=Hello,%0D%0A%0D%0AMy request was blocked by the security firewall. Details below:%0D%0A- Reference ID: <?php echo esc_attr($reference_id); ?>%0D%0A- IP: <?php echo esc_attr($client_ip); ?>%0D%0A- Domain: <?php echo esc_attr($_SERVER['HTTP_HOST'] ?? ''); ?>" 
               class="btn btn-primary" onclick="copyRef()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 2px;">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                Contact Security Operations
            </a>
        </div>
        
        <div class="footer">
            Secured by MDefender-Pro AI Firewall. All critical system events are logged and audited.
        </div>
    </div>

    <script>
        function copyRef() {
            const refText = "<?php echo esc_js($reference_id); ?>";
            navigator.clipboard.writeText(refText).then(() => {
                const refBox = document.getElementById('ref-id-box');
                const originalHtml = refBox.innerHTML;
                refBox.innerHTML = 'COPIED TO CLIPBOARD! ✅';
                refBox.style.color = '#10b981';
                refBox.style.borderColor = '#10b981';
                refBox.style.background = '#ecfdf5';
                setTimeout(() => {
                    refBox.innerHTML = originalHtml;
                    refBox.style.color = '';
                    refBox.style.borderColor = '';
                    refBox.style.background = '';
                }, 2000);
            }).catch(err => {
                console.error('Could not copy Reference ID: ', err);
            });
        }
    </script>
</body>
</html>
