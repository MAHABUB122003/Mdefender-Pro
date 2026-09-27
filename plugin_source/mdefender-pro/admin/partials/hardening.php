<?php
defined('ABSPATH') || exit;

$hardening = WAF_FW_Website_Hardening::instance();
$report = $hardening->generate_report();
$statuses = $hardening->get_status();
$features = $hardening->get_all_features();

$score = $report['score'] ?? 0;
$grade = $report['grade'] ?? 'F';
$enabled_count = $report['enabled_count'] ?? 0;
$total_features = $report['total_features'] ?? 16;

$feature_categories = [
    'admin_protect'      => 'core',
    'login_protect'      => 'core',
    'wp_config'          => 'core',
    'user_accounts'      => 'core',
    'version_hiding'     => 'core',
    'htaccess'           => 'files',
    'uploads'            => 'files',
    'sensitive_files'    => 'files',
    'file_perms'         => 'files',
    'rest_api'           => 'network',
    'xmlrpc'             => 'network',
    'php_files'          => 'network',
    'security_headers'   => 'network',
    'backup'             => 'storage',
    'plugin_theme'       => 'storage',
    'directory_browsing' => 'storage',
];

$feature_icons = [
    'admin_protect'      => 'dashicons-admin-users',
    'login_protect'      => 'dashicons-lock',
    'wp_config'          => 'dashicons-admin-settings',
    'htaccess'           => 'dashicons-admin-tools',
    'uploads'            => 'dashicons-upload',
    'sensitive_files'    => 'dashicons-shield',
    'rest_api'           => 'dashicons-rest-api',
    'xmlrpc'             => 'dashicons-admin-plugins',
    'php_files'          => 'dashicons-editor-code',
    'file_perms'         => 'dashicons-admin-generic',
    'security_headers'   => 'dashicons-shield-alt',
    'user_accounts'      => 'dashicons-groups',
    'backup'             => 'dashicons-backup',
    'plugin_theme'       => 'dashicons-admin-appearance',
    'directory_browsing' => 'dashicons-admin-collapse',
    'version_hiding'     => 'dashicons-hidden',
];
?>

