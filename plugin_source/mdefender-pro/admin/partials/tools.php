<?php defined('ABSPATH') || exit;

$active_tab = sanitize_text_field($_GET['tab'] ?? '2fa');
$user = wp_get_current_user();
$enabled_2fa = get_user_meta($user->ID, '_waf_2fa_enabled', true) === 'yes';
$secret = get_user_meta($user->ID, '_waf_2fa_secret', true);

if (empty($secret)) {
    $secret = WAF_FW_2FA::generate_secret();
    update_user_meta($user->ID, '_waf_2fa_secret_temp', $secret);
} else {
    $secret = get_user_meta($user->ID, '_waf_2fa_secret_temp', true) ?: $secret;
}

$qr_url = WAF_FW_2FA::get_qr_code_url($user->user_login, $secret, get_bloginfo('name'));
$recovery_codes = get_user_meta($user->ID, '_waf_2fa_recovery_codes', true) ?: [];

// Custom Login URL options
$custom_login_slug = get_option('waf_harden_login_rename', '');
$custom_redirect_type = get_option('waf_harden_login_redirect_type', 'home');

// Handle 2FA form save
$msg_2fa = '';
if (isset($_POST['waf_save_2fa'])) {
    check_admin_referer('waf_2fa_tools_action');
    $code = sanitize_text_field($_POST['waf_2fa_code'] ?? '');
    $code = preg_replace('/\s+/', '', $code);
    $secret_val = sanitize_text_field($_POST['waf_2fa_secret_val'] ?? '');

    if (empty($code)) {
        $msg_2fa = '<div class="notice notice-error is-dismissible" style="margin:0 0 20px;"><p><strong>Error:</strong> Please enter the 6-digit verification code from your Authenticator app to enable 2FA.</p></div>';
    } else {
        $totp_valid = WAF_FW_2FA::instance()->verify_totp($secret_val, $code);
        if ($totp_valid) {
            update_user_meta($user->ID, '_waf_2fa_enabled', 'yes');
            update_user_meta($user->ID, '_waf_2fa_secret', $secret_val);
            if (empty($recovery_codes)) {
                $recovery_codes = WAF_FW_2FA::generate_recovery_codes($user->ID);
            }
            $enabled_2fa = true;
            $secret = $secret_val;
            $msg_2fa = '<div class="notice notice-success is-dismissible" style="margin:0 0 20px;"><p><strong>2FA Activated Successfully!</strong> Two-Factor Authentication is now enabled for your account. Please save the backup recovery codes.</p></div>';
        } else {
            $msg_2fa = '<div class="notice notice-error is-dismissible" style="margin:0 0 20px;"><p><strong>Error:</strong> Invalid 6-digit code. Please verify that the code matches your authenticator app and that your server/device clocks are synchronized.</p></div>';
        }
    }
} elseif (isset($_POST['waf_disable_2fa'])) {
    check_admin_referer('waf_2fa_tools_action');
    update_user_meta($user->ID, '_waf_2fa_enabled', 'no');
    delete_user_meta($user->ID, '_waf_2fa_secret');
    delete_user_meta($user->ID, '_waf_2fa_secret_temp');
    delete_user_meta($user->ID, '_waf_2fa_recovery_codes');
    $enabled_2fa = false;
    $secret = WAF_FW_2FA::generate_secret();
    update_user_meta($user->ID, '_waf_2fa_secret_temp', $secret);
    $recovery_codes = [];
    $msg_2fa = '<div class="notice notice-success is-dismissible" style="margin:0 0 20px;"><p><strong>2FA Deactivated.</strong> Two-Factor Authentication is now disabled.</p></div>';
}

// Handle Custom Login URL form save
$msg_login_url = '';
if (isset($_POST['waf_save_custom_login_url'])) {
    check_admin_referer('waf_login_url_tools_action');
    $new_slug = sanitize_title($_POST['waf_custom_login_slug'] ?? '');
    $new_redirect = sanitize_text_field($_POST['waf_custom_login_redirect_type'] ?? '404');
    
    if (in_array(strtolower($new_slug), ['wp-admin', 'wp-login.php', 'wp-login'])) {
        $msg_login_url = '<div class="notice notice-error is-dismissible" style="margin:0 0 20px;"><p><strong>Invalid Secret Slug.</strong> <code>wp-admin</code> and <code>wp-login.php</code> are default WordPress paths and cannot be used as secret slugs. Please enter a custom slug like <code>mahabub</code> or <code>my-secret-access</code>.</p></div>';
    } else {
        update_option('waf_harden_login_rename', $new_slug);
        update_option('waf_harden_login_redirect_type', $new_redirect);
        $custom_login_slug = $new_slug;
        $custom_redirect_type = $new_redirect;

        if (!empty($new_slug)) {
            $msg_login_url = '<div class="notice notice-success is-dismissible" style="margin:0 0 20px;"><p><strong>Custom Login URL Saved.</strong> Default <code>wp-login.php</code> and <code>wp-admin</code> (for logged-out users) are now 100% hidden.</p></div>';
        } else {
            $msg_login_url = '<div class="notice notice-info is-dismissible" style="margin:0 0 20px;"><p><strong>Custom Login URL Disabled.</strong> Default WordPress login path restored.</p></div>';
        }
    }
}
?>

<div style="margin-bottom:24px;">
    <h2 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 4px;letter-spacing:-0.4px;">Security Tools & Utilities</h2>
    <p style="margin:0;font-size:13px;color:#64748b;">Manage Two-Factor Authentication (2FA), Custom Secret Login URL (WPS Hide Login), Whois Registries, Live Admin Attack Stream, and System Diagnostics.</p>
</div>

<!-- Tabs Navigation -->
<div class="war-tools-tabs" style="display:flex;gap:6px;margin-bottom:20px;background:#f1f5f9;padding:6px;border-radius:10px;flex-wrap:wrap;">
    <button type="button" class="war-tools-tab <?php echo $active_tab === '2fa' ? 'active' : ''; ?>" data-tab="waf-tools-2fa" style="flex:1;min-width:140px;height:40px;border:none;border-radius:8px;font-weight:700;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
        <span class="dashicons dashicons-lock" style="font-size:16px;width:16px;height:16px;"></span> 2FA Protection
    </button>
    <button type="button" class="war-tools-tab <?php echo $active_tab === 'login-url' ? 'active' : ''; ?>" data-tab="waf-tools-login-url" style="flex:1;min-width:140px;height:40px;border:none;border-radius:8px;font-weight:700;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
        <span class="dashicons dashicons-key" style="font-size:16px;width:16px;height:16px;"></span> Secret Login URL
    </button>
    <button type="button" class="war-tools-tab <?php echo $active_tab === 'integrity' ? 'active' : ''; ?>" data-tab="waf-tools-integrity" style="flex:1;min-width:160px;height:40px;border:none;border-radius:8px;font-weight:700;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
        <span class="dashicons dashicons-media-code" style="font-size:16px;width:16px;height:16px;"></span> Core File Integrity
    </button>
    <button type="button" class="war-tools-tab <?php echo $active_tab === 'posthack' ? 'active' : ''; ?>" data-tab="waf-tools-posthack" style="flex:1;min-width:160px;height:40px;border:none;border-radius:8px;font-weight:700;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
        <span class="dashicons dashicons-sos" style="font-size:16px;width:16px;height:16px;"></span> Post-Hack Recovery
    </button>
    <button type="button" class="war-tools-tab <?php echo $active_tab === 'whois' ? 'active' : ''; ?>" data-tab="waf-tools-whois" style="flex:1;min-width:120px;height:40px;border:none;border-radius:8px;font-weight:700;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
        <span class="dashicons dashicons-admin-links" style="font-size:16px;width:16px;height:16px;"></span> Whois IP
    </button>
    <button type="button" class="war-tools-tab <?php echo $active_tab === 'attacks' ? 'active' : ''; ?>" data-tab="waf-tools-attacks" style="flex:1;min-width:140px;height:40px;border:none;border-radius:8px;font-weight:700;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
        <span class="dashicons dashicons-visibility" style="font-size:16px;width:16px;height:16px;"></span> Attack Stream
    </button>
    <button type="button" class="war-tools-tab <?php echo $active_tab === 'diagnostics' ? 'active' : ''; ?>" data-tab="waf-tools-diagnostics" style="flex:1;min-width:130px;height:40px;border:none;border-radius:8px;font-weight:700;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
        <span class="dashicons dashicons-dashboard" style="font-size:16px;width:16px;height:16px;"></span> Diagnostics
    </button>
