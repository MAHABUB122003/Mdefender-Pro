<?php
defined('ABSPATH') || exit('Access Denied');

/**
 * MDefender Pro - Enterprise Security Agent & Cloud Connector
 * 
 * Minimalist, ultra-lightweight agent interface for WordPress.
 * Complex fleet operations, rule authoring, live logs, and threat intelligence
 * are securely orchestrated from the central MDefender Pro Cloud Console.
 *
 * @package MDefender-Pro
 */

if (!current_user_can('manage_options')) {
    wp_die(esc_html__('You do not have sufficient permissions to access this page.', 'mdefender-pro'));
}

$notice_msg = '';
$notice_type = 'success';

// Fallback synchronous POST handler (for environments without JavaScript)
if (isset($_POST['waf_connector_action']) && check_admin_referer('waf_connector_nonce_action', 'waf_connector_nonce')) {
    $action = sanitize_text_field($_POST['waf_connector_action']);

    if ($action === 'save_connection') {
        $api_key = sanitize_text_field(trim($_POST['waf_api_key'] ?? ''));
        $cloud_url = esc_url_raw(trim($_POST['waf_cloud_url'] ?? ''));
        $allow_sso = !empty($_POST['waf_allow_cloud_sso']) ? 'yes' : 'no';
        update_option('waf_allow_cloud_sso', $allow_sso);

        if (empty($cloud_url)) {
            $is_local_host = in_array(strtolower($_SERVER['HTTP_HOST'] ?? ''), ['localhost', '127.0.0.1']) || strpos($_SERVER['HTTP_HOST'] ?? '', 'localhost') !== false;
            $cloud_url = $is_local_host ? 'http://127.0.0.1:8000' : 'https://mdefender-pro.crafix.tech';
        }

        if (empty($api_key) || strlen($api_key) < 16) {
            $notice_msg = __('Valid MDefender Pro API Key required (minimum 16 characters).', 'mdefender-pro');
            $notice_type = 'error';
        } else {
            $host = parse_url(home_url(), PHP_URL_HOST) ?: ($_SERVER['HTTP_HOST'] ?? 'localhost');
            $clean_host = preg_replace('/^www\./i', '', $host);
            $site_path = trim(parse_url(home_url(), PHP_URL_PATH) ?? '', '/');
            $clean_domain = (in_array(strtolower($clean_host), ['localhost', '127.0.0.1']) && !empty($site_path)) ? ($clean_host . '/' . $site_path) : $clean_host;

            $handshake_payload = [
                'api_key' => $api_key,
                'domain' => $clean_domain,
                'site_url' => home_url(),
                'home_url' => home_url(),
                'site_name' => get_bloginfo('name'),
                'wp_version' => get_bloginfo('version'),
                'php_version' => phpversion(),
                'plugin_version' => defined('WAF_FW_VERSION') ? WAF_FW_VERSION : '4.3.0'
            ];

            $response = wp_remote_post(rtrim($cloud_url, '/') . '/api/v1/wordpress/connect', [
                'timeout' => 15,
                'sslverify' => false,
                'headers' => [
                    'Content-Type' => 'application/json',
                    'Authorization' => 'Bearer ' . $api_key
                ],
                'body' => wp_json_encode($handshake_payload)
            ]);

            if (!is_wp_error($response)) {
                $code = wp_remote_retrieve_response_code($response);
                $body = wp_remote_retrieve_body($response);
                $decoded = json_decode($body, true);
                if ($code === 200 && !empty($decoded['data'])) {
                    $res_data = $decoded['data'];
                    update_option('waf_fw_api_key', $api_key);
                    update_option('waf_fw_ml_api_key', $api_key);
                    if (!empty($res_data['site_token'])) update_option('waf_fw_site_token', $res_data['site_token']);
                    if (!empty($res_data['website_id'])) update_option('waf_fw_website_id', $res_data['website_id']);
                    update_option('waf_fw_trial_days_remaining', intval($res_data['trial_days_remaining'] ?? 14));
                    update_option('waf_fw_subscription_status', $res_data['subscription_status'] ?? 'trial_active');
                    update_option('waf_fw_cloud_api_url', $cloud_url);
                    update_option('waf_fw_ml_api_url', $cloud_url);
                    update_option('waf_fw_connected', 'yes');
                    update_option('waf_fw_last_sync', current_time('mysql'));
                    if (class_exists('WAF_FW_Engine')) {
                        WAF_FW_Engine::instance()->export_fast_cache();
                    }
                    $notice_msg = __('Successfully paired with MDefender Pro Cloud Fleet! Enterprise protection active.', 'mdefender-pro');
                    $notice_type = 'success';
                } else {
                    $notice_msg = esc_html($decoded['detail'] ?? $decoded['message'] ?? 'Authentication failed. Please verify your API Key.');
                    $notice_type = 'error';
                }
            } else {
                $notice_msg = 'Connection error: ' . esc_html($response->get_error_message());
                $notice_type = 'error';
            }
        }
    } elseif ($action === 'disconnect') {
        $api_key = get_option('waf_fw_api_key', get_option('waf_fw_ml_api_key', ''));
        $cloud_url = get_option('waf_fw_cloud_api_url', 'https://mdefender-pro.crafix.tech');
        $site_token = get_option('waf_fw_site_token', '');
        $website_id = get_option('waf_fw_website_id', '');

        if (!empty($cloud_url)) {
            $host = parse_url(home_url(), PHP_URL_HOST) ?: ($_SERVER['HTTP_HOST'] ?? 'localhost');
            wp_remote_post(rtrim($cloud_url, '/') . '/api/v1/wordpress/disconnect', [
                'timeout' => 5,
                'sslverify' => false,
                'headers' => ['Content-Type' => 'application/json', 'Authorization' => 'Bearer ' . $api_key],
                'body' => wp_json_encode(['api_key' => $api_key, 'domain' => $host, 'website_id' => $website_id, 'site_token' => $site_token])
            ]);
        }

        delete_option('waf_fw_api_key');
        delete_option('waf_fw_ml_api_key');
        delete_option('waf_fw_site_token');
        delete_option('waf_fw_website_id');
        delete_option('waf_fw_trial_days_remaining');
        delete_option('waf_fw_subscription_status');
        delete_option('waf_allow_cloud_sso');
        delete_option('waf_fw_last_sync');
        delete_option('waf_fw_local_blacklist_cache');
        update_option('waf_fw_connected', 'no');
        wp_clear_scheduled_hook('waf_fw_cloud_heartbeat');
        if (class_exists('WAF_FW_Engine')) {
            WAF_FW_Engine::instance()->export_fast_cache();
        }
        $notice_msg = __('Disconnected from Cloud. Security agent is now dormant.', 'mdefender-pro');
        $notice_type = 'warning';
    }
}

