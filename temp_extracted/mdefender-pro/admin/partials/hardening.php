<?php defined('ABSPATH') || exit; ?>

<div class="war-harden-header" style="margin-bottom:24px;">
    <div class="war-harden-header-left">
        <h2 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 4px;letter-spacing:-0.4px;">Website Security Hardening</h2>
        <p style="margin:0;font-size:13px;color:#64748b;">Enforce 16 enterprise-grade security rules to lock down WordPress core, file permissions, headers, and admin endpoints.</p>
    </div>
    <div class="war-harden-actions" style="display:flex;gap:10px;">
        <button type="button" class="button button-primary" id="wafHardenOneClick" style="height:38px;padding:0 20px;font-weight:700;font-size:13px;background:linear-gradient(135deg,#10b981,#059669);border-color:#059669;border-radius:8px;display:inline-flex;align-items:center;gap:6px;">
            <span class="dashicons dashicons-shield" style="font-size:16px;width:16px;height:16px;"></span> 1-Click Harden Site
        </button>
        <button type="button" class="button" id="wafHardenReport" style="height:38px;padding:0 16px;font-size:13px;border-radius:8px;display:inline-flex;align-items:center;gap:6px;">
            <span class="dashicons dashicons-list-view" style="font-size:16px;width:16px;height:16px;"></span> Audit Report
        </button>
        <button type="button" class="button" id="wafHardenRefreshStatus" style="height:38px;padding:0 14px;font-size:13px;border-radius:8px;display:inline-flex;align-items:center;gap:4px;">
            <span class="dashicons dashicons-update" style="font-size:16px;width:16px;height:16px;"></span> Refresh
        </button>
    </div>
</div>

<div class="war-harden-score" id="wafHardenScore" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:24px;">
    <div class="war-harden-score-card" style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;text-align:center;box-shadow:0 4px 15px rgba(0,0,0,0.02);">
        <div class="war-grade-badge war-grade-b" id="wafHardenGradeBadge" style="margin:0 auto 10px;width:54px;height:54px;line-height:54px;font-size:26px;">B</div>
        <div class="score-label" style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Security Grade</div>
    </div>
    <div class="war-harden-score-card" style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;text-align:center;box-shadow:0 4px 15px rgba(0,0,0,0.02);">
        <div class="score-value" id="wafHardenScoreValue" style="font-size:32px;font-weight:800;color:#0f172a;">0</div>
        <div class="score-label" style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Hardening Score / 100</div>
    </div>
    <div class="war-harden-score-card" style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;text-align:center;box-shadow:0 4px 15px rgba(0,0,0,0.02);">
        <div class="score-value" id="wafHardenEnabledCount" style="font-size:32px;font-weight:800;color:#10b981;">0/16</div>
        <div class="score-label" style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Rules Active</div>
    </div>
</div>

<div class="war-harden-tabs" style="display:flex;gap:8px;margin-bottom:20px;background:#f1f5f9;padding:6px;border-radius:10px;">
    <button type="button" class="war-harden-tab active" data-section="waf-harden-features" style="flex:1;height:38px;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
        <span class="dashicons dashicons-admin-tools" style="font-size:16px;width:16px;height:16px;"></span> All Hardening Measures (16)
    </button>
    <button type="button" class="war-harden-tab" data-section="waf-harden-admin-ip" style="flex:1;height:38px;border:none;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
        <span class="dashicons dashicons-lock" style="font-size:16px;width:16px;height:16px;"></span> Admin IP & Country Whitelist
    </button>
    <button type="button" class="war-harden-tab" data-section="waf-harden-settings" style="flex:1;height:38px;border:none;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
        <span class="dashicons dashicons-admin-generic" style="font-size:16px;width:16px;height:16px;"></span> Hardening Config
    </button>
</div>

<!-- SECTION 1: Features -->
<div id="waf-harden-features" class="war-harden-section active">
    <div class="war-harden-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:18px;">
        <?php
        $features = WAF_FW_Website_Hardening::instance()->get_all_features();
        $statuses = WAF_FW_Website_Hardening::instance()->get_status();
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

        foreach ($features as $key => $label):
            $info = $statuses[$key] ?? ['status' => 'disabled', 'settings' => []];
            $enabled = $info['status'] === 'enabled';
            $settings = $info['settings'] ?? [];
            $icon = $feature_icons[$key] ?? 'dashicons-shield';
        ?>
        <div class="war-harden-card <?php echo $enabled ? 'is-active-rule' : ''; ?>" data-feature="<?php echo esc_attr($key); ?>" style="background:#ffffff;border:1.5px solid <?php echo $enabled ? '#a7f3d0' : '#e2e8f0'; ?>;border-radius:12px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.02);transition:all 0.2s;">
            <div class="war-harden-card-header" style="background:<?php echo $enabled ? '#f0fdf4' : '#f8fafc'; ?>;padding:16px 20px;border-bottom:1px solid <?php echo $enabled ? '#bbf7d0' : '#e2e8f0'; ?>;display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span class="dashicons <?php echo $icon; ?>" style="color:<?php echo $enabled ? '#10b981' : '#64748b'; ?>;font-size:18px;width:18px;height:18px;"></span>
                    <h3 style="margin:0;font-size:14px;font-weight:700;color:#0f172a;"><?php echo esc_html($label); ?></h3>
                </div>
                <label class="war-toggle-sm" style="position:relative;display:inline-block;width:44px;height:24px;">
                    <input type="checkbox" <?php echo $enabled ? 'checked' : ''; ?> style="opacity:0;width:0;height:0;">
                    <span class="slider" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:<?php echo $enabled ? '#10b981' : '#cbd5e1'; ?>;transition:.3s;border-radius:24px;"></span>
                </label>
            </div>
            <div class="war-harden-card-body <?php echo $enabled ? 'active' : ''; ?>" style="padding:16px 20px;background:#ffffff;">
                <?php $this->render_feature_settings($key, $label, $settings); ?>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