</div>

<!-- TAB 1: 2FA -->
<div id="waf-tools-2fa" class="war-tools-section" style="<?php echo $active_tab !== '2fa' ? 'display:none;' : ''; ?>">
    <?php echo $msg_2fa; ?>
    <div style="display:grid;grid-template-columns:1fr 340px;gap:20px;">
        <div class="war-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
            <div class="war-card-header" style="background:#f8fafc;padding:18px 24px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;color:#fff;">
                        <span class="dashicons dashicons-lock" style="font-size:22px;width:22px;height:22px;margin-top:2px;"></span>
                    </div>
                    <div>
                        <h3 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">Two-Factor Authentication Setup</h3>
                        <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Scan QR Code in Google Authenticator or Authy to activate 2FA for <?php echo esc_html($user->user_login); ?>.</p>
                    </div>
                </div>
                <span class="waf-badge <?php echo $enabled_2fa ? 'waf-badge-pass' : 'waf-badge-warn'; ?>" style="font-size:12px;padding:6px 14px;">
                    <?php echo $enabled_2fa ? '2FA ACTIVE' : '2FA DISABLED'; ?>
                </span>
            </div>

            <div class="war-card-body" style="padding:24px;">
                <?php if ($enabled_2fa): ?>
                    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;text-align:center;">
                        <span class="dashicons dashicons-shield-alt" style="font-size:48px;width:48px;height:48px;color:#10b981;margin-bottom:12px;display:inline-block;line-height:48px;"></span>
                        <h4 style="margin:0 0 8px;color:#14532d;font-size:16px;font-weight:700;">2FA is Active & Protecting Your Account</h4>
                        <p style="margin:0 0 20px;font-size:13px;color:#15803d;line-height:1.5;">Your login is secured. Every time you log in, you will be prompted to enter the 6-digit verification code from your authenticator app.</p>
                        
                        <form method="post" onsubmit="return confirm('Are you sure you want to disable 2FA protection?');">
                            <?php wp_nonce_field('waf_2fa_tools_action'); ?>
                            <button type="submit" name="waf_disable_2fa" class="button" style="color:#b91c1c;border-color:#fecaca;background:#fff;padding:4px 18px;font-weight:600;height:36px;border-radius:6px;transition:all 0.2s;">
                                Disable Two-Factor Authentication
                            </button>
                        </form>
                    </div>
                <?php else: ?>
                    <form method="post">
                        <?php wp_nonce_field('waf_2fa_tools_action'); ?>

                        <div style="display:grid;grid-template-columns:200px 1fr;gap:24px;align-items:start;background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:20px;">
                            <div style="text-align:center;">
                                <img src="<?php echo esc_url($qr_url); ?>" alt="2FA QR Code" style="width:180px;height:180px;border-radius:10px;border:1px solid #cbd5e1;box-shadow:0 4px 10px rgba(0,0,0,0.05);display:block;margin:0 auto 10px;" />
                                <span style="font-size:11px;color:#64748b;font-weight:600;">Scan in Authenticator App</span>
                            </div>

                            <div>
                                <h4 style="margin:0 0 8px;font-size:14px;font-weight:700;color:#0f172a;">Step 1: Scan QR Code or Copy Key</h4>
                                <p style="font-size:12.5px;color:#475569;margin:0 0 14px;line-height:1.5;">Scan this QR code in Google Authenticator or enter the manual secret key below:</p>

                                <div style="margin-bottom:18px;">
                                    <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;display:block;margin-bottom:4px;letter-spacing:0.5px;">Secret Key</label>
                                    <div style="display:flex;gap:8px;max-width:340px;">
                                        <input type="text" readonly value="<?php echo esc_attr($secret); ?>" id="waf2faSecretTxtTools" style="flex:1;font-family:monospace;font-weight:700;font-size:14px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;padding:6px 12px;color:#0f172a;height:36px;" />
                                        <button type="button" class="button" id="wafCopySecretBtnTools" style="font-size:12px;height:36px;">Copy</button>
                                    </div>
                                    <input type="hidden" name="waf_2fa_secret_val" value="<?php echo esc_attr($secret); ?>" />
                                </div>

                                <div style="margin-top:20px;padding-top:20px;border-top:1.5px dashed #e2e8f0;">
                                    <h4 style="margin:0 0 8px;font-size:14px;font-weight:700;color:#0f172a;">Step 2: Verify &amp; Enable 2FA</h4>
                                    <p style="font-size:12.5px;color:#475569;margin:0 0 12px;line-height:1.5;">Enter the 6-digit verification code from your Authenticator app to activate protection:</p>
                                    
                                    <div style="margin-bottom:16px;">
                                        <input type="text" name="waf_2fa_code" id="waf2faCodeValTools" maxlength="6" placeholder="000000" style="letter-spacing:10px;font-family:monospace;font-size:22px;font-weight:800;color:#0f172a;text-align:center;width:180px;height:44px;border:2px solid #cbd5e1;border-radius:10px;box-shadow:inset 0 1px 3px rgba(15,23,42,0.05);transition:border-color 0.2s;" autocomplete="off" />
                                    </div>
                                    
                                    <button type="submit" name="waf_save_2fa" class="button button-primary" style="height:38px;padding:0 24px;font-weight:700;font-size:13px;background:#10b981;border-color:#10b981;border-radius:8px;">
                                        Verify &amp; Enable 2FA
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                <?php endif; ?>
            </div>
        </div>

        <div>
            <div class="war-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;box-shadow:0 4px 20px rgba(0,0,0,0.03);margin-bottom:20px;">
                <h4 style="margin:0 0 10px;font-size:14px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:6px;"><span class="dashicons dashicons-admin-network" style="font-size:16px;width:16px;height:16px;"></span> Recovery Backup Codes</h4>
                <p style="font-size:12px;color:#64748b;margin:0 0 10px;">Use these single-use codes if you lose access to your phone:</p>
                <div style="background:#0f172a;color:#cbd5e1;padding:12px;border-radius:8px;font-family:monospace;font-size:12px;line-height:1.6;">
                    <?php if (!empty($recovery_codes)): ?>
                        <?php foreach ($recovery_codes as $rc): ?>
                            <div><?php echo esc_html($rc); ?></div>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <em>Save 2FA to generate recovery codes.</em>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- TAB 2: Custom Login URL (WPS Hide Login) -->