<div class="war-harden-container">
    <!-- Hero Header -->
    <div class="war-harden-hero">
        <div class="war-harden-hero-left">
            <div class="war-harden-badge-pill">
                <span class="dashicons dashicons-shield"></span>
                <span>ENTERPRISE DEFENSE MATRIX</span>
            </div>
            <h2 class="war-harden-title">Website Security Hardening</h2>
            <p class="war-harden-subtitle">
                Enforce 16 rigorous security controls to lock down WordPress core architecture, file permissions, HTTP headers, and authentication endpoints against automated exploits.
            </p>
        </div>
        <div class="war-harden-hero-actions">
            <button type="button" class="war-btn-harden war-btn-emerald" id="wafHardenOneClick">
                <span class="dashicons dashicons-shield"></span>
                <span>1-Click Harden Site</span>
            </button>
            <button type="button" class="war-btn-harden war-btn-slate" id="wafHardenReport">
                <span class="dashicons dashicons-clipboard"></span>
                <span>Audit Report</span>
            </button>
            <button type="button" class="war-btn-harden war-btn-light" id="wafHardenRefreshStatus" title="Refresh Live State">
                <span class="dashicons dashicons-update"></span>
                <span>Refresh</span>
            </button>
        </div>
    </div>

    <!-- Live Telemetry KPI Cards -->
    <div class="war-harden-kpi-grid">
        <div class="war-kpi-card war-kpi-grade">
            <div class="war-kpi-inner">
                <div class="war-grade-circle war-grade-<?php echo strtolower(esc_attr($grade)); ?>" id="wafHardenGradeBadge">
                    <?php echo esc_html($grade); ?>
                </div>
                <div class="war-kpi-text">
                    <span class="war-kpi-label">Security Grade</span>
                    <strong class="war-kpi-status-text" id="wafGradeLabel"><?php echo $grade === 'A' ? 'Maximum Protection' : ($grade === 'B' ? 'High Security' : 'Action Recommended'); ?></strong>
                </div>
            </div>
            <div class="war-kpi-bar-bg"><div class="war-kpi-bar-fill" id="wafGradeBar" style="width: <?php echo esc_attr($score); ?>%;"></div></div>
        </div>

        <div class="war-kpi-card war-kpi-score">
            <div class="war-kpi-inner">
                <div class="war-kpi-metric">
                    <span class="war-kpi-number" id="wafHardenScoreValue"><?php echo esc_html($score); ?></span>
                    <span class="war-kpi-total">/ 100</span>
                </div>
                <div class="war-kpi-text">
                    <span class="war-kpi-label">Hardening Score</span>
                    <strong class="war-kpi-subtext">Automated Defense Index</strong>
                </div>
            </div>
            <div class="war-kpi-bar-bg"><div class="war-kpi-bar-fill war-fill-blue" id="wafScoreBar" style="width: <?php echo esc_attr($score); ?>%;"></div></div>
        </div>

        <div class="war-kpi-card war-kpi-rules">
            <div class="war-kpi-inner">
                <div class="war-kpi-metric">
                    <span class="war-kpi-number war-emerald-text" id="wafHardenEnabledCount"><?php echo esc_html($enabled_count . '/' . $total_features); ?></span>
                </div>
                <div class="war-kpi-text">
                    <span class="war-kpi-label">Active Rules</span>
                    <strong class="war-kpi-subtext">16 Standard Policies</strong>
                </div>
            </div>
            <div class="war-kpi-bar-bg"><div class="war-kpi-bar-fill war-fill-emerald" id="wafRulesBar" style="width: <?php echo esc_attr(($enabled_count / max(1, $total_features)) * 100); ?>%;"></div></div>
        </div>
    </div>

    <!-- Navigation & Filter Tabs -->
    <div class="war-harden-tabs-nav">
        <button type="button" class="war-harden-tab active" data-section="waf-harden-features" data-filter="all">
            <span class="dashicons dashicons-admin-tools"></span>
            <span>All Measures (16)</span>
        </button>
        <button type="button" class="war-harden-tab" data-section="waf-harden-features" data-filter="core">
            <span class="dashicons dashicons-admin-users"></span>
            <span>Core &amp; Admin (5)</span>
        </button>
        <button type="button" class="war-harden-tab" data-section="waf-harden-features" data-filter="files">
            <span class="dashicons dashicons-media-document"></span>
            <span>Files &amp; Uploads (4)</span>
        </button>
        <button type="button" class="war-harden-tab" data-section="waf-harden-features" data-filter="network">
            <span class="dashicons dashicons-rest-api"></span>
            <span>Network &amp; Headers (4)</span>
        </button>
        <button type="button" class="war-harden-tab" data-section="waf-harden-features" data-filter="storage">
            <span class="dashicons dashicons-backup"></span>
            <span>Backups &amp; Misc (3)</span>
        </button>
        <button type="button" class="war-harden-tab" data-section="waf-harden-admin-ip" data-filter="custom">
            <span class="dashicons dashicons-lock"></span>
            <span>Admin IP &amp; Whitelist</span>
        </button>
        <button type="button" class="war-harden-tab" data-section="waf-harden-settings" data-filter="custom">
            <span class="dashicons dashicons-admin-generic"></span>
            <span>Global Preferences</span>
        </button>
    </div>

    <!-- SECTION 1: 16 Hardening Features Cards -->
    <div id="waf-harden-features" class="war-harden-section active">
        <div class="war-harden-grid">
            <?php
            foreach ($features as $key => $label):
                $info = $statuses[$key] ?? ['status' => 'disabled', 'settings' => []];
                $enabled = ($info['status'] === 'enabled');
                $settings = $info['settings'] ?? [];
                $icon = $feature_icons[$key] ?? 'dashicons-shield';
                $category = $feature_categories[$key] ?? 'core';
            ?>
            <div class="war-harden-card <?php echo $enabled ? 'is-active-rule' : 'is-inactive-rule'; ?>" 
                 data-feature="<?php echo esc_attr($key); ?>" 
                 data-category="<?php echo esc_attr($category); ?>">
                
                <div class="war-harden-card-header">
                    <div class="war-card-header-main">
                        <div class="war-card-icon-wrap <?php echo $enabled ? 'icon-active' : ''; ?>">
                            <span class="dashicons <?php echo esc_attr($icon); ?>"></span>
                        </div>
                        <div class="war-card-title-group">
                            <h3 class="war-card-title"><?php echo esc_html($label); ?></h3>
                            <div class="war-card-badges">
                                <span class="war-status-badge <?php echo $enabled ? 'badge-enabled' : 'badge-disabled'; ?>">
                                    <?php echo $enabled ? '● ENABLED' : 'RECOMMENDED'; ?>
                                </span>
                                <span class="war-cat-tag"><?php echo esc_html(strtoupper($category)); ?></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="war-toggle-wrap-sm">
                        <label class="war-switch-toggle" title="Toggle <?php echo esc_attr($label); ?>">
                            <input type="checkbox" <?php checked($enabled); ?> class="war-feature-switch">
                            <span class="war-switch-slider"></span>
                        </label>
                    </div>
                </div>

                <div class="war-harden-card-body <?php echo $enabled ? 'active' : ''; ?>">
                    <?php $this->render_feature_settings($key, $label, $settings); ?>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- SECTION 2: Admin IP & Country Whitelist -->
    <div id="waf-harden-admin-ip" class="war-harden-section" style="display:none;">
        <div class="war-admin-whitelist-card">
            <div class="war-whitelist-header">
                <div class="war-whitelist-icon">
                    <span class="dashicons dashicons-lock"></span>
                </div>
                <div>
                    <h3 class="war-whitelist-title">Admin Panel IP &amp; Geo-Fencing</h3>
                    <p class="war-whitelist-desc">Restrict sensitive administration endpoints (<code>/wp-admin/</code> &amp; <code>wp-login.php</code>) exclusively to verified IP ranges or countries.</p>
                </div>
            </div>

            <div class="war-whitelist-toggle-row">
                <label class="war-switch-toggle">
                    <input type="checkbox" id="wafAdminIpEnabled" <?php checked(WAF_FW_Admin_Panel_IP::instance()->is_enabled()); ?>>
                    <span class="war-switch-slider"></span>
                </label>
                <div>
                    <strong>Enforce Strict Admin Endpoint Access Control</strong>
                    <p>When active, any unauthorized connection attempt receives an instant HTTP 403 Forbidden firewall drop.</p>
                </div>
            </div>

            <div class="war-form-group">
                <label class="war-form-label">Whitelisted Admin IP Addresses &amp; Subnets</label>
                <p class="war-form-help">Enter one IP per line. Fully supports single IPs (e.g. <code>127.0.0.1</code>), CIDR notation (e.g. <code>192.168.1.0/24</code>), and wildcard masks (<code>103.151.30.*</code>).</p>
                <textarea id="wafAdminIpWhitelist" rows="5" class="war-textarea" placeholder="127.0.0.1&#10;192.168.1.0/24"><?php echo esc_textarea(get_option('waf_harden_admin_whitelist', '')); ?></textarea>
            </div>

            <div class="war-form-group">
                <label class="war-form-label">Blocked Admin Geolocation Countries</label>
                <p class="war-form-help">Comma-separated ISO 3166-1 alpha-2 country codes to prohibit from accessing authentication routes (e.g., <code>CN, RU, KP, IR</code>).</p>
                <input type="text" id="wafAdminIpCountries" value="<?php echo esc_attr(get_option('waf_harden_admin_blocked_countries', '')); ?>" placeholder="CN, RU, KP, IR" class="war-input">
            </div>

            <div class="war-whitelist-footer">
                <button type="button" class="war-btn-harden war-btn-emerald" id="wafSaveAdminIp">
                    <span class="dashicons dashicons-saved"></span>
                    <span>Save IP &amp; Geo Restrictions</span>
                </button>
            </div>
        </div>
    </div>

    <!-- SECTION 3: Global Preferences -->
    <div id="waf-harden-settings" class="war-harden-section" style="display:none;">
        <div class="war-admin-whitelist-card">
            <div class="war-whitelist-header">
                <div class="war-whitelist-icon icon-blue">
                    <span class="dashicons dashicons-admin-generic"></span>
                </div>
                <div>
                    <h3 class="war-whitelist-title">Global Hardening Preferences</h3>
                    <p class="war-whitelist-desc">Configure automated safety backups and administrator alerts during rule modifications.</p>
                </div>
            </div>

            <form id="wafHardenGlobalSettings">
                <div class="war-pref-item">
                    <label class="war-checkbox-row">
                        <input type="checkbox" id="wafHardenAutoBackup" value="1" checked class="war-custom-checkbox">
                        <span class="war-checkbox-text"><strong>Automated Pre-Execution Safety Backups</strong><br><small style="color:#64748b;">Automatically snapshot <code>wp-config.php</code> and <code>.htaccess</code> before applying rules.</small></span>
                    </label>
                </div>

                <div class="war-pref-item">
                    <label class="war-checkbox-row">
                        <input type="checkbox" id="wafHardenNotifyOnChange" value="1" class="war-custom-checkbox">
                        <span class="war-checkbox-text"><strong>Administrator Security Alerts</strong><br><small style="color:#64748b;">Dispatch an instant email alert if security configurations are altered.</small></span>
                    </label>
                </div>

                <div class="war-form-group" style="margin-top: 20px;">
                    <label class="war-form-label">Security Notification Email</label>
                    <input type="email" id="wafHardenNotifyEmail" value="<?php echo esc_attr(get_option('admin_email')); ?>" class="war-input">
                </div>

                <div class="war-whitelist-footer">
                    <button type="submit" class="war-btn-harden war-btn-emerald">
                        <span class="dashicons dashicons-saved"></span>
                        <span>Save Preferences</span>
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- AUDIT REPORT MODAL -->
<div id="wafHardenAuditModal" class="war-modal-backdrop" style="display:none;">
    <div class="war-modal-window">
        <div class="war-modal-header">
            <div class="war-modal-title-wrap">
                <span class="dashicons dashicons-clipboard"></span>
                <h3>Enterprise Website Hardening Audit Report</h3>
            </div>
            <button type="button" class="war-modal-close" id="wafCloseAuditModal">&times;</button>
        </div>
        <div class="war-modal-body" id="wafAuditModalContent">
            <!-- Populated via AJAX -->
            <div style="text-align:center;padding:40px;">
                <span class="dashicons dashicons-update war-spin-icon" style="font-size:32px;width:32px;height:32px;color:#2563eb;"></span>
                <p style="margin-top:12px;color:#64748b;font-weight:600;">Generating comprehensive security audit...</p>
            </div>
        </div>
        <div class="war-modal-footer">
            <button type="button" class="war-btn-harden war-btn-emerald" id="wafModalApplyAll">
                <span class="dashicons dashicons-shield"></span>
                <span>Apply All Recommended Fixes</span>
            </button>
            <button type="button" class="war-btn-harden war-btn-light" id="wafCloseAuditModalBtn">Close</button>
        </div>
    </div>
</div>

<!-- Toast Container -->
<div id="wafHardenToast" class="war-harden-toast" style="display:none;"></div>
