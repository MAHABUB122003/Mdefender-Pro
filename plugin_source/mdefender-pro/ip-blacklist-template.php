<?php
/**
 * MDefender-Pro Authentic LiteSpeed-Style 403 IP Blacklist Template
 *
 * 100% pixel-perfect replica of LiteSpeed Web Server's authentic 403 Forbidden page
 * with pitch-black theme (#000000), large centered 403, and clear blacklisted IP disclosure.
 *
 * @package MDefender-Pro
 */

if (!defined('ABSPATH') && !defined('WAF_FW_BOOTSTRAP_ACTIVE') && !defined('WAF_FW_PLUGIN_DIR')) {
    // Standalone execution safety check
}

if (!function_exists('esc_html')) {
    function esc_html($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
}
if (!function_exists('esc_attr')) {
    function esc_attr($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
}

if (!headers_sent()) {
    if (function_exists('http_response_code')) {
        http_response_code(403);
    }
    header('HTTP/1.1 403 Forbidden', true, 403);
    header('Status: 403 Forbidden');
    header('Content-Type: text/html; charset=UTF-8');
    header('X-Protected-By: MDefender-Pro-WAAP');
    header('Connection: close');
}

// Extract variables from result context or environment
$client_ip = !empty($GLOBALS['waf_matched_blacklisted_ip']) ? $GLOBALS['waf_matched_blacklisted_ip'] : 
             (!empty($result['ip']) ? $result['ip'] : 
             (!empty($mdefender_ip) ? $mdefender_ip : 
             (!empty($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '127.0.0.1')));

if (!empty($_GET['test_ip']) && filter_var($_GET['test_ip'], FILTER_VALIDATE_IP)) {
    $client_ip = trim($_GET['test_ip']);
}

$reference_id = !empty($result['reference_id']) ? $result['reference_id'] : (!empty($ref_id) ? $ref_id : ('MDF-IP-' . strtoupper(substr(md5($client_ip . time()), 0, 8))));
$site_host = $_SERVER['HTTP_HOST'] ?? ($_SERVER['SERVER_NAME'] ?? 'localhost');
$admin_email = function_exists('get_option') ? (get_option('admin_email') ?: 'admin@' . $site_host) : ('admin@' . $site_host);
?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>403 Forbidden</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        html, body {
            height: 100%;
            background-color: #000000;
            color: #555555;
            font-family: Arial, Helvetica, sans-serif;
            -webkit-font-smoothing: antialiased;
        }

        body {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 100vh;
        }

        /* Center Content Container */
        .main-wrapper {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
        }

        .center-content {
            text-align: center;
            max-width: 650px;
            width: 100%;
        }

        /* Big 403 */
        .error-code {
            font-size: 110px;
            font-weight: 700;
            line-height: 1;
            color: #4a4a4a;
            letter-spacing: -2px;
            margin-bottom: 8px;
        }

        /* Forbidden Headline */
        .error-title {
            font-size: 28px;
            font-weight: 600;
            color: #666666;
            margin-bottom: 14px;
        }

        /* Subtext */
        .error-desc {
            font-size: 13.5px;
            color: #555555;
            line-height: 1.6;
            margin-bottom: 24px;
        }

        /* IP Blacklist Notice Box */
        .ip-notice-box {
            background-color: #0d0d0d;
            border: 1px solid #1f1f1f;
            border-radius: 8px;
            padding: 16px 20px;
            margin-top: 10px;
            margin-bottom: 18px;
            text-align: center;
        }

        .ip-notice-title {
            color: #e5e5e5;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 6px;
        }

        .ip-badge {
            display: inline-block;
            background-color: #1a1a1a;
            color: #ef4444;
            font-family: 'Courier New', Courier, monospace;
            font-size: 18px;
            font-weight: 700;
            padding: 5px 14px;
            border-radius: 5px;
            border: 1px solid #331111;
            letter-spacing: 0.5px;
            margin: 6px 0;
        }

        .ip-notice-text {
            color: #777777;
            font-size: 12px;
            line-height: 1.5;
            margin-top: 6px;
        }

        .ip-notice-text strong {
            color: #999999;
        }

        .ip-contact-link {
            color: #8ab4f8;
            text-decoration: none;
            font-size: 12px;
            display: inline-block;
            margin-top: 8px;
        }

        .ip-contact-link:hover {
            text-decoration: underline;
        }

        /* Bottom LiteSpeed Banner */
        .footer-banner {
            background-color: #333333;
            color: #cccccc;
            padding: 12px 24px;
            font-size: 11.5px;
            line-height: 1.6;
            text-align: left;
            border-top: 1px solid #222222;
        }

        .footer-banner p {
            margin: 0;
            padding: 1px 0;
        }

        .footer-banner .powered {
            font-weight: 600;
            color: #ffffff;
        }

        .footer-banner .disclaimer {
            color: #999999;
            font-size: 10.5px;
        }

        @media (max-width: 600px) {
            .error-code {
                font-size: 80px;
            }
            .error-title {
                font-size: 22px;
            }
            .footer-banner {
                font-size: 10px;
                padding: 10px 16px;
            }
        }
    </style>
</head>
<body>
    <div class="main-wrapper">
        <div class="center-content">
            <h1 class="error-code">403</h1>
            <h2 class="error-title">Forbidden</h2>
            <p class="error-desc">Access to this resource on the server is denied!</p>

            <!-- Blacklisted IP Prominent Disclosure -->
            <div class="ip-notice-box">
                <div class="ip-notice-title">Your IP Address is Blacklisted (আইপি ব্ল্যাকলিস্টেড)</div>
                <div class="ip-badge"><?php echo esc_html($client_ip); ?></div>
                <div class="ip-notice-text">
                    This IP address has been restricted by security policy.<br>
                    <strong>Incident ID:</strong> <?php echo esc_html($reference_id); ?> &bull; <strong>Host:</strong> <?php echo esc_html($site_host); ?><br>
                    ভুলবশত ব্ল্যাকলিস্ট হয়ে থাকলে উপরের আইপি ও Incident ID সহ সাইট অ্যাডমিনের সাথে যোগাযোগ করুন।
                </div>
                <a href="mailto:<?php echo esc_attr($admin_email); ?>?subject=Unblock%20Request%20for%20IP%20<?php echo urlencode($client_ip); ?>&body=Please%20unblock%20my%20IP%20address%20<?php echo urlencode($client_ip); ?>%20(Incident%20ID:%20<?php echo urlencode($reference_id); ?>)%20on%20<?php echo urlencode($site_host); ?>" class="ip-contact-link">
                    &rarr; Contact Site Administrator to Request Unblock
                </a>
            </div>
        </div>
    </div>

    <!-- Authentic LiteSpeed Bottom Banner -->
    <div class="footer-banner">
        <p class="powered">Proudly powered by LiteSpeed Web Server</p>
        <p class="disclaimer">Please be advised that LiteSpeed Technologies Inc. is not a web hosting company and, as such, has no control over content found on this site.</p>
    </div>
</body>
</html>