<div id="waf-tools-login-url" class="war-tools-section" style="<?php echo $active_tab !== 'login-url' ? 'display:none;' : ''; ?>">
    <?php echo $msg_login_url; ?>
    <div class="war-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.03);max-width:760px;">
        <div class="war-card-header" style="background:#f8fafc;padding:18px 24px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:14px;">
                <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);display:flex;align-items:center;justify-content:center;color:#fff;">
                    <span class="dashicons dashicons-key" style="font-size:22px;width:22px;height:22px;margin-top:2px;"></span>
                </div>
                <div>
                    <h3 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">Custom Login URL (WPS Hide Login)</h3>
                    <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Hide default <code>wp-login.php</code> to stop automated brute-force bot attacks.</p>
                </div>
            </div>
            <span class="waf-badge <?php echo !empty($custom_login_slug) ? 'waf-badge-pass' : 'waf-badge-warn'; ?>" style="font-size:12px;padding:6px 14px;">
                <?php echo !empty($custom_login_slug) ? 'LOGIN URL HIDDEN' : 'DEFAULT LOGIN ACTIVE'; ?>
            </span>
        </div>

        <div class="war-card-body" style="padding:24px;">
            <form method="post">
                <?php wp_nonce_field('waf_login_url_tools_action'); ?>

                <div style="margin-bottom:20px;">
                    <label style="font-size:12px;font-weight:700;color:#334155;text-transform:uppercase;display:block;margin-bottom:6px;">Secret Login Slug</label>
                    <p style="font-size:12.5px;color:#64748b;margin:0 0 10px;">Enter your custom login path e.g. <code>my-secret-access</code> or <code>private-login</code>. Leave blank to disable.</p>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-family:monospace;font-size:13px;color:#64748b;background:#f1f5f9;padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px;"><?php echo esc_url(home_url('/')); ?></span>
                        <input type="text" name="waf_custom_login_slug" id="wafCustomLoginSlug" value="<?php echo esc_attr($custom_login_slug); ?>" placeholder="e.g. secret-login" style="flex:1;height:38px;border-radius:6px;border:1px solid #cbd5e1;padding:0 12px;font-size:14px;font-weight:700;font-family:monospace;">
                    </div>
                </div>

                <?php if (!empty($custom_login_slug)): ?>
                <div style="margin-bottom:20px;background:#f0fdf4;border:1px solid #bbf7d0;padding:14px;border-radius:10px;display:flex;align-items:center;justify-content:space-between;">
                    <div>
                        <span style="font-size:11px;font-weight:700;color:#15803d;text-transform:uppercase;display:block;margin-bottom:2px;">Active Secret Login URL</span>
                        <code id="wafSecretFullUrl" style="font-size:13px;font-weight:700;color:#0f172a;"><?php echo esc_url(home_url('/' . $custom_login_slug)); ?></code>
                    </div>
                    <button type="button" class="button" id="wafCopyLoginUrlBtn" style="font-size:12px;">Copy Link</button>
                </div>
                <?php endif; ?>

                <div style="margin-bottom:24px;">
                    <label style="font-size:12px;font-weight:700;color:#334155;text-transform:uppercase;display:block;margin-bottom:6px;">Blocked <code>wp-login.php</code> Behavior</label>
                    <select name="waf_custom_login_redirect_type" style="width:100%;max-width:400px;height:38px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;">
                        <option value="home" <?php selected($custom_redirect_type, 'home'); ?>>Redirect to Homepage (301 Redirect)</option>
                        <option value="404" <?php selected($custom_redirect_type, '404'); ?>>Display 404 Not Found Page</option>
                    </select>
                </div>

                <button type="submit" name="waf_save_custom_login_url" class="button button-primary" style="height:38px;padding:0 24px;font-weight:700;font-size:13px;background:#8b5cf6;border-color:#7c3aed;border-radius:8px;">Save Custom Login URL</button>
            </form>
        </div>
    </div>
</div>

<!-- TAB: Core File Integrity (Wordfence & Sucuri Engine) -->
<div id="waf-tools-integrity" class="war-tools-section" style="<?php echo $active_tab !== 'integrity' ? 'display:none;' : ''; ?>">
    <div class="war-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.03);margin-bottom:20px;">
        <div class="war-card-header" style="background:#f8fafc;padding:18px 24px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div style="display:flex;align-items:center;gap:14px;">
                <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#0284c7,#0369a1);display:flex;align-items:center;justify-content:center;color:#fff;">
                    <span class="dashicons dashicons-media-code" style="font-size:22px;width:22px;height:22px;margin-top:2px;"></span>
                </div>
                <div>
                    <h3 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">WordPress Official Core Checksums &amp; Integrity Verifier</h3>
                    <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Direct API integration with <code>api.wordpress.org</code> to verify core file MD5 hashes, detecting modified core files and backdoor injections.</p>
                </div>
            </div>
            <button type="button" class="button button-primary" id="wafStartCoreIntegrityScan" style="height:38px;padding:0 20px;font-weight:700;font-size:13px;background:#0284c7;border-color:#0284c7;border-radius:8px;display:inline-flex;align-items:center;gap:6px;">
                <span class="dashicons dashicons-update" style="font-size:16px;width:16px;height:16px;margin-top:2px;"></span> Run Core Integrity Audit
            </button>
        </div>

        <div class="war-card-body" style="padding:24px;">
            <!-- Telemetry Metrics -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:14px;margin-bottom:24px;">
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                    <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;display:block;margin-bottom:4px;">Core Health Score</span>
                    <div id="wafCoreHealthScore" style="font-size:22px;font-weight:800;color:#10b981;">100%</div>
                </div>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                    <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;display:block;margin-bottom:4px;">Official Core Files</span>
                    <div id="wafCoreTotalFiles" style="font-size:22px;font-weight:800;color:#0f172a;">-</div>
                </div>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                    <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;display:block;margin-bottom:4px;">Modified Files</span>
                    <div id="wafCoreModifiedFiles" style="font-size:22px;font-weight:800;color:#3b82f6;">0</div>
                </div>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                    <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;display:block;margin-bottom:4px;">Rogue / Unknown Files</span>
                    <div id="wafCoreUnknownFiles" style="font-size:22px;font-weight:800;color:#ef4444;">0</div>
                </div>
            </div>

            <!-- Scan Status Loader -->
            <div id="wafCoreScanLoader" style="display:none;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:18px;margin-bottom:20px;text-align:center;color:#0369a1;font-size:13px;font-weight:600;">
                <span class="dashicons dashicons-update spin" style="margin-right:6px;"></span> Querying official WordPress.org checksum API and performing cryptographic hash verification on all core files...
            </div>

            <!-- Findings Table -->
            <div id="wafCoreResultsContainer">
                <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
                    <table class="wp-list-table widefat fixed striped" style="margin:0;">
                        <thead>
                            <tr style="background:#f8fafc;">
                                <th>Target File Path</th>
                                <th style="width:140px;">Issue Type</th>
                                <th style="width:120px;">Severity</th>
                                <th style="width:180px;">Action Required</th>
                                <th style="width:140px;text-align:center;">Remediation</th>
                            </tr>
                        </thead>
                        <tbody id="wafCoreResultsBody">
                            <tr>
                                <td colspan="5" style="text-align:center;padding:30px;color:#64748b;">
                                    <span class="dashicons dashicons-shield-alt" style="font-size:32px;width:32px;height:32px;color:#94a3b8;margin-bottom:8px;display:inline-block;"></span>
                                    <div>Click <strong>"Run Core Integrity Audit"</strong> above to compare local core files against official WordPress release repository hashes.</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- TAB: Post-Hack Recovery Hub (Sucuri & Wordfence Engine) -->
