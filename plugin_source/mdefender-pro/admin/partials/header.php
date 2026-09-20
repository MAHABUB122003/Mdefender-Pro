<?php
if (!defined('ABSPATH')) exit;

global $wpdb;

$is_enabled = (bool) get_option('waf_fw_enabled', 1);
$is_cloud_connected = (bool) get_option('waf_fw_cloud_connected', 0);
$cloud_mode = get_option('waf_fw_cloud_mode', 'protect');
$current_user = wp_get_current_user();
$user_initial = $current_user && $current_user->display_name ? strtoupper(substr($current_user->display_name, 0, 1)) : 'A';
$user_name = $current_user && $current_user->display_name ? esc_html($current_user->display_name) : 'Admin';

// Fetch recent real notifications from database
$notif_items = [];
$table_attacks = $wpdb->prefix . 'waf_attacks';
if ($wpdb->get_var("SHOW TABLES LIKE '{$table_attacks}'") === $table_attacks) {
    $recent_threats = $wpdb->get_results("SELECT id, attack_type, ip, status, created_at FROM {$table_attacks} ORDER BY id DESC LIMIT 5", ARRAY_A);
    if (!empty($recent_threats)) {
        foreach ($recent_threats as $t) {
            $is_block = ($t['status'] === 'blocked' || $t['status'] === 'drop');
            $time_ago = human_time_diff(strtotime($t['created_at']), current_time('timestamp')) . ' ago';
            $notif_items[] = [
                'type'    => $is_block ? 'critical' : 'info',
                'icon'    => $is_block ? 'dashicons-shield-alt' : 'dashicons-yes-alt',
                'title'   => esc_html($t['attack_type'] ?: 'Security Event'),
                'sub'     => esc_html(($is_block ? 'Blocked from: ' : 'Activity from: ') . ($t['ip'] ?: 'unknown')),
                'time'    => $time_ago,
                'link'    => admin_url('admin.php?page=waf-firewall-logs')
            ];
        }
    }
}

if (empty($notif_items)) {
    $notif_items[] = [
        'type'  => 'info',
        'icon'  => 'dashicons-shield',
        'title' => 'System Guard Active',
        'sub'   => 'Neural WAF & 27,272 signatures protecting your site',
        'time'  => 'Just now',
        'link'  => admin_url('admin.php?page=waf-firewall')
    ];
}
?>
<div class="war-wrap">
    <!-- Clean, Sleek Enterprise Top Bar -->
    <div class="war-top-bar">
        <div class="war-top-left">
            <div class="war-logo">
                <span class="war-logo-icon dashicons dashicons-shield"></span>
                <span class="war-logo-text">MDefender<span class="war-logo-highlight">-Pro</span></span>
            </div>
            <div class="war-version">v<?php echo defined('WAF_FW_VERSION') ? esc_html(WAF_FW_VERSION) : '4.1.0'; ?></div>
            <div class="war-cloud-status-badge <?php echo $is_cloud_connected ? 'cloud-active' : 'local-active'; ?>" id="warHeaderCloudStatus">
                <span class="war-status-dot"></span>
                <span class="war-status-text"><?php echo $is_cloud_connected ? 'Cloud AI Active (' . esc_html(ucfirst($cloud_mode)) . ')' : 'Local Guard Active'; ?></span>
            </div>
        </div>

        <div class="war-top-center">
            <span class="war-top-tagline">AI/ML-Powered Web Application Firewall &amp; Enterprise Malware Scanner</span>
        </div>

        <div class="war-top-right">
            <!-- Master Protection Toggle -->
            <div class="war-toggle-wrap" title="Master WAF & Malware Protection Switch">
                <span class="war-toggle-label">Protection</span>
                <label class="war-toggle">
                    <input type="checkbox" id="warProtectionToggle" <?php checked($is_enabled); ?>>
                    <span class="war-toggle-slider"></span>
                </label>
                <span class="war-toggle-status <?php echo $is_enabled ? 'status-active' : 'status-inactive'; ?>" id="warToggleStatus">
                    <?php echo $is_enabled ? 'Active' : 'Inactive'; ?>
                </span>
            </div>

            <!-- Refresh Button -->
            <button class="war-top-btn" id="warRefreshBtn" title="Sync Threat Intelligence & Refresh Data">
                <span class="dashicons dashicons-update"></span>
            </button>

            <!-- Notifications Center -->
            <div class="war-notif-wrap">
                <button class="war-top-btn war-notif-btn" id="warNotifBtn" title="Security Alerts">
                    <span class="dashicons dashicons-bell"></span>
                    <?php if (count($notif_items) > 0): ?>
                        <span class="war-notif-dot"></span>
                    <?php endif; ?>
                </button>
                <div class="war-notif-panel" id="warNotifPanel">
                    <div class="war-notif-header">
                        <span>Security Alerts</span>
                        <span class="war-notif-count"><?php echo count($notif_items); ?> new</span>
                    </div>
                    <div class="war-notif-body">
                        <?php foreach ($notif_items as $item): ?>
                            <a href="<?php echo esc_url($item['link']); ?>" class="war-notif-item war-notif-<?php echo esc_attr($item['type']); ?>">
                                <div class="war-notif-icon-box">
                                    <span class="dashicons <?php echo esc_attr($item['icon']); ?>"></span>
                                </div>
                                <div class="war-notif-content">
                                    <strong><?php echo esc_html($item['title']); ?></strong>
                                    <small><?php echo esc_html($item['sub']); ?></small>
                                </div>
                                <span class="war-notif-time"><?php echo esc_html($item['time']); ?></span>
                            </a>
                        <?php endforeach; ?>
                    </div>
                    <div class="war-notif-footer">
                        <a href="<?php echo esc_url(admin_url('admin.php?page=waf-firewall-logs')); ?>">View full security logs &rarr;</a>
                    </div>
                </div>
            </div>

            <!-- User Avatar & Profile Link -->
            <div class="war-user-dropdown" id="warUserDropdown" title="WordPress User Profile">
                <div class="war-avatar"><?php echo esc_html($user_initial); ?></div>
                <span class="war-user-name"><?php echo esc_html($user_name); ?></span>
            </div>
        </div>
    </div>

    <!-- Sub-Header / Telemetry Bar -->
    <div class="war-sub-header">
        <div class="war-breadcrumb">
            <span class="dashicons dashicons-shield"></span>
            <span>MDefender-Pro</span>
            <span class="war-breadcrumb-sep">/</span>
            <span class="war-breadcrumb-current"><?php echo esc_html(get_admin_page_title() ?: 'Dashboard'); ?></span>
        </div>
        <div class="war-sub-header-right">
            <div class="war-live-indicator">
                <span class="war-live-dot"></span>
                <span>System Guard Live</span>
            </div>
            <span class="war-clock" id="warClock">--:--:--</span>
        </div>
    </div>