$api_key = get_option('waf_fw_api_key', get_option('waf_fw_ml_api_key', ''));
$cloud_url = get_option('waf_fw_cloud_api_url', '');
if (empty($cloud_url)) {
    $is_local_host = in_array(strtolower($_SERVER['HTTP_HOST'] ?? ''), ['localhost', '127.0.0.1']) || strpos($_SERVER['HTTP_HOST'] ?? '', 'localhost') !== false;
    $cloud_url = $is_local_host ? 'http://127.0.0.1:8000' : 'https://mdefender-pro.crafix.tech';
    update_option('waf_fw_cloud_api_url', $cloud_url);
}
$is_connected = function_exists('waf_fw_is_cloud_active') ? waf_fw_is_cloud_active() : (get_option('waf_fw_connected', 'no') === 'yes' && !empty($api_key));
$trial_days = intval(get_option('waf_fw_trial_days_remaining', 14));
$sub_status = get_option('waf_fw_subscription_status', 'trial_active');

$last_sync = get_option('waf_fw_last_sync', '');
$last_sync_display = !empty($last_sync) ? date_i18n('M j, Y - H:i:s', strtotime($last_sync)) : __('Awaiting Sync', 'mdefender-pro');

$waf_active = get_option('waf_fw_protection_enabled', 'yes') === 'yes';
$max_logs = (int) get_option('waf_fw_recycle_max_logs', 2000);
global $wpdb;
$attacks_table = $wpdb->prefix . (defined('WAF_FW_TABLE_ATTACKS') ? WAF_FW_TABLE_ATTACKS : 'waf_attacks');
$current_log_count = (int) $wpdb->get_var("SELECT COUNT(*) FROM $attacks_table");
?>

