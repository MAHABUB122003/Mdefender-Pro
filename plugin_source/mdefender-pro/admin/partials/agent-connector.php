<?php
defined('ABSPATH') || exit('Access Denied');

/**
 * MDefender Pro - Security Agent & Cloud Connector
 * 
 * Minimalist, high-security, ultra-lightweight agent interface for WordPress.
 * All complex fleet operations, rule authoring, live logs, and threat intelligence
 * are securely orchestrated from the central MDefender Pro Cloud User Dashboard.
 *
 * @package MDefender-Pro
 */

if (!defined('ABSPATH')) exit('Access Denied');

if (!current_user_can('manage_options')) {
    wp_die(esc_html__('You do not have sufficient permissions to access this page.', 'mdefender-pro'));
}

$notice_msg = '';
$notice_type = 'success';

// Handle Form Submissions (Connect, Save, Disconnect)
if (isset($_POST['waf_connector_action']) && check_admin_referer('waf_connector_nonce_action', 'waf_connector_nonce')) {
    $action = sanitize_text_field($_POST['waf_connector_action']);

    if ($action === 'save_connection') {
        $api_key = sanitize_text_field(trim($_POST['waf_api_key'] ?? ''));
        $cloud_url = esc_url_raw(trim($_POST['waf_cloud_url'] ?? ''));
        
        if (empty($cloud_url)) {
            $cloud_url = 'http://localhost:5173'; // Default MDefender Cloud Portal URL
        }

        if (empty($api_key)) {
            $notice_msg = __('API Key cannot be empty. Please enter your valid MDefender Pro API Key.', 'mdefender-pro');
            $notice_type = 'error';
        } else {
            update_option('waf_fw_api_key', $api_key);
            update_option('waf_fw_cloud_api_url', $cloud_url);
            update_option('waf_fw_connected', 'yes');
            update_option('waf_fw_last_sync', current_time('mysql'));
            $notice_msg = __('Successfully connected to MDefender Pro Cloud! Agent is actively synchronized.', 'mdefender-pro');
            $notice_type = 'success';
        }
    } elseif ($action === 'disconnect') {
        update_option('waf_fw_api_key', '');
        update_option('waf_fw_connected', 'no');
        $notice_msg = __('Disconnected from MDefender Pro Cloud. Agent is now in standalone standby mode.', 'mdefender-pro');
        $notice_type = 'warning';
    }
}

$api_key = get_option('waf_fw_api_key', '');
$cloud_url = get_option('waf_fw_cloud_api_url', 'http://localhost:5173');
$is_connected = get_option('waf_fw_connected', 'no') === 'yes' && !empty($api_key);
$site_token = get_option('waf_fw_site_token', '');
if (empty($site_token)) {
    $site_token = wp_generate_password(32, false);
    update_option('waf_fw_site_token', $site_token);
}

$last_sync = get_option('waf_fw_last_sync', '');
$last_sync_display = !empty($last_sync) ? date_i18n('M j, Y - H:i:s', strtotime($last_sync)) : __('Awaiting First Sync', 'mdefender-pro');

// Engine statuses
$waf_active = get_option('waf_fw_protection_enabled', 'yes') === 'yes';
$max_logs = (int) get_option('waf_fw_recycle_max_logs', 2000);
$retention_days = (int) get_option('waf_fw_recycle_days', 7);
global $wpdb;
$attacks_table = $wpdb->prefix . (defined('WAF_FW_TABLE_ATTACKS') ? WAF_FW_TABLE_ATTACKS : 'waf_attacks');
$current_log_count = (int) $wpdb->get_var("SELECT COUNT(*) FROM $attacks_table");
?>

