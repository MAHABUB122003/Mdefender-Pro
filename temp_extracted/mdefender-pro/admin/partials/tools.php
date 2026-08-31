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
<div class="war-tools-tabs" style="display:flex;gap:8px;margin-bottom:20px;background:#f1f5f9;padding:6px;border-radius:10px;">
    <button type="button" class="war-tools-tab <?php echo $active_tab === '2fa' ? 'active' : ''; ?>" data-tab="waf-tools-2fa" style="flex:1;height:40px;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
        <span class="dashicons dashicons-lock" style="font-size:16px;width:16px;height:16px;"></span> Two-Factor Authentication (2FA)
    </button>
    <button type="button" class="war-tools-tab <?php echo $active_tab === 'login-url' ? 'active' : ''; ?>" data-tab="waf-tools-login-url" style="flex:1;height:40px;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
        <span class="dashicons dashicons-key" style="font-size:16px;width:16px;height:16px;"></span> Custom Login URL (WPS Hide Login)
    </button>
    <button type="button" class="war-tools-tab <?php echo $active_tab === 'whois' ? 'active' : ''; ?>" data-tab="waf-tools-whois" style="flex:1;height:40px;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
        <span class="dashicons dashicons-admin-links" style="font-size:16px;width:16px;height:16px;"></span> Whois IP Lookup
    </button>
    <button type="button" class="war-tools-tab <?php echo $active_tab === 'attacks' ? 'active' : ''; ?>" data-tab="waf-tools-attacks" style="flex:1;height:40px;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
        <span class="dashicons dashicons-visibility" style="font-size:16px;width:16px;height:16px;"></span> Live Admin Attack Inspector
    </button>
    <button type="button" class="war-tools-tab <?php echo $active_tab === 'diagnostics' ? 'active' : ''; ?>" data-tab="waf-tools-diagnostics" style="flex:1;height:40px;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
        <span class="dashicons dashicons-dashboard" style="font-size:16px;width:16px;height:16px;"></span> System Diagnostics
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
                    <?php echo $enabled_2fa ? '2FA ACTIVE ✅' : '2FA DISABLED ⚠️'; ?>
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
                <h4 style="margin:0 0 10px;font-size:14px;font-weight:700;color:#0f172a;">🔑 Recovery Backup Codes</h4>
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
                <?php echo !empty($custom_login_slug) ? 'LOGIN URL HIDDEN ✅' : 'DEFAULT LOGIN ACTIVE ⚠️'; ?>
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
                <h3 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">⚡ Live Admin Panel Attack Stream</h3>
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
            <h3 style="margin:0;font-size:18px;font-weight:800;color:#0f172a;">🛠️ System Environment Diagnostics Report</h3>
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
                <button type="button" id="wafAttackModalBlockBtn" class="button" style="background:#ef4444;color:#fff;border-color:#dc2626;font-weight:700;font-size:12px;">🚫 Blacklist IP</button>
                <button type="button" id="wafAttackModalWhitelistBtn" class="button" style="background:#10b981;color:#fff;border-color:#059669;font-weight:700;font-size:12px;">🛡️ Whitelist IP</button>
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
            $('#wafCopySecretBtnTools').text('Copied! ✅');
            setTimeout(function() { $('#wafCopySecretBtnTools').text('Copy'); }, 1500);
        });
    });

    $('#wafCopyLoginUrlBtn').on('click', function() {
        var url = $('#wafSecretFullUrl').text();
        navigator.clipboard.writeText(url).then(function() {
            $('#wafCopyLoginUrlBtn').text('Copied! ✅');
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

    $('#wafAttackModalBlockBtn').on('click', function() {
        if (!currentInspectedAdminIp) return;
        if (!confirm('Blacklist IP ' + currentInspectedAdminIp + ' permanently?')) return;
        $.post(ajaxurl, {
            action: 'waf_fw_block_ip',
            ip: currentInspectedAdminIp,
            reason: 'Manual block from Live Admin Attack Stream'
        }, function(r) {
            if (r.success) {
                alert('IP ' + currentInspectedAdminIp + ' blacklisted successfully.');
                wafCloseAdminAttackModal();
                loadAdminAttacks();
            } else {
                alert('Error: ' + (r.data.message || 'Could not block IP'));
            }
        });
    });

    $('#wafAttackModalWhitelistBtn').on('click', function() {
        if (!currentInspectedAdminIp) return;
        if (!confirm('Add IP ' + currentInspectedAdminIp + ' to Whitelist?')) return;
        $.ajax({
            url: ajaxurl + '?action=waf_fw_add_blacklist',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ ip: currentInspectedAdminIp, type: 'whitelist', reason: 'Whitelisted from Live Admin Attack Stream' }),
            success: function(r) {
                if (r.success) {
                    alert('IP ' + currentInspectedAdminIp + ' whitelisted.');
                    wafCloseAdminAttackModal();
                    loadAdminAttacks();
                } else {
                    alert('Error: ' + (r.data.message || 'Could not whitelist IP'));
                }
            }
        });
    });

    function loadDiagnostics() {
        $.get(ajaxurl + '?action=waf_fw_get_diagnostics', function(r) {
            if (r.success && r.data) {
                var d = r.data;
                var html = '';

                // Section 1: Core Summary
                html += '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;margin-bottom:24px;">';
                html += '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;box-shadow:0 2px 10px rgba(0,0,0,0.02);"><span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">PHP Version</span><div style="font-size:20px;font-weight:800;color:#0f172a;margin-top:4px;">' + d.php_version + ' (' + d.sapi + ')</div></div>';
                html += '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;box-shadow:0 2px 10px rgba(0,0,0,0.02);"><span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">WordPress Version</span><div style="font-size:20px;font-weight:800;color:#0f172a;margin-top:4px;">' + d.wp_version + '</div></div>';
                html += '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;box-shadow:0 2px 10px rgba(0,0,0,0.02);"><span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Memory Limit</span><div style="font-size:20px;font-weight:800;color:#0f172a;margin-top:4px;">' + d.memory_limit + '</div></div>';
                html += '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;box-shadow:0 2px 10px rgba(0,0,0,0.02);"><span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Active Theme</span><div style="font-size:16px;font-weight:800;color:#0f172a;margin-top:4px;">' + (d.theme ? d.theme.name : '-') + '</div></div>';
                html += '</div>';

                // Section 2: Installed Plugins Audit
                html += '<div class="war-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:24px;box-shadow:0 4px 20px rgba(0,0,0,0.03);">';
                html += '<h4 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#0f172a;">🔌 Installed Plugins Audit</h4>';
                html += '<table class="wp-list-table widefat fixed striped" style="border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">';
                html += '<thead><tr style="background:#f8fafc;"><th>Plugin Name</th><th style="width:100px;">Version</th><th style="width:100px;">Status</th><th>Author</th></tr></thead><tbody>';
                if (d.plugins && d.plugins.length > 0) {
                    $.each(d.plugins, function(i, p) {
                        var stClass = p.status === 'Active' ? 'waf-badge-pass' : 'waf-badge-warn';
                        html += '<tr><td><strong>' + p.name + '</strong><br><code style="font-size:11px;color:#64748b;">' + p.file + '</code></td><td>' + p.version + '</td><td><span class="waf-badge ' + stClass + '">' + p.status + '</span></td><td style="font-size:12px;color:#475569;">' + p.author + '</td></tr>';
                    });
                } else {
                    html += '<tr><td colspan="4">No plugins detected.</td></tr>';
                }
                html += '</tbody></table></div>';

                // Section 3: File System Permissions Audit
                html += '<div class="war-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:24px;box-shadow:0 4px 20px rgba(0,0,0,0.03);">';
                html += '<h4 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#0f172a;">📁 File System Permissions Audit</h4>';
                html += '<table class="wp-list-table widefat fixed striped" style="border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">';
                html += '<thead><tr style="background:#f8fafc;"><th>Directory / File</th><th style="width:120px;">Octal Perms</th><th style="width:120px;">Writable</th></tr></thead><tbody>';
                if (d.permissions) {
                    $.each(d.permissions, function(pathLabel, pInfo) {
                        var wBadge = pInfo.writable ? '<span class="waf-badge waf-badge-pass">Writable ✅</span>' : '<span class="waf-badge waf-badge-fail">Read Only 🔒</span>';
                        html += '<tr><td><code>' + pathLabel + '</code></td><td><code>' + pInfo.perms + '</code></td><td>' + wBadge + '</td></tr>';
                    });
                }
                html += '</tbody></table></div>';

                $('#wafDiagContainer').html(html);
            }
        });
    }

    $('#wafReloadDiagBtn').on('click', loadDiagnostics);

    $('#waf2faCodeValTools').on('input', function() {
        var val = $(this).val();
        val = val.replace(/[^0-9]/g, '');
        $(this).val(val);
    });

    if ($('#wafWhoisIpTools').val().trim() !== '') {
        runWhoisTools();
    }

    <?php if ($active_tab === 'attacks'): ?>
        loadAdminAttacks();
    <?php elseif ($active_tab === 'diagnostics'): ?>
        loadDiagnostics();
    <?php endif; ?>
});
</script>