<div class="wrap mdf-agent-wrap">
    <style>
        .mdf-agent-wrap {
            max-width: 920px;
            margin: 24px auto 40px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
            color: #0F172A;
        }
        .mdf-agent-card {
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            padding: 28px 32px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }
        .mdf-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid #F1F5F9;
            padding-bottom: 20px;
            margin-bottom: 22px;
            flex-wrap: wrap;
            gap: 16px;
        }
        .mdf-header-left {
            display: flex;
            align-items: center;
            gap: 14px;
        }
        .mdf-title-block h1 {
            font-size: 19px;
            font-weight: 700;
            margin: 0 0 3px;
            color: #0F172A;
            line-height: 1.2;
        }
        .mdf-title-block p {
            margin: 0;
            font-size: 12.5px;
            color: #64748B;
        }
        .mdf-status-pill {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            padding: 5px 13px;
            border-radius: 9999px;
            font-size: 11.5px;
            font-weight: 600;
            letter-spacing: 0.2px;
        }
        .mdf-status-pill.connected {
            background: #ECFDF5;
            color: #065F46;
            border: 1px solid #A7F3D0;
        }
        .mdf-status-pill.disconnected {
            background: #F8FAFC;
            color: #475569;
            border: 1px solid #CBD5E1;
        }
        .mdf-status-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
        }
        .mdf-status-pill.connected .mdf-status-dot {
            background: #10B981;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
        }
        .mdf-status-pill.disconnected .mdf-status-dot {
            background: #94A3B8;
        }

        .mdf-launcher-box {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 12px;
        }
        .mdf-launcher-text h3 {
            margin: 0 0 3px;
            font-size: 14px;
            font-weight: 700;
            color: #0F172A;
        }
        .mdf-launcher-text p {
            margin: 0;
            font-size: 12.5px;
            color: #64748B;
        }
        .mdf-btn-launch {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #FFFFFF;
            color: #0F172A !important;
            border: 1px solid #CBD5E1;
            text-decoration: none;
            padding: 8px 14px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 12.5px;
            transition: all 0.15s ease;
            white-space: nowrap;
        }
        .mdf-btn-launch:hover {
            background: #F1F5F9;
            border-color: #94A3B8;
        }

        .mdf-grid-engines {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
            gap: 12px;
            margin-bottom: 22px;
        }
        .mdf-engine-card {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 12px 14px;
        }
        .mdf-engine-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748B;
            margin-bottom: 4px;
        }
        .mdf-engine-val {
            font-size: 13.5px;
            font-weight: 700;
            color: #0F172A;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .mdf-form-section {
            border-top: 1px solid #F1F5F9;
            padding-top: 20px;
            margin-top: 20px;
        }
        .mdf-form-section-title {
            font-size: 13px;
            font-weight: 700;
            color: #334155;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 14px;
        }
        .mdf-input-text {
            width: 100%;
            padding: 9px 12px;
            border: 1px solid #CBD5E1;
            border-radius: 6px;
            font-size: 13.5px;
            color: #0F172A;
            background: #FFFFFF;
            transition: border-color 0.2s;
        }
        .mdf-input-text:focus {
            border-color: #059669;
            outline: none;
            box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.15);
        }
        .mdf-btn-save {
            background: #059669;
            color: #FFFFFF;
            border: none;
            padding: 9px 20px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.15s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        .mdf-btn-save:hover {
            background: #047857;
        }
        .mdf-btn-save:disabled {
            opacity: 0.65;
            cursor: not-allowed;
        }
        .mdf-btn-danger {
            background: #FFFFFF;
            color: #DC2626;
            border: 1px solid #FECACA;
            padding: 7px 14px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.15s ease;
        }
        .mdf-btn-danger:hover {
            background: #FEF2F2;
            border-color: #F87171;
        }
        .mdf-notice {
            padding: 10px 14px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
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
        @keyframes mdf-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .mdf-spinner {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid rgba(255, 255, 255, 0.35);
            border-radius: 50%;
            border-top-color: #FFFFFF;
            animation: mdf-spin 0.8s linear infinite;
        }
    </style>

    <div class="mdf-agent-card">
        <!-- Header -->
        <div class="mdf-header">
            <div class="mdf-header-left">
                <div style="display: flex; align-items: center;">
                    <img src="<?php echo esc_url(WAF_FW_PLUGIN_URL . 'assets/images/mdefender-logo.png'); ?>" alt="MDefender Pro" style="height: 34px; width: auto; max-width: 180px; object-fit: contain;" />
                </div>
                <div class="mdf-title-block">
                    <h1>MDefender Pro Security Agent</h1>
                    <p>Autonomous Endpoint Firewall &amp; Cloud Fleet Connector</p>
                </div>
            </div>
            <div id="mdf-status-container">
                <?php if ($is_connected): ?>
                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end;">
                        <span class="mdf-status-pill connected">
                            <span class="mdf-status-dot"></span>
                            CONNECTED &amp; GUARDED
                        </span>
                        <?php if ($sub_status === 'trial_active'): ?>
                            <span style="font-size: 11px; font-weight: 700; color: #0284C7; background: #E0F2FE; border: 1px solid #BAE6FD; padding: 4px 10px; border-radius: 999px;">
                                ⚡ Trial: <?php echo esc_html($trial_days); ?> Days Left
                            </span>
                        <?php elseif ($sub_status === 'pro' || $sub_status === 'active'): ?>
                            <span style="font-size: 11px; font-weight: 700; color: #059669; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 4px 10px; border-radius: 999px;">
                                ★ Enterprise Pro
                            </span>
                        <?php endif; ?>
                    </div>
                <?php else: ?>
                    <span class="mdf-status-pill disconnected">
                        <span class="mdf-status-dot"></span>
                        STANDBY (DISCONNECTED)
                    </span>
                <?php endif; ?>
            </div>
        </div>

        <!-- Dynamic Notice Box -->
        <div id="mdf-dynamic-notice" style="<?php echo empty($notice_msg) ? 'display: none;' : ''; ?>">
            <?php if (!empty($notice_msg)): ?>
                <div class="mdf-notice <?php echo esc_attr($notice_type); ?>">
                    <?php echo esc_html($notice_msg); ?>
                </div>
            <?php endif; ?>
        </div>

        <!-- Cloud Central Launcher Banner -->
        <div class="mdf-launcher-box">
            <div class="mdf-launcher-text">
                <h3>Cloud Security Console</h3>
                <p>Manage firewall policies, live threat telemetry, and multi-site fleet rules centrally.</p>
            </div>
            <div>
                <a href="<?php echo esc_url($cloud_url . '/user/bulk/dashboard'); ?>" target="_blank" rel="noopener noreferrer" class="mdf-btn-launch">
                    <span>Open Cloud Dashboard</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </a>
            </div>
        </div>

        <!-- Local Autonomous Engines Status (Clean KPI Tiles) -->
        <h4 style="font-size: 11.5px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px;">
            Execution Engines &amp; Buffer Status
        </h4>
        <div class="mdf-grid-engines">
            <div class="mdf-engine-card">
                <div class="mdf-engine-title">Firewall Engine</div>
                <div class="mdf-engine-val" style="color: <?php echo $waf_active ? '#059669' : '#DC2626'; ?>;">
                    <span style="font-size: 9px;">●</span> <?php echo $waf_active ? 'Active &amp; Filtering' : 'Paused'; ?>
                </div>
            </div>

            <div class="mdf-engine-card">
                <div class="mdf-engine-title">Core Integrity Guard</div>
                <div class="mdf-engine-val" style="color: #059669;">
                    <span style="font-size: 9px;">●</span> Protected
                </div>
            </div>

            <div class="mdf-engine-card">
                <div class="mdf-engine-title">Circular Log Buffer</div>
                <div class="mdf-engine-val" style="color: #059669;">
                    <span style="font-size: 9px;">●</span> <?php echo esc_html($current_log_count); ?> / <?php echo esc_html($max_logs); ?>
                </div>
            </div>

            <div class="mdf-engine-card">
                <div class="mdf-engine-title">Threat Sensor</div>
                <div class="mdf-engine-val" style="color: #0284C7;">
                    <span style="font-size: 9px;">●</span> Operational
                </div>
            </div>
        </div>

        <!-- Connection Settings Form -->
        <div class="mdf-form-section">
            <h4 class="mdf-form-section-title">Cloud Agent Activation</h4>
            <form id="mdf-connect-form" method="post" action="">
                <?php wp_nonce_field('waf_connector_nonce_action', 'waf_connector_nonce'); ?>
                <input type="hidden" name="waf_connector_action" value="save_connection">
                <input type="hidden" name="waf_cloud_url" value="<?php echo esc_attr($cloud_url); ?>">

                <div style="margin-bottom: 16px;">
                    <label for="waf_api_key" style="display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 13px; margin-bottom: 6px; color: #334155;">
                        <span>MDefender Cloud API Key</span>
                        <a href="<?php echo esc_url($cloud_url . '/user/bulk/dashboard'); ?>" target="_blank" rel="noopener noreferrer" style="font-size: 11.5px; font-weight: 600; color: #059669; text-decoration: none;">
                            Get API Key &rarr;
                        </a>
                    </label>
                    <div style="display: flex; gap: 8px; max-width: 620px;">
                        <input 
                            type="password" 
                            id="waf_api_key" 
                            name="waf_api_key" 
                            value="<?php echo esc_attr($api_key); ?>" 
                            class="mdf-input-text" 
                            placeholder="Paste your MDefender Pro API Key (e.g. mdf_...)" 
                            autocomplete="off"
                            style="flex: 1;"
                            required
                        />
                        <button type="button" id="mdf-toggle-key-btn" style="padding: 0 14px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; color: #475569;">
                            Show
                        </button>
                    </div>
                    <p style="margin: 6px 0 0; font-size: 11.5px; color: #64748B;">
                        Enter your API key from the central MDefender Pro dashboard to pair this site.
                    </p>
                </div>

                <!-- Clean, Minimal Admin Remote Access (SSO) Box -->
                <div style="margin: 16px 0 20px; padding: 14px 16px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; max-width: 620px;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <label for="waf_allow_cloud_sso" style="font-size: 13px; font-weight: 600; color: #0F172A; cursor: pointer;">
                            Remote Dashboard Admin Access
                        </label>
                        <label style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12.5px; font-weight: 600; color: #1E293B;">
                            <input type="checkbox" id="waf_allow_cloud_sso" name="waf_allow_cloud_sso" value="1" <?php checked(get_option('waf_allow_cloud_sso', 'yes'), 'yes'); ?> style="width: 16px; height: 16px; accent-color: #059669;" />
                            <span>Enabled</span>
                        </label>
                    </div>
                    <p style="margin: 4px 0 0; font-size: 11.5px; color: #64748B;">
                        Allow verified workspace administrators to access this WordPress dashboard from MDefender Cloud.
                    </p>
                </div>

                <div>
                    <button type="submit" id="mdf-submit-btn" class="mdf-btn-save">
                        <span id="mdf-btn-spinner" class="mdf-spinner" style="display: none;"></span>
                        <span id="mdf-btn-text"><?php echo $is_connected ? 'Save &amp; Sync Connection' : 'Connect to MDefender Cloud'; ?></span>
                    </button>
                </div>
            </form>
        </div>

        <?php if ($is_connected): ?>
            <div id="mdf-disconnect-row" style="margin-top: 22px; padding-top: 18px; border-top: 1px dashed #E2E8F0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div style="font-size: 11.5px; color: #64748B;">
                    Last fleet heartbeat: <strong id="mdf-last-sync-text"><?php echo esc_html($last_sync_display); ?></strong>
                </div>
                <form id="mdf-disconnect-form" method="post" action="">
                    <?php wp_nonce_field('waf_connector_nonce_action', 'waf_connector_nonce'); ?>
                    <input type="hidden" name="waf_connector_action" value="disconnect">
                    <button type="submit" id="mdf-disconnect-btn" class="mdf-btn-danger">
                        Disconnect Agent from Cloud
                    </button>
                </form>
            </div>
        <?php endif; ?>
    </div>
</div>

<script>
(function() {
    // 1. Password Visibility Toggle
    var toggleBtn = document.getElementById('mdf-toggle-key-btn');
    var keyInput = document.getElementById('waf_api_key');
    if (toggleBtn && keyInput) {
        toggleBtn.addEventListener('click', function() {
            if (keyInput.type === 'password') {
                keyInput.type = 'text';
                toggleBtn.textContent = 'Hide';
            } else {
                keyInput.type = 'password';
                toggleBtn.textContent = 'Show';
            }
        });
    }

    // Dynamic notification display helper
    function showNotification(type, message) {
        var box = document.getElementById('mdf-dynamic-notice');
        if (!box) return;
        box.innerHTML = '<div class="mdf-notice ' + type + '">' + message + '</div>';
        box.style.display = 'block';
    }

    // 2. Seamless AJAX Connect / Save (NO WHITE SCREEN RELOAD)
    var connectForm = document.getElementById('mdf-connect-form');
    var submitBtn = document.getElementById('mdf-submit-btn');
    var btnSpinner = document.getElementById('mdf-btn-spinner');
    var btnText = document.getElementById('mdf-btn-text');

    if (connectForm && submitBtn) {
        connectForm.addEventListener('submit', function(e) {
            e.preventDefault();

            var apiKey = keyInput ? keyInput.value.trim() : '';
            if (!apiKey || apiKey.length < 16) {
                showNotification('error', 'Valid MDefender Pro API Key required (minimum 16 characters).');
                return;
            }

            // Set loading state
            submitBtn.disabled = true;
            if (btnSpinner) btnSpinner.style.display = 'inline-block';
            var originalText = btnText ? btnText.textContent : 'Save';
            if (btnText) btnText.textContent = 'Connecting to MDefender Cloud...';

            var formData = new FormData(connectForm);
            formData.append('action', 'waf_connector_save_connection');

            fetch(ajaxurl, {
                method: 'POST',
                body: formData
            })
            .then(function(res) { return res.json(); })
            .then(function(json) {
                submitBtn.disabled = false;
                if (btnSpinner) btnSpinner.style.display = 'none';

                if (json && json.success) {
                    if (btnText) btnText.textContent = '✓ Connected & Synchronized!';
                    showNotification('success', json.data.message || 'Successfully paired with MDefender Pro Cloud Fleet!');

                    // Update UI status pill smoothly
                    var statusContainer = document.getElementById('mdf-status-container');
                    if (statusContainer) {
                        statusContainer.innerHTML = '<div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end;">' +
                            '<span class="mdf-status-pill connected"><span class="mdf-status-dot"></span> CONNECTED &amp; GUARDED</span>' +
                            '<span style="font-size: 11px; font-weight: 700; color: #0284C7; background: #E0F2FE; border: 1px solid #BAE6FD; padding: 4px 10px; border-radius: 999px;">⚡ Trial: ' + (json.data.trial_days || 14) + ' Days Left</span>' +
                            '</div>';
                    }

                    // Smooth reload after 1.2s to render any newly unlocked options
                    setTimeout(function() {
                        window.location.reload();
                    }, 1200);
                } else {
                    if (btnText) btnText.textContent = originalText;
                    var errMsg = (json && json.data && json.data.message) ? json.data.message : 'Authentication failed. Please verify your API Key.';
                    showNotification('error', errMsg);
                }
            })
            .catch(function(err) {
                submitBtn.disabled = false;
                if (btnSpinner) btnSpinner.style.display = 'none';
                if (btnText) btnText.textContent = originalText;
                showNotification('error', 'Network error communicating with WordPress. Please try again.');
            });
        });
    }

    // 3. Seamless AJAX Disconnect
    var disconnectForm = document.getElementById('mdf-disconnect-form');
    var disconnectBtn = document.getElementById('mdf-disconnect-btn');
    if (disconnectForm && disconnectBtn) {
        disconnectForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (!confirm('Are you sure you want to disconnect this website from MDefender Pro Cloud?')) {
                return;
            }

            disconnectBtn.disabled = true;
            disconnectBtn.textContent = 'Disconnecting...';

            var formData = new FormData(disconnectForm);
            formData.append('action', 'waf_connector_disconnect');

            fetch(ajaxurl, {
                method: 'POST',
                body: formData
            })
            .then(function(res) { return res.json(); })
            .then(function(json) {
                if (json && json.success) {
                    showNotification('warning', json.data.message || 'Agent disconnected.');
                    setTimeout(function() {
                        window.location.reload();
                    }, 1000);
                } else {
                    disconnectBtn.disabled = false;
                    disconnectBtn.textContent = 'Disconnect Agent from Cloud';
                    showNotification('error', (json && json.data && json.data.message) ? json.data.message : 'Disconnect failed.');
                }
            })
            .catch(function() {
                disconnectBtn.disabled = false;
                disconnectBtn.textContent = 'Disconnect Agent from Cloud';
                showNotification('error', 'Network error.');
            });
        });
    }
})();
</script>