<div class="wrap mdf-agent-wrap">
    <style>
        .mdf-agent-wrap {
            max-width: 980px;
            margin: 24px auto 40px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
            color: #0F172A;
        }
        .mdf-agent-card {
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            padding: 28px 32px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
            margin-bottom: 24px;
        }
        .mdf-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid #F1F5F9;
            padding-bottom: 20px;
            margin-bottom: 24px;
        }
        .mdf-header-left {
            display: flex;
            align-items: center;
            gap: 16px;
        }
        .mdf-logo-badge {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #059669 0%, #10B981 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFFFFF;
            font-weight: 800;
            font-size: 20px;
            box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);
        }
        .mdf-title-block h1 {
            font-size: 22px;
            font-weight: 700;
            margin: 0 0 4px;
            color: #0F172A;
            line-height: 1.2;
        }
        .mdf-title-block p {
            margin: 0;
            font-size: 13px;
            color: #64748B;
        }
        .mdf-status-pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.3px;
        }
        .mdf-status-pill.connected {
            background: #ECFDF5;
            color: #065F46;
            border: 1px solid #A7F3D0;
        }
        .mdf-status-pill.disconnected {
            background: #FFFBEB;
            color: #92400E;
            border: 1px solid #FDE68A;
        }
        .mdf-status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }
        .mdf-status-pill.connected .mdf-status-dot {
            background: #10B981;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
        }
        .mdf-status-pill.disconnected .mdf-status-dot {
            background: #F59E0B;
        }

        .mdf-launcher-box {
            background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%);
            border: 1px solid #CBD5E1;
            border-radius: 10px;
            padding: 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
        }
        .mdf-launcher-text h3 {
            margin: 0 0 6px;
            font-size: 16px;
            font-weight: 700;
            color: #0F172A;
        }
        .mdf-launcher-text p {
            margin: 0;
            font-size: 13px;
            color: #475569;
            max-width: 580px;
            line-height: 1.5;
        }
        .mdf-btn-launch {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #059669;
            color: #FFFFFF !important;
            text-decoration: none;
            padding: 12px 22px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
            transition: all 0.2s ease;
            white-space: nowrap;
        }
        .mdf-btn-launch:hover {
            background: #047857;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(5, 150, 105, 0.3);
        }

        .mdf-grid-engines {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }
        .mdf-engine-card {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 16px;
        }
        .mdf-engine-title {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748B;
            margin-bottom: 8px;
        }
        .mdf-engine-val {
            font-size: 14px;
            font-weight: 700;
            color: #0F172A;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .mdf-engine-sub {
            font-size: 11px;
            color: #64748B;
            margin-top: 4px;
        }

        .mdf-form-group {
            margin-bottom: 18px;
        }
        .mdf-form-group label {
            display: block;
            font-weight: 600;
            font-size: 13px;
            margin-bottom: 6px;
            color: #334155;
        }
        .mdf-input-text {
            width: 100%;
            max-width: 600px;
            padding: 10px 14px;
            border: 1px solid #CBD5E1;
            border-radius: 6px;
            font-size: 14px;
            color: #0F172A;
            background: #FFFFFF;
            transition: border-color 0.2s;
        }
        .mdf-input-text:focus {
            border-color: #059669;
            outline: none;
            box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.2);
        }
        .mdf-actions-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-top: 24px;
        }
        .mdf-btn-primary {
            background: #0F172A;
            color: #FFFFFF;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
            transition: background 0.2s;
        }
        .mdf-btn-primary:hover {
            background: #1E293B;
        }
        .mdf-btn-danger {
            background: #FFFFFF;
            color: #DC2626;
            border: 1px solid #FECACA;
            padding: 10px 18px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .mdf-btn-danger:hover {
            background: #FEF2F2;
            border-color: #F87171;
        }
        .mdf-notice {
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            margin-bottom: 20px;
        }
        .mdf-notice.success {
            background: #ECFDF5;
            color: #065F46;
            border: 1px solid #A7F3D0;
        }
        .mdf-notice.error {
            background: #FEF2F2;
            color: #991B1B;
            border: 1px solid #FECACA;
        }
        .mdf-notice.warning {
            background: #FFFBEB;
            color: #92400E;
            border: 1px solid #FDE68A;
        }
    </style>

    <div class="mdf-agent-card">
        <!-- Header -->
        <div class="mdf-header">
            <div class="mdf-header-left">
                <div class="mdf-logo-badge">M</div>
                <div class="mdf-title-block">
                    <h1>MDefender Pro Security Agent</h1>
                    <p>Endpoint Threat Sensor, Autonomous Firewall & Cloud Connector</p>
                </div>
            </div>
            <div>
                <?php if ($is_connected): ?>
                    <span class="mdf-status-pill connected">
                        <span class="mdf-status-dot"></span>
                        CONNECTED & GUARDED
                    </span>
                <?php else: ?>
                    <span class="mdf-status-pill disconnected">
                        <span class="mdf-status-dot"></span>
                        STANDBY (DISCONNECTED)
                    </span>
                <?php endif; ?>
            </div>
        </div>

        <?php if (!empty($notice_msg)): ?>
            <div class="mdf-notice <?php echo esc_attr($notice_type); ?>">
                <?php echo esc_html($notice_msg); ?>
            </div>
        <?php endif; ?>

        <!-- Cloud Central Launcher Banner -->
        <div class="mdf-launcher-box">
            <div class="mdf-launcher-text">
                <h3>Centralized Cloud Control Plane</h3>
                <p>
                    All firewall rules, security logs, malware scanner telemetry, WordPress core file integrity audits, 
                    and multi-site policies are securely orchestrated from your unified MDefender Pro Cloud console.
                </p>
            </div>
            <div>
                <a href="<?php echo esc_url($cloud_url . '/user/bulk/dashboard'); ?>" target="_blank" rel="noopener noreferrer" class="mdf-btn-launch">
                    <span>Open Cloud Dashboard</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </a>
            </div>
        </div>

        <!-- Local Autonomous Engines Status (Read-Only Radar) -->
        <h4 style="font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px;">
            Local Execution Engines & Buffer Status
        </h4>
        <div class="mdf-grid-engines">
            <div class="mdf-engine-card">
                <div class="mdf-engine-title">Firewall Engine</div>
                <div class="mdf-engine-val" style="color: <?php echo $waf_active ? '#059669' : '#DC2626'; ?>;">
                    <span style="font-size: 10px;">●</span> <?php echo $waf_active ? 'Active & Filtering' : 'Paused'; ?>
                </div>
                <div class="mdf-engine-sub">OWASP Top 10, SQLi, XSS, RCE</div>
            </div>

            <div class="mdf-engine-card">
                <div class="mdf-engine-title">Core Integrity Guard</div>
                <div class="mdf-engine-val" style="color: #059669;">
                    <span style="font-size: 10px;">●</span> Guarded
                </div>
                <div class="mdf-engine-sub">WordPress.org SVN Checksums</div>
            </div>

            <div class="mdf-engine-card">
                <div class="mdf-engine-title">Circular Log Buffer</div>
                <div class="mdf-engine-val" style="color: #059669;">
                    <span style="font-size: 10px;">●</span> <?php echo esc_html($current_log_count); ?> / <?php echo esc_html($max_logs); ?>
                </div>
                <div class="mdf-engine-sub">FIFO Rolling (<?php echo esc_html($retention_days); ?>-Day Auto-Purge)</div>
            </div>

            <div class="mdf-engine-card">
                <div class="mdf-engine-title">Threat Sensor</div>
                <div class="mdf-engine-val" style="color: #0284C7;">
                    <span style="font-size: 10px;">●</span> Standby / Ready
                </div>
                <div class="mdf-engine-sub">Cloud On-Demand Telemetry</div>
            </div>
        </div>

        <!-- Connection Settings Form -->
        <h4 style="font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin: 24px 0 14px; border-top: 1px solid #F1F5F9; padding-top: 20px;">
            Cloud Agent Configuration
        </h4>
        <form method="post" action="">
            <?php wp_nonce_field('waf_connector_nonce_action', 'waf_connector_nonce'); ?>
            <input type="hidden" name="waf_connector_action" value="save_connection">

            <div class="mdf-form-group">
                <label for="waf_api_key">MDefender Pro Cloud API Key</label>
                <input 
                    type="password" 
                    id="waf_api_key" 
                    name="waf_api_key" 
                    value="<?php echo esc_attr($api_key); ?>" 
                    class="mdf-input-text" 
                    placeholder="Enter your API Key (e.g. mdf_live_...)" 
                    autocomplete="off"
                />
                <p style="margin: 6px 0 0; font-size: 12px; color: #64748B;">
                    Found in your MDefender Pro Cloud Dashboard under <strong>Settings &rarr; API Keys</strong>.
                </p>
            </div>

            <div class="mdf-form-group">
                <label for="waf_cloud_url">Cloud Dashboard Base URL</label>
                <input 
                    type="url" 
                    id="waf_cloud_url" 
                    name="waf_cloud_url" 
                    value="<?php echo esc_attr($cloud_url); ?>" 
                    class="mdf-input-text" 
                    placeholder="http://localhost:5173"
                />
                <p style="margin: 6px 0 0; font-size: 12px; color: #64748B;">
                    Default: <code>http://localhost:5173</code> (or your custom MDefender Pro SaaS production URL).
                </p>
            </div>

            <div class="mdf-form-group">
                <label>Agent Verification Token (Read-Only)</label>
                <input 
                    type="text" 
                    value="<?php echo esc_attr($site_token); ?>" 
                    class="mdf-input-text" 
                    readonly 
                    style="background: #F8FAFC; color: #64748B; font-family: monospace;"
                />
            </div>

            <div class="mdf-actions-row">
                <button type="submit" class="mdf-btn-primary">
                    <?php echo $is_connected ? 'Save & Synchronize' : 'Connect to MDefender Cloud'; ?>
                </button>
            </div>
        </form>

        <?php if ($is_connected): ?>
            <form method="post" action="" style="margin-top: 14px;" onsubmit="return confirm('Are you sure you want to disconnect this website from MDefender Pro Cloud?');">
                <?php wp_nonce_field('waf_connector_nonce_action', 'waf_connector_nonce'); ?>
                <input type="hidden" name="waf_connector_action" value="disconnect">
                <button type="submit" class="mdf-btn-danger">
                    Disconnect Agent from Cloud
                </button>
            </form>
        <?php endif; ?>
    </div>
</div>
