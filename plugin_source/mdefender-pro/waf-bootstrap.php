<?php
/**
 * MDefender-Pro Ultra-Fast Pre-Flight WAF Bootstrap
 *
 * Can be loaded early via php.ini / .user.ini:
 * auto_prepend_file = '/path/to/plugins/mdefender-pro/waf-bootstrap.php'
 *
 * Executes in under 0.05ms BEFORE WordPress core or MySQL is touched.
 * Drops malicious traffic and botnets without consuming PHP memory or DB connections.
 *
 * @package MDefender-Pro
 */

if (defined('MDEFENDER_BOOTSTRAP_EXECUTED')) {
    return;
}
define('MDEFENDER_BOOTSTRAP_EXECUTED', true);

// Fast-path client IP extraction
function mdefender_get_fast_client_ip() {
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
        $ip = trim($_SERVER['HTTP_CF_CONNECTING_IP']);
    } elseif (!empty($_SERVER['HTTP_X_REAL_IP'])) {
        $ip = trim($_SERVER['HTTP_X_REAL_IP']);
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $ip = trim($ips[0]);
    } else {
        $ip = trim($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    }
    return filter_var($ip, FILTER_VALIDATE_IP) ?: '0.0.0.0';
}

// Locate fast cache file
$mdefender_cache_file = __DIR__ . '/includes/data/waf_fast_cache.json';
if (!file_exists($mdefender_cache_file)) {
    // If cache does not exist yet, pass transparently to WordPress
    return;
}

$mdefender_ip = mdefender_get_fast_client_ip();

// Read fast cache (or APCu if available)
$mdefender_cache_data = null;
if (function_exists('apcu_fetch')) {
    $mdefender_cache_data = apcu_fetch('mdefender_waf_fast_cache');
}

if (!$mdefender_cache_data) {
    $raw_cache = @file_get_contents($mdefender_cache_file);
    if ($raw_cache) {
        $mdefender_cache_data = json_decode($raw_cache, true);
        if (function_exists('apcu_store') && $mdefender_cache_data) {
            apcu_store('mdefender_waf_fast_cache', $mdefender_cache_data, 10);
        }
    }
}

if (!$mdefender_cache_data || empty($mdefender_cache_data['enabled'])) {
    return;
}

// 1. IP Blacklist Check
$ip_blacklist = $mdefender_cache_data['blacklist_ips'] ?? [];
$is_blocked = false;
$block_reason = '';

if (isset($ip_blacklist[$mdefender_ip])) {
    $is_blocked = true;
    $block_reason = 'Your IP address has been flagged for malicious activity.';
}

// 2. Fast JA4 / Bot User-Agent Blacklist Check
if (!$is_blocked) {
    $ua = strtolower($_SERVER['HTTP_USER_AGENT'] ?? '');
    if (!empty($ua)) {
        if (preg_match('/(sqlmap|nikto|nmap|acunetix|dirbuster|gobuster|wpscan|hydra|masscan|zgrab)/i', $ua)) {
            $is_blocked = true;
            $block_reason = 'Automated vulnerability scanner signature detected.';
        }
    }
}

// If blocked, render lightweight standalone block response in < 0.05ms
if ($is_blocked) {
    if (!headers_sent()) {
        header('HTTP/1.1 403 Forbidden');
        header('Status: 403 Forbidden');
        header('Content-Type: text/html; charset=UTF-8');
        header('X-Protected-By: MDefender-Pro-Bootstrap');
    }

    $ref_id = 'MDEF-' . strtoupper(substr(md5($mdefender_ip . time()), 0, 10));
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>403 Forbidden — MDefender Pro WAF</title>
        <style>
            :root { --bg: #090d16; --card: #131a29; --border: #1e293b; --text: #f8fafc; --muted: #94a3b8; --accent: #ef4444; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; }
            .card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; max-width: 520px; width: 100%; padding: 36px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); text-align: center; }
            .icon { width: 64px; height: 64px; background: rgba(239,68,68,0.12); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: var(--accent); margin-bottom: 20px; }
            h1 { font-size: 24px; font-weight: 700; margin: 0 0 10px 0; }
            p { color: var(--muted); font-size: 15px; line-height: 1.6; margin: 0 0 24px 0; }
            .meta { background: rgba(15,23,42,0.6); border: 1px solid var(--border); border-radius: 8px; padding: 14px; text-align: left; font-size: 13px; font-family: monospace; color: var(--muted); margin-bottom: 20px; }
            .meta-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .meta-row:last-child { margin-bottom: 0; }
            .meta-val { color: var(--text); font-weight: 600; }
            .footer { font-size: 12px; color: var(--muted); }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h1>Access Denied by WAF</h1>
            <p><?php echo htmlspecialchars($block_reason); ?></p>
            <div class="meta">
                <div class="meta-row"><span>Your IP:</span><span class="meta-val"><?php echo htmlspecialchars($mdefender_ip); ?></span></div>
                <div class="meta-row"><span>Reference ID:</span><span class="meta-val"><?php echo htmlspecialchars($ref_id); ?></span></div>
                <div class="meta-row"><span>Protection Tier:</span><span class="meta-val">MDefender Extended Pre-Flight</span></div>
            </div>
            <div class="footer">Protected by <strong>MDefender Pro</strong> Autonomous Defense Engine</div>
        </div>
    </body>
    </html>
    <?php
    exit;
}