<div id="waf-tools-posthack" class="war-tools-section" style="<?php echo $active_tab !== 'posthack' ? 'display:none;' : ''; ?>">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
        
        <!-- Emergency Response Card 1: Session Invalidation -->
        <div class="war-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#ef4444,#dc2626);display:flex;align-items:center;justify-content:center;color:#fff;">
                    <span class="dashicons dashicons-migrate" style="font-size:22px;width:22px;height:22px;margin-top:2px;"></span>
                </div>
                <div>
                    <h4 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">Global Session Invalidation (Hacker Kickout)</h4>
                    <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Instantly terminates all active WordPress login sessions across all devices.</p>
                </div>
            </div>
            <p style="font-size:12.5px;color:#475569;line-height:1.5;margin-bottom:16px;">
                If your website was compromised, attackers or rogue sessions may still hold active authentication cookies. Invalidate all session tokens immediately to sever any unauthorized connections.
            </p>
            <button type="button" class="button" id="wafPosthackTerminateSessionsBtn" style="height:36px;padding:0 18px;font-weight:700;font-size:12.5px;background:#fef2f2;color:#b91c1c;border-color:#fecaca;border-radius:6px;width:100%;">
                Invalidate All User Sessions Now
            </button>
        </div>

        <!-- Emergency Response Card 2: Salts Regenerator -->
        <div class="war-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;color:#fff;">
                    <span class="dashicons dashicons-admin-network" style="font-size:22px;width:22px;height:22px;margin-top:2px;"></span>
                </div>
                <div>
                    <h4 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">1-Click Security Salts Regenerator</h4>
                    <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Refreshes <code>wp-config.php</code> with fresh 64-char cryptographic keys.</p>
                </div>
            </div>
            <p style="font-size:12.5px;color:#475569;line-height:1.5;margin-bottom:16px;">
                Re-encrypts all cookies and authentication tokens with brand new secret keys fetched directly from official WordPress API. Automatic <code>wp-config.php</code> backup is generated.
            </p>
            <button type="button" class="button" id="wafPosthackRegenSaltsBtn" style="height:36px;padding:0 18px;font-weight:700;font-size:12.5px;background:#fffbeb;color:#b45309;border-color:#fde68a;border-radius:6px;width:100%;">
                Regenerate Security Salts &amp; Keys
            </button>
        </div>

        <!-- Emergency Response Card 3: Force Password Reset -->
        <div class="war-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#4f46e5);display:flex;align-items:center;justify-content:center;color:#fff;">
                    <span class="dashicons dashicons-lock" style="font-size:22px;width:22px;height:22px;margin-top:2px;"></span>
                </div>
                <div>
                    <h4 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">Force Mandatory Password Reset</h4>
                    <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Requires administrators or all users to choose a new password upon login.</p>
                </div>
            </div>
            <p style="font-size:12.5px;color:#475569;line-height:1.5;margin-bottom:16px;">
                Forces all administrator accounts to immediately update their passwords on their next login attempt, rendering any compromised credentials useless.
            </p>
            <div style="display:flex;gap:10px;">
                <button type="button" class="button waf-btn-force-pwd" data-scope="admins" style="flex:1;height:36px;font-weight:700;font-size:12px;background:#eef2ff;color:#4338ca;border-color:#c7d2fe;border-radius:6px;">
                    Enforce on Admins Only
                </button>
                <button type="button" class="button waf-btn-force-pwd" data-scope="all" style="flex:1;height:36px;font-weight:700;font-size:12px;background:#f8fafc;color:#334155;border-color:#cbd5e1;border-radius:6px;">
                    Enforce on All Users
                </button>
            </div>
        </div>

        <!-- Emergency Response Card 4: Pwned Password Inspector -->
        <div class="war-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#0d9488,#0f766e);display:flex;align-items:center;justify-content:center;color:#fff;">
                    <span class="dashicons dashicons-privacy" style="font-size:22px;width:22px;height:22px;margin-top:2px;"></span>
                </div>
                <div>
                    <h4 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">Breached Password Shield (Have I Been Pwned)</h4>
                    <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Cryptographic k-Anonymity breach test against billions of leaked credentials.</p>
                </div>
            </div>
            <p style="font-size:12.5px;color:#475569;line-height:1.5;margin-bottom:12px;">
                Test any password against known global dark web leaks with zero exposure (only first 5 chars of SHA-1 queried):
            </p>
            <div style="display:flex;gap:8px;">
                <input type="password" id="wafPwnedTestPwd" placeholder="Enter password to test..." style="flex:1;height:36px;border-radius:6px;border:1px solid #cbd5e1;padding:0 12px;font-size:13px;">
                <button type="button" class="button button-primary" id="wafCheckPwnedBtn" style="height:36px;background:#0d9488;border-color:#0d9488;font-weight:700;font-size:12px;border-radius:6px;">Test Breach</button>
            </div>
            <div id="wafPwnedResult" style="display:none;margin-top:10px;padding:8px 12px;border-radius:6px;font-size:12px;font-weight:600;"></div>
        </div>
    </div>

    <!-- Admin Accounts Security Audit Table -->
    <div class="war-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <div>
                <h4 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:6px;">
                    <span class="dashicons dashicons-admin-users" style="font-size:18px;width:18px;height:18px;"></span> Administrator Accounts Security Audit
                </h4>
                <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Inspect active admin credentials, 2FA status, concurrent active sessions, and risk factors.</p>
            </div>
            <button type="button" class="button button-small" id="wafRefreshAdminAuditBtn">Refresh Admin Audit</button>
        </div>
        <table class="wp-list-table widefat fixed striped" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
            <thead>
                <tr style="background:#f8fafc;">
                    <th>Username / Login</th>
                    <th>Email Address</th>
                    <th style="width:110px;">2FA Status</th>
                    <th style="width:120px;">Active Sessions</th>
                    <th style="width:120px;">Risk Level</th>
                    <th>Security Flags</th>
                </tr>
            </thead>
            <tbody id="wafAdminAuditBody">
                <tr><td colspan="6" style="text-align:center;padding:20px;color:#64748b;">Loading administrator accounts security audit...</td></tr>
            </tbody>
        </table>
    </div>
</div>

<!-- TAB 3: Whois -->
<div id="waf-tools-whois" class="war-tools-section" style="<?php echo $active_tab !== 'whois' ? 'display:none;' : ''; ?>">
    <div class="war-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
        <div class="war-card-header" style="background:#f8fafc;padding:18px 24px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:14px;">
            <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#0284c7,#0369a1);display:flex;align-items:center;justify-content:center;color:#fff;">
                <span class="dashicons dashicons-admin-links" style="font-size:22px;width:22px;height:22px;margin-top:2px;"></span>
            </div>
            <div>
                <h3 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">Whois Registry IP Lookup</h3>
                <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Query IANA, ARIN, and RIPE databases to inspect IP ownership and location.</p>
            </div>
        </div>
        
        <div class="war-card-body" style="padding:24px;">
            <div style="display:flex;gap:10px;margin-bottom:24px;max-width:600px;">
                <input type="text" id="wafWhoisIpTools" placeholder="e.g. 8.8.8.8" value="<?php echo esc_attr($_GET['ip'] ?? ''); ?>" style="flex:1;height:42px;border-radius:8px;border:1px solid #cbd5e1;padding:0 14px;font-size:14px;">
                <button type="button" class="button button-primary" id="wafWhoisBtnTools" style="height:42px;line-height:40px;padding:0 24px;border-radius:8px;font-weight:700;font-size:13px;background:#0284c7;border-color:#0284c7;">Lookup IP</button>
            </div>

            <div id="wafWhoisLoaderTools" style="display:none;align-items:center;gap:10px;color:#64748b;font-size:13px;margin:20px 0;">
                <span class="waf-spinner-radar"></span> Querying WHOIS socket registries...
            </div>

            <div id="wafWhoisResultTools" style="display:none;">
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:16px;margin-bottom:24px;">
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                        <span style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;display:block;margin-bottom:4px;">IP Query</span>
                        <strong id="resIpTools" style="font-size:16px;color:#0f172a;">-</strong>
                    </div>
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                        <span style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;display:block;margin-bottom:4px;">Country</span>
                        <strong id="resCountryTools" style="font-size:16px;color:#0f172a;">-</strong>
                    </div>
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                        <span style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;display:block;margin-bottom:4px;">ISP / Network</span>
                        <strong id="resIspTools" style="font-size:16px;color:#0f172a;">-</strong>
                    </div>
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                        <span style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;display:block;margin-bottom:4px;">ASN & Route</span>
                        <strong id="resAsTools" style="font-size:16px;color:#0f172a;">-</strong>
                    </div>
                </div>

                <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
                    <div style="background:#f8fafc;padding:12px 18px;border-bottom:1px solid #e2e8f0;font-weight:700;font-size:13px;color:#334155;display:flex;align-items:center;justify-content:space-between;">
                        <span>Official Registry WHOIS text</span>
                        <button type="button" class="button button-small" id="copyWhoisTxtTools">Copy text</button>
                    </div>
                    <pre id="rawWhoisContentTools" style="background:#0f172a;color:#cbd5e1;padding:16px 20px;font-family:monospace;font-size:12px;line-height:1.5;overflow-x:auto;max-height:450px;margin:0;"></pre>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- TAB 4: Live Admin Attack Inspector -->
<div id="waf-tools-attacks" class="war-tools-section" style="<?php echo $active_tab !== 'attacks' ? 'display:none;' : ''; ?>">
    <div class="war-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <div>
                <h3 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:6px;"><span class="dashicons dashicons-shield" style="font-size:18px;width:18px;height:18px;"></span> Live Admin Panel Attack Stream</h3>
                <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Real-time stream of incoming login attempts, brute-force probes, and /wp-admin/ access requests.</p>
            </div>
            <button type="button" class="button button-small" id="wafRefreshAttacksBtn">Refresh Stream</button>
        </div>

        <div style="overflow-x:auto;">
            <table class="wp-list-table widefat fixed striped" style="border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="width:130px;">Client IP</th>
                        <th>Target Endpoint</th>
                        <th style="width:160px;">Attack Type</th>
                        <th style="width:90px;">Status</th>
                        <th style="width:150px;">Timestamp</th>
                        <th style="width:130px;text-align:center;">Actions</th>
                    </tr>
                </thead>
                <tbody id="wafAdminAttacksBody">
                    <tr><td colspan="6" style="text-align:center;padding:20px;color:#64748b;">Loading live admin attack stream...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- TAB 5: System Diagnostics -->