</div>

<!-- SECTION 2: Admin IP & Country Whitelist -->
<div id="waf-harden-admin-ip" class="war-harden-section" style="display:none;">
    <div class="war-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;box-shadow:0 4px 20px rgba(0,0,0,0.03);max-width:700px;">
        <h3 style="margin:0 0 6px;font-size:16px;font-weight:700;color:#0f172a;">Admin Panel IP & Country Whitelist</h3>
        <p style="font-size:13px;color:#64748b;margin:0 0 20px;">Restrict access to <code>/wp-admin/</code> and <code>wp-login.php</code> to specific IP addresses or countries. All non-whitelisted traffic will be blocked.</p>
        
        <div style="margin-bottom:20px;background:#f8fafc;padding:14px 18px;border-radius:10px;border:1px solid #e2e8f0;">
            <label class="war-toggle-sm" style="display:flex;align-items:center;gap:12px;cursor:pointer;">
                <input type="checkbox" id="wafAdminIpEnabled" <?php echo WAF_FW_Admin_Panel_IP::instance()->is_enabled() ? 'checked' : ''; ?> style="width:18px;height:18px;accent-color:#10b981;">
                <span style="font-weight:700;font-size:13.5px;color:#0f172a;">Enable Admin Panel IP Restriction</span>
            </label>
        </div>

        <div style="margin-bottom:18px;">
            <label style="font-size:12px;font-weight:700;color:#334155;text-transform:uppercase;display:block;margin-bottom:4px;">Whitelisted Admin IP Addresses</label>
            <p style="font-size:12px;color:#64748b;margin:0 0 6px;">Enter 1 IP per line. Supports CIDR notation (e.g., 192.168.1.0/24) and wildcards (e.g., 103.151.30.*).</p>
            <textarea id="wafAdminIpWhitelist" rows="5" style="width:100%;font-family:monospace;font-size:13px;border-radius:8px;border:1px solid #cbd5e1;padding:10px;box-sizing:border-radius:8px;"><?php echo esc_textarea(get_option('waf_harden_admin_whitelist', '')); ?></textarea>
        </div>

        <div style="margin-bottom:24px;">
            <label style="font-size:12px;font-weight:700;color:#334155;text-transform:uppercase;display:block;margin-bottom:4px;">Blocked Admin Countries</label>
            <p style="font-size:12px;color:#64748b;margin:0 0 6px;">Comma-separated ISO country codes (e.g. <code>CN, RU, KP, IR</code>).</p>
            <input type="text" id="wafAdminIpCountries" value="<?php echo esc_attr(get_option('waf_harden_admin_blocked_countries', '')); ?>" style="width:100%;height:38px;border-radius:8px;border:1px solid #cbd5e1;padding:0 12px;font-size:13px;">
        </div>

        <button type="button" class="button button-primary" id="wafSaveAdminIp" style="height:38px;padding:0 24px;font-weight:700;font-size:13px;background:#10b981;border-color:#10b981;border-radius:8px;">Save IP Settings</button>
    </div>
</div>

<!-- SECTION 3: Hardening Settings -->
<div id="waf-harden-settings" class="war-harden-section" style="display:none;">
    <div class="war-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;box-shadow:0 4px 20px rgba(0,0,0,0.03);max-width:700px;">
        <h3 style="margin:0 0 6px;font-size:16px;font-weight:700;color:#0f172a;">Global Hardening Preferences</h3>
        <p style="font-size:13px;color:#64748b;margin:0 0 20px;">Configure backup and notification behavior when hardening rules are applied.</p>
        
        <form id="wafHardenGlobalSettings">
            <div style="margin-bottom:14px;">
                <label style="display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;color:#334155;cursor:pointer;">
                    <input type="checkbox" id="wafHardenAutoBackup" value="1" checked style="accent-color:#10b981;"> Create automatic backup before modifying <code>wp-config.php</code> or <code>.htaccess</code>
                </label>
            </div>

            <div style="margin-bottom:16px;">
                <label style="display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;color:#334155;cursor:pointer;">
                    <input type="checkbox" id="wafHardenNotifyOnChange" value="1" style="accent-color:#10b981;"> Send email notification when hardening rules are modified
                </label>
            </div>

            <div style="margin-bottom:24px;">
                <label style="font-size:12px;font-weight:700;color:#334155;text-transform:uppercase;display:block;margin-bottom:4px;">Security Notification Email</label>
                <input type="email" id="wafHardenNotifyEmail" value="<?php echo esc_attr(get_option('admin_email')); ?>" style="width:100%;height:38px;border-radius:8px;border:1px solid #cbd5e1;padding:0 12px;font-size:13px;">
            </div>

            <button type="submit" class="button button-primary" style="height:38px;padding:0 24px;font-weight:700;font-size:13px;background:#10b981;border-color:#10b981;border-radius:8px;">Save Global Hardening Config</button>
        </form>
    </div>
</div>

<script>
jQuery(document).ready(function($) {
    $('.war-harden-tab').on('click', function() {
        $('.war-harden-tab').removeClass('active');
        $(this).addClass('active');
        var section = $(this).data('section');
        $('.war-harden-section').hide();
        $('#' + section).fadeIn(150);
    });
});
</script>