<div id="waf-tools-diagnostics" class="war-tools-section" style="<?php echo $active_tab !== 'diagnostics' ? 'display:none;' : ''; ?>">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <div>
            <h3 style="margin:0;font-size:18px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:6px;"><span class="dashicons dashicons-admin-tools" style="font-size:20px;width:20px;height:20px;"></span> System Environment Diagnostics Report</h3>
            <p style="margin:2px 0 0;font-size:13px;color:#64748b;">Complete Wordfence-style environment audit including plugins, theme, PHP extensions, permissions, and database table health.</p>
        </div>
        <button type="button" class="button" id="wafReloadDiagBtn">Refresh Audit Report</button>
    </div>

    <div id="wafDiagContainer">
        <div style="text-align:center;padding:40px;color:#64748b;">Loading diagnostic environment data...</div>
    </div>
</div>

<!-- Inspect Admin Attack Modal -->
<div id="wafAdminAttackModal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.65);z-index:999999;backdrop-filter:blur(4px);align-items:center;justify-content:center;">
    <div style="background:#ffffff;border-radius:14px;max-width:540px;width:90%;max-height:85vh;box-shadow:0 20px 50px rgba(0,0,0,0.25);display:flex;flex-direction:column;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:#f8fafc;padding:18px 24px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:10px;">
                <span id="wafAttackModalThreatBadge" class="waf-badge waf-badge-fail" style="font-size:12px;padding:4px 10px;">Admin Access Event</span>
            </div>
            <button type="button" onclick="wafCloseAdminAttackModal()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#94a3b8;line-height:1;">&times;</button>
        </div>
        <div style="padding:20px 24px;overflow-y:auto;flex:1;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;">
                <div style="background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
                    <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:4px;">Client IP</div>
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                        <div id="wafAttackModalIp" style="font-family:monospace;font-size:13px;font-weight:700;color:#0f172a;"></div>
                        <a href="#" id="wafAttackModalWhoisLink" class="button button-small" style="font-size:11px;height:24px;line-height:22px;display:inline-flex;align-items:center;gap:4px;color:#0284c7;border-color:#0284c7;">
                            <span class="dashicons dashicons-admin-links" style="font-size:13px;width:13px;height:13px;margin-top:1px;"></span> Whois
                        </a>
                    </div>
                </div>
                <div style="background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
                    <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:4px;">Event Type</div>
                    <div id="wafAttackModalType" style="font-size:13px;font-weight:700;color:#dc2626;"></div>
                </div>
            </div>

            <div style="margin-bottom:14px;">
                <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:4px;">Target Endpoint</div>
                <div id="wafAttackModalUrl" style="background:#f1f5f9;padding:8px 12px;border-radius:6px;font-family:monospace;font-size:12px;color:#0f172a;word-break:break-all;"></div>
            </div>

            <div style="margin-bottom:14px;">
                <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:4px;">Rule Matched</div>
                <div id="wafAttackModalRule" style="font-size:12px;color:#334155;font-weight:600;"></div>
            </div>

            <div style="margin-bottom:14px;">
                <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:4px;">User Agent String</div>
                <div id="wafAttackModalUa" style="background:#f1f5f9;padding:8px 12px;border-radius:6px;font-family:monospace;font-size:11px;color:#475569;max-height:80px;overflow-y:auto;word-break:break-all;"></div>
            </div>
        </div>

        <div style="background:#f8fafc;padding:14px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;gap:10px;">
                <button type="button" id="wafAttackModalBlockBtn" class="button" style="background:#ef4444;color:#fff;border-color:#dc2626;font-weight:700;font-size:12px;">Blacklist IP</button>
                <button type="button" id="wafAttackModalWhitelistBtn" class="button" style="background:#10b981;color:#fff;border-color:#059669;font-weight:700;font-size:12px;">Whitelist IP</button>
            </div>
            <button type="button" class="button" onclick="wafCloseAdminAttackModal()">Close</button>
        </div>
    </div>
</div>

<script>
var currentAdminAttackLogs = [];
var currentInspectedAdminIp = '';

function wafCloseAdminAttackModal() {
    jQuery('#wafAdminAttackModal').hide();
}

function wafInspectAdminAttack(idx) {
    var log = currentAdminAttackLogs[idx];
    if (!log) return;
    currentInspectedAdminIp = log.ip;

    jQuery('#wafAttackModalIp').text(log.ip);
    jQuery('#wafAttackModalType').text(log.attack_type || 'Admin Access');
    jQuery('#wafAttackModalUrl').text(log.url || '/wp-login.php');
    jQuery('#wafAttackModalRule').text(log.rule || 'N/A');
    jQuery('#wafAttackModalUa').text(log.user_agent || 'Not provided');
    jQuery('#wafAttackModalWhoisLink').attr('href', 'admin.php?page=waf-firewall-tools&tab=whois&ip=' + encodeURIComponent(log.ip));

    jQuery('#wafAttackModalThreatBadge').text(log.status === 'blocked' ? 'Threat Blocked' : 'Traffic Allowed')
        .attr('class', 'waf-badge ' + (log.status === 'blocked' ? 'waf-badge-fail' : 'waf-badge-pass'));

    jQuery('#wafAdminAttackModal').css('display', 'flex');
}

jQuery(document).ready(function($) {
    $('.war-tools-tab').on('click', function() {
        $('.war-tools-tab').removeClass('active');
        $(this).addClass('active');
        var tab = $(this).data('tab');
        $('.war-tools-section').hide();
        $('#' + tab).fadeIn(150);

        if (tab === 'waf-tools-attacks') {
            loadAdminAttacks();
        } else if (tab === 'waf-tools-diagnostics') {
            loadDiagnostics();
        }
    });

    $('#wafCopySecretBtnTools').on('click', function() {
        var secret = $('#waf2faSecretTxtTools').val();
        navigator.clipboard.writeText(secret).then(function() {
            $('#wafCopySecretBtnTools').text('Copied');
            setTimeout(function() { $('#wafCopySecretBtnTools').text('Copy'); }, 1500);
        });
    });

    $('#wafCopyLoginUrlBtn').on('click', function() {
        var url = $('#wafSecretFullUrl').text();
        navigator.clipboard.writeText(url).then(function() {
            $('#wafCopyLoginUrlBtn').text('Copied');
            setTimeout(function() { $('#wafCopyLoginUrlBtn').text('Copy Link'); }, 1500);
        });
    });

    function runWhoisTools() {
        var ip = $('#wafWhoisIpTools').val().trim();
        if (!ip) return;
        $('#wafWhoisLoaderTools').css('display', 'flex');
        $('#wafWhoisResultTools').hide();

        $.get(ajaxurl + '?action=waf_fw_whois_lookup&ip=' + encodeURIComponent(ip), function(r) {
            $('#wafWhoisLoaderTools').hide();
            if (r.success && r.data) {
                var geo = r.data.geo || {};
                $('#resIpTools').text(geo.query || ip);
                $('#resCountryTools').text(geo.country ? (geo.country + ' (' + geo.countryCode + ')') : '-');
                $('#resIspTools').text(geo.isp || '-');
                $('#resAsTools').text(geo.as || '-');
                $('#rawWhoisContentTools').text(r.data.raw || 'No whois text returned.');
                $('#wafWhoisResultTools').fadeIn(150);
            }
        });
    }

    $('#wafWhoisBtnTools').on('click', runWhoisTools);

    function loadAdminAttacks() {
        $.get(ajaxurl + '?action=waf_fw_get_admin_attacks', function(r) {
            if (r.success && r.data) {
                currentAdminAttackLogs = r.data;
                var html = '';
                if (r.data.length === 0) {
                    html = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#64748b;">No recent admin panel attacks logged.</td></tr>';
                } else {
                    $.each(r.data, function(i, a) {
                        var badgeClass = a.status === 'blocked' ? 'waf-badge-fail' : 'waf-badge-pass';
                        html += '<tr style="vertical-align:middle;">';
                        html += '<td><code>' + a.ip + '</code></td>';
                        html += '<td style="font-family:monospace;font-size:12px;">' + a.url + '</td>';
                        html += '<td><span class="waf-badge ' + badgeClass + '">' + a.attack_type + '</span></td>';
                        html += '<td><span class="waf-badge ' + badgeClass + '">' + a.status + '</span></td>';
                        html += '<td style="font-size:12px;color:#64748b;">' + a.time + '</td>';
                        html += '<td style="text-align:center;display:flex;gap:4px;justify-content:center;">';
                        html += '<button type="button" class="button button-small" onclick="wafInspectAdminAttack(' + i + ')">Inspect</button>';
                        html += '<a href="admin.php?page=waf-firewall-tools&tab=whois&ip=' + encodeURIComponent(a.ip) + '" class="button button-small" style="color:#0284c7;padding:0 6px;" title="Whois Lookup"><span class="dashicons dashicons-admin-links" style="font-size:14px;width:14px;height:14px;margin-top:2px;"></span></a>';
                        html += '</td>';
                        html += '</tr>';
                    });
                }
                $('#wafAdminAttacksBody').html(html);
            }
        });
    }

    $('#wafRefreshAttacksBtn').on('click', loadAdminAttacks);

    var wafNonce = (typeof waf_fw_ajax !== 'undefined' && waf_fw_ajax.nonce) ? waf_fw_ajax.nonce : '<?php echo wp_create_nonce("waf_fw_ajax"); ?>';

    $('#wafAttackModalBlockBtn').on('click', function() {
        if (!currentInspectedAdminIp) return;
        if (!confirm('Blacklist IP ' + currentInspectedAdminIp + ' permanently?')) return;
        $.post(ajaxurl, {
            action: 'waf_fw_block_ip',
            ip: currentInspectedAdminIp,
            reason: 'Manual block from Live Admin Attack Stream',
            nonce: wafNonce
        }, function(r) {
            if (r.success) {
                alert('IP ' + currentInspectedAdminIp + ' blacklisted successfully.');
                wafCloseAdminAttackModal();
                loadAdminAttacks();
            } else {
                alert('Error: ' + ((r.data && r.data.message) ? r.data.message : 'Could not block IP'));
            }
        });
    });

    $('#wafAttackModalWhitelistBtn').on('click', function() {
        if (!currentInspectedAdminIp) return;
        if (!confirm('Add IP ' + currentInspectedAdminIp + ' to Whitelist?')) return;
        $.post(ajaxurl, {
            action: 'waf_fw_whitelist_ip',
            ip: currentInspectedAdminIp,
            reason: 'Whitelisted from Live Admin Attack Stream',
            nonce: wafNonce
        }, function(r) {
            if (r.success) {
                alert('IP ' + currentInspectedAdminIp + ' whitelisted.');
                wafCloseAdminAttackModal();
                loadAdminAttacks();
            } else {
                alert('Error: ' + ((r.data && r.data.message) ? r.data.message : 'Could not whitelist IP'));
            }
        });
    });

    function loadDiagnostics() {
        $.get(ajaxurl + '?action=waf_fw_get_diagnostics', function(r) {
            if (r.success && r.data) {
                var d = r.data;
                var html = '';

                // Outdated Components Alert Banner
                if (d.total_outdated_count > 0) {
                    html += '<div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">';
                    html += '<div style="display:flex;align-items:center;gap:12px;">';
                    html += '<div style="width:36px;height:36px;border-radius:8px;background:#f59e0b;color:#fff;display:flex;align-items:center;justify-content:center;"><span class="dashicons dashicons-warning" style="font-size:20px;width:20px;height:20px;margin-top:2px;"></span></div>';
                    html += '<div><strong style="color:#92400e;font-size:14px;display:block;">' + d.total_outdated_count + ' Outdated Component(s) Detected (High Vulnerability Risk)</strong>';
                    html += '<span style="font-size:12px;color:#b45309;">Outdated plugins and themes are the #1 attack vector for WordPress infections. Update them directly below.</span></div>';
                    html += '</div>';
                    html += '<button type="button" class="button" id="wafCheckUpdatesBtn" style="background:#fff;border-color:#cbd5e1;font-weight:700;font-size:12px;"><span class="dashicons dashicons-update" style="font-size:14px;width:14px;height:14px;margin-top:2px;"></span> Check for Updates Now</button>';
                    html += '</div>';
                }

                // Section 1: Core Summary KPIs
                html += '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:14px;margin-bottom:24px;">';
                html += '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;box-shadow:0 2px 10px rgba(0,0,0,0.02);"><span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">PHP Version</span><div style="font-size:18px;font-weight:800;color:#0f172a;margin-top:4px;">' + d.php_version + ' <small style="font-size:12px;color:#64748b;">(' + d.sapi + ')</small></div></div>';
                
                var wpVerBadge = d.core_update_available ? ' <span class="waf-badge waf-badge-warn" style="font-size:10px;">Update v' + d.core_new_version + '</span>' : '';
                html += '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;box-shadow:0 2px 10px rgba(0,0,0,0.02);"><span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">WordPress Core</span><div style="font-size:18px;font-weight:800;color:#0f172a;margin-top:4px;">' + d.wp_version + wpVerBadge + '</div></div>';
                
                var outBadge = d.total_outdated_count > 0 ? '<span style="color:#ef4444;">' + d.total_outdated_count + ' Outdated</span>' : '<span style="color:#10b981;">0 (All Up to Date)</span>';
                html += '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;box-shadow:0 2px 10px rgba(0,0,0,0.02);"><span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Component Updates</span><div style="font-size:18px;font-weight:800;margin-top:4px;">' + outBadge + '</div></div>';
                html += '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;box-shadow:0 2px 10px rgba(0,0,0,0.02);"><span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Memory Limit</span><div style="font-size:18px;font-weight:800;color:#0f172a;margin-top:4px;">' + d.memory_limit + '</div></div>';
                html += '</div>';

                // Section 2: Installed Plugins Audit & 1-Click Updater
                html += '<div class="war-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:24px;box-shadow:0 4px 20px rgba(0,0,0,0.03);">';
                html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">';
                html += '<h4 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:6px;"><span class="dashicons dashicons-admin-plugins" style="font-size:18px;width:18px;height:18px;"></span> Installed Plugins &amp; Vulnerability Audit</h4>';
                html += '<span style="font-size:12px;color:#64748b;">' + (d.plugins ? d.plugins.length : 0) + ' Plugin(s) Installed (' + (d.outdated_plugins_count || 0) + ' Outdated)</span>';
                html += '</div>';
                html += '<table class="wp-list-table widefat fixed striped" style="border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">';
                html += '<thead><tr style="background:#f8fafc;"><th>Plugin Name</th><th style="width:110px;">Installed Ver</th><th style="width:90px;">Status</th><th style="width:140px;">Update Status</th><th style="width:140px;text-align:center;">Action</th></tr></thead><tbody>';
                if (d.plugins && d.plugins.length > 0) {
                    $.each(d.plugins, function(i, p) {
                        var stClass = p.status === 'Active' ? 'waf-badge-pass' : 'waf-badge-warn';
                        var updateBadge = p.update_available 
                            ? '<span class="waf-badge waf-badge-fail">v' + p.new_version + ' Available</span>' 
                            : '<span class="waf-badge waf-badge-pass">Up to date</span>';
                        
                        var actionBtn = p.update_available 
                            ? '<button type="button" class="button button-small waf-update-comp-btn" data-type="plugin" data-slug="' + p.file + '" style="background:#0284c7;color:#fff;border-color:#0284c7;font-weight:700;">Update to v' + p.new_version + '</button>'
                            : '<span style="font-size:12px;color:#64748b;">-</span>';

                        html += '<tr>';
                        html += '<td><strong>' + p.name + '</strong><br><code style="font-size:11px;color:#64748b;">' + p.file + '</code></td>';
                        html += '<td><code>v' + p.version + '</code></td>';
                        html += '<td><span class="waf-badge ' + stClass + '">' + p.status + '</span></td>';
                        html += '<td>' + updateBadge + '</td>';
                        html += '<td style="text-align:center;">' + actionBtn + '</td>';
                        html += '</tr>';
                    });
                } else {
                    html += '<tr><td colspan="5">No plugins detected.</td></tr>';
                }
                html += '</tbody></table></div>';

                // Section 3: Installed Themes Audit & 1-Click Updater
                html += '<div class="war-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:24px;box-shadow:0 4px 20px rgba(0,0,0,0.03);">';
                html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">';
                html += '<h4 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:6px;"><span class="dashicons dashicons-admin-appearance" style="font-size:18px;width:18px;height:18px;"></span> Installed Themes Audit</h4>';
                html += '<span style="font-size:12px;color:#64748b;">' + (d.themes ? d.themes.length : 0) + ' Theme(s) Installed (' + (d.outdated_themes_count || 0) + ' Outdated)</span>';
                html += '</div>';
                html += '<table class="wp-list-table widefat fixed striped" style="border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">';
                html += '<thead><tr style="background:#f8fafc;"><th>Theme Name</th><th style="width:110px;">Installed Ver</th><th style="width:90px;">Status</th><th style="width:140px;">Update Status</th><th style="width:140px;text-align:center;">Action</th></tr></thead><tbody>';
                if (d.themes && d.themes.length > 0) {
                    $.each(d.themes, function(i, t) {
                        var stClass = t.is_active ? 'waf-badge-pass' : 'waf-badge-warn';
                        var updateBadge = t.update_available 
                            ? '<span class="waf-badge waf-badge-fail">v' + t.new_version + ' Available</span>' 
                            : '<span class="waf-badge waf-badge-pass">Up to date</span>';
                        
                        var actionBtn = t.update_available 
                            ? '<button type="button" class="button button-small waf-update-comp-btn" data-type="theme" data-slug="' + t.slug + '" style="background:#0284c7;color:#fff;border-color:#0284c7;font-weight:700;">Update to v' + t.new_version + '</button>'
                            : '<span style="font-size:12px;color:#64748b;">-</span>';

                        html += '<tr>';
                        html += '<td><strong>' + t.name + '</strong>' + (t.is_active ? ' <span style="color:#0284c7;font-size:11px;font-weight:700;">(Active)</span>' : '') + '<br><code style="font-size:11px;color:#64748b;">' + t.slug + '</code></td>';
                        html += '<td><code>v' + t.version + '</code></td>';
                        html += '<td><span class="waf-badge ' + stClass + '">' + (t.is_active ? 'Active' : 'Inactive') + '</span></td>';
                        html += '<td>' + updateBadge + '</td>';
                        html += '<td style="text-align:center;">' + actionBtn + '</td>';
                        html += '</tr>';
                    });
                } else {
                    html += '<tr><td colspan="5">No themes detected.</td></tr>';
                }
                html += '</tbody></table></div>';

                // Section 4: File System Permissions Audit
                html += '<div class="war-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:24px;box-shadow:0 4px 20px rgba(0,0,0,0.03);">';
                html += '<h4 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:6px;"><span class="dashicons dashicons-media-document" style="font-size:18px;width:18px;height:18px;"></span> File System Permissions Audit</h4>';
                html += '<table class="wp-list-table widefat fixed striped" style="border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">';
                html += '<thead><tr style="background:#f8fafc;"><th>Directory / File</th><th style="width:120px;">Octal Perms</th><th style="width:120px;">Writable</th></tr></thead><tbody>';
                if (d.permissions) {
                    $.each(d.permissions, function(pathLabel, pInfo) {
                        var wBadge = pInfo.writable ? '<span class="waf-badge waf-badge-pass">Writable</span>' : '<span class="waf-badge waf-badge-fail">Read Only</span>';
                        html += '<tr><td><code>' + pathLabel + '</code></td><td><code>' + pInfo.perms + '</code></td><td>' + wBadge + '</td></tr>';
                    });
                }
                html += '</tbody></table></div>';

                $('#wafDiagContainer').html(html);
            }
        });
    }

    $(document).on('click', '#wafCheckUpdatesBtn', function() {
        var $btn = $(this);
        $btn.prop('disabled', true).html('<span class="dashicons dashicons-update spin"></span> Checking WordPress.org Repositories...');
        $.post(ajaxurl, {
            action: 'waf_diagnostics_check_updates',
            nonce: wafNonce
        }, function(r) {
            loadDiagnostics();
        });
    });

    $(document).on('click', '.waf-update-comp-btn', function() {
        var type = $(this).data('type');
        var slug = $(this).data('slug');
        if (!confirm('Update this ' + type + ' now? A backup will be preserved before upgrading.')) return;
        var $btn = $(this);
        $btn.prop('disabled', true).text('Updating...');

        $.post(ajaxurl, {
            action: 'waf_diagnostics_update_component',
            type: type,
            slug: slug,
            nonce: wafNonce
        }, function(r) {
            if (r.success) {
                alert(r.data.message || 'Component updated successfully!');
                loadDiagnostics();
            } else {
                alert('Error: ' + ((r.data && r.data.message) ? r.data.message : 'Update failed'));
                $btn.prop('disabled', false).text('Update');
            }
        });
    });

    // ===== CORE FILE INTEGRITY CONTROLLER =====
    function runCoreIntegrityScan() {
        $('#wafStartCoreIntegrityScan').prop('disabled', true).html('<span class="dashicons dashicons-update spin"></span> Auditing Core Checksums...');
        $('#wafCoreScanLoader').fadeIn(150);

        $.post(ajaxurl, {
            action: 'waf_tools_core_integrity_scan',
            nonce: wafNonce
        }, function(r) {
            $('#wafStartCoreIntegrityScan').prop('disabled', false).html('<span class="dashicons dashicons-update"></span> Run Core Integrity Audit');
            $('#wafCoreScanLoader').hide();

            if (r.success && r.data) {
                var d = r.data;
                $('#wafCoreHealthScore').text(d.health_score + '%').css('color', d.health_score > 85 ? '#10b981' : '#ef4444');
                $('#wafCoreTotalFiles').text(d.total_official_files || '-');
                $('#wafCoreModifiedFiles').text(d.modified_count || 0);
                $('#wafCoreUnknownFiles').text(d.unknown_count || 0);

                var html = '';
                var allIssues = [];

                if (d.modified_files && d.modified_files.length > 0) {
                    $.each(d.modified_files, function(i, f) {
                        allIssues.push({
                            path: f.path,
                            type: 'Modified Core File',
                            severity: 'Critical',
                            action: 'File hash does not match official WordPress release repository.',
                            btn: '<button type="button" class="button button-small waf-restore-core-btn" data-path="' + f.path + '" style="background:#0284c7;color:#fff;border-color:#0284c7;">Restore Original</button>'
                        });
                    });
                }

                if (d.unknown_files && d.unknown_files.length > 0) {
                    $.each(d.unknown_files, function(i, f) {
                        allIssues.push({
                            path: f.path,
                            type: 'Rogue File in Core Folder',
                            severity: 'High',
                            action: 'Unknown file placed in core directory (potential backdoor).',
                            btn: '<button type="button" class="button button-small waf-delete-rogue-btn" data-path="' + f.path + '" style="background:#ef4444;color:#fff;border-color:#dc2626;">Quarantine & Delete</button>'
                        });
                    });
                }

                if (d.missing_files && d.missing_files.length > 0) {
                    $.each(d.missing_files, function(i, f) {
                        allIssues.push({
                            path: f.path,
                            type: 'Missing Core File',
                            severity: f.criticality || 'Medium',
                            action: 'Core file is absent from disk.',
                            btn: '<button type="button" class="button button-small waf-restore-core-btn" data-path="' + f.path + '" style="background:#0284c7;color:#fff;border-color:#0284c7;">Download & Restore</button>'
                        });
                    });
                }

                if (allIssues.length === 0) {
                    html = '<tr><td colspan="5" style="text-align:center;padding:30px;color:#15803d;background:#f0fdf4;"><span class="dashicons dashicons-yes-alt" style="font-size:28px;width:28px;height:28px;color:#10b981;margin-bottom:6px;display:inline-block;"></span><br><strong>100% Core Integrity Verified:</strong> All official WordPress ' + d.wp_version + ' core files match official WordPress.org release signatures. Zero rogue core files detected.</td></tr>';
                } else {
                    $.each(allIssues, function(i, item) {
                        var sevBadge = item.severity === 'Critical' ? 'waf-badge-fail' : 'waf-badge-warn';
                        html += '<tr>';
                        html += '<td><code>' + item.path + '</code></td>';
                        html += '<td><span class="waf-badge ' + sevBadge + '">' + item.type + '</span></td>';
                        html += '<td><span class="waf-badge ' + sevBadge + '">' + item.severity + '</span></td>';
                        html += '<td style="font-size:12px;color:#475569;">' + item.action + '</td>';
                        html += '<td style="text-align:center;">' + item.btn + '</td>';
                        html += '</tr>';
                    });
                }

                $('#wafCoreResultsBody').html(html);
            } else {
                alert('Scan error: ' + ((r.data && r.data.message) ? r.data.message : 'Unknown error'));
            }
        });
    }

    $('#wafStartCoreIntegrityScan').on('click', runCoreIntegrityScan);

    $(document).on('click', '.waf-restore-core-btn', function() {
        var filePath = $(this).data('path');
        if (!confirm('Restore "' + filePath + '" from official WordPress.org repository? A safety backup will be created.')) return;
        var $btn = $(this);
        $btn.prop('disabled', true).text('Restoring...');

        $.post(ajaxurl, {
            action: 'waf_tools_core_integrity_restore',
            file_path: filePath,
            nonce: wafNonce
        }, function(r) {
            if (r.success) {
                alert(r.data.message || 'File restored successfully.');
                runCoreIntegrityScan();
            } else {
                alert('Error: ' + ((r.data && r.data.message) ? r.data.message : 'Restore failed'));
                $btn.prop('disabled', false).text('Restore Original');
            }
        });
    });

    $(document).on('click', '.waf-delete-rogue-btn', function() {
        var filePath = $(this).data('path');
        if (!confirm('Quarantine and delete rogue file "' + filePath + '"? A quarantine backup will be preserved.')) return;
        var $btn = $(this);
        $btn.prop('disabled', true).text('Deleting...');

        $.post(ajaxurl, {
            action: 'waf_tools_core_integrity_delete_unknown',
            file_path: filePath,
            nonce: wafNonce
        }, function(r) {
            if (r.success) {
                alert(r.data.message || 'Rogue file deleted.');
                runCoreIntegrityScan();
            } else {
                alert('Error: ' + ((r.data && r.data.message) ? r.data.message : 'Deletion failed'));
                $btn.prop('disabled', false).text('Quarantine & Delete');
            }
        });
    });

    // ===== POST-HACK RECOVERY CONTROLLERS =====
    $('#wafPosthackTerminateSessionsBtn').on('click', function() {
        if (!confirm('Are you sure you want to invalidate all active user sessions? You will remain logged in on this browser, but all other devices and potential intruders will be logged out immediately.')) return;
        var $btn = $(this);
        $btn.prop('disabled', true).text('Invalidating Sessions...');

        $.post(ajaxurl, {
            action: 'waf_tools_posthack_terminate_sessions',
            keep_current: 1,
            nonce: wafNonce
        }, function(r) {
            $btn.prop('disabled', false).text('Invalidate All User Sessions Now');
            if (r.success) {
                alert(r.data.message || 'All sessions terminated successfully.');
                loadAdminAudit();
            } else {
                alert('Error: ' + ((r.data && r.data.message) ? r.data.message : 'Failed to terminate sessions'));
            }
        });
    });

    $('#wafPosthackRegenSaltsBtn').on('click', function() {
        if (!confirm('Regenerate all 8 WordPress security keys & salts in wp-config.php? A timestamped backup of wp-config.php will be generated automatically.')) return;
        var $btn = $(this);
        $btn.prop('disabled', true).text('Regenerating Salts...');

        $.post(ajaxurl, {
            action: 'waf_tools_posthack_regenerate_salts',
            nonce: wafNonce
        }, function(r) {
            $btn.prop('disabled', false).text('Regenerate Security Salts & Keys');
            if (r.success) {
                alert(r.data.message || 'Security salts regenerated successfully.');
            } else {
                alert('Error: ' + ((r.data && r.data.message) ? r.data.message : 'Failed to regenerate salts'));
            }
        });
    });

    $('.waf-btn-force-pwd').on('click', function() {
        var scope = $(this).data('scope');
        if (!confirm('Force mandatory password reset on next login for ' + scope + ' accounts?')) return;
        var $btn = $(this);
        $btn.prop('disabled', true);

        $.post(ajaxurl, {
            action: 'waf_tools_posthack_force_password_reset',
            scope: scope,
            nonce: wafNonce
        }, function(r) {
            $btn.prop('disabled', false);
            if (r.success) {
                alert(r.data.message || 'Mandatory password reset configured.');
                loadAdminAudit();
            } else {
                alert('Error: ' + ((r.data && r.data.message) ? r.data.message : 'Action failed'));
            }
        });
    });

    $('#wafCheckPwnedBtn').on('click', function() {
        var pwd = $('#wafPwnedTestPwd').val();
        if (!pwd) {
            alert('Please enter a test password.');
            return;
        }
        var $btn = $(this);
        $btn.prop('disabled', true).text('Checking...');
        $('#wafPwnedResult').hide();

        $.post(ajaxurl, {
            action: 'waf_tools_posthack_check_pwned',
            password: pwd,
            nonce: wafNonce
        }, function(r) {
            $btn.prop('disabled', false).text('Test Breach');
            if (r.success && r.data) {
                if (r.data.pwned) {
                    $('#wafPwnedResult').html('<span style="color:#b91c1c;"><strong>BREACH DETECTED:</strong> This password was found in ' + r.data.count.toLocaleString() + ' known data leaks! Do NOT use this password.</span>').css({'background':'#fef2f2','border':'1px solid #fecaca'}).fadeIn(150);
                } else {
                    $('#wafPwnedResult').html('<span style="color:#15803d;"><strong>SAFE PASSWORD:</strong> No known breaches found for this password in global HIBP leak database.</span>').css({'background':'#f0fdf4','border':'1px solid #bbf7d0'}).fadeIn(150);
                }
            } else {
                $('#wafPwnedResult').html('<span style="color:#b45309;">Unable to complete breach lookup. Check server internet connectivity.</span>').fadeIn(150);
            }
        });
    });

    function loadAdminAudit() {
        $.get(ajaxurl + '?action=waf_tools_posthack_audit_admins', function(r) {
            if (r.success && r.data && r.data.admins) {
                var html = '';
                $.each(r.data.admins, function(i, a) {
                    var twoFaBadge = a.has_2fa ? '<span class="waf-badge waf-badge-pass">Enabled</span>' : '<span class="waf-badge waf-badge-warn">Disabled</span>';
                    var riskBadge = a.risk_level === 'High' ? '<span class="waf-badge waf-badge-fail">High Risk</span>' : (a.risk_level === 'Medium' ? '<span class="waf-badge waf-badge-warn">Medium</span>' : '<span class="waf-badge waf-badge-pass">Low</span>');
                    var flags = (a.warnings && a.warnings.length > 0) ? a.warnings.join(', ') : 'None (Secure)';

                    html += '<tr>';
                    html += '<td><strong>' + a.user_login + '</strong></td>';
                    html += '<td style="font-size:12px;color:#475569;">' + a.user_email + '</td>';
                    html += '<td>' + twoFaBadge + '</td>';
                    html += '<td><code>' + a.active_sessions + ' session(s)</code></td>';
                    html += '<td>' + riskBadge + '</td>';
                    html += '<td style="font-size:12px;color:#64748b;">' + flags + '</td>';
                    html += '</tr>';
                });
                $('#wafAdminAuditBody').html(html);
            }
        });
    }

    $('#wafRefreshAdminAuditBtn').on('click', loadAdminAudit);

    <?php if ($active_tab === 'attacks'): ?>
        loadAdminAttacks();
    <?php elseif ($active_tab === 'diagnostics'): ?>
        loadDiagnostics();
    <?php elseif ($active_tab === 'posthack'): ?>
        loadAdminAudit();
    <?php endif; ?>
});
</script>
