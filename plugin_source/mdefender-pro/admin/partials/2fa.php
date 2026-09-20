<?php
defined('ABSPATH') || exit;

$user = wp_get_current_user();
$enabled = get_user_meta($user->ID, '_waf_2fa_enabled', true) === 'yes';
$secret = get_user_meta($user->ID, '_waf_2fa_secret', true);
$recovery_codes = get_user_meta($user->ID, '_waf_2fa_recovery_codes', true) ?: [];

if (empty($secret)) {
    $secret = WAF_FW_2FA::generate_secret();
    update_user_meta($user->ID, '_waf_2fa_secret_temp', $secret);
} else {
    $secret = get_user_meta($user->ID, '_waf_2fa_secret_temp', true) ?: $secret;
}

$qr_url = WAF_FW_2FA::get_qr_code_url($user->user_login, $secret, get_bloginfo('name'));

// Handle form saves
$msg = '';
if (isset($_POST['waf_save_2fa'])) {
    check_admin_referer('waf_2fa_save_action');
    $code = sanitize_text_field($_POST['waf_2fa_code'] ?? '');
    $code = preg_replace('/\s+/', '', $code);
    $secret_val = sanitize_text_field($_POST['waf_2fa_secret_val'] ?? '');

    if (empty($code)) {
        $msg = '<div class="notice notice-error is-dismissible" style="margin:0 0 20px;"><p><strong>Error:</strong> Please enter the 6-digit verification code from your Authenticator app to enable 2FA.</p></div>';
    } else {
        $totp_valid = WAF_FW_2FA::instance()->verify_totp($secret_val, $code);
        if ($totp_valid) {
            update_user_meta($user->ID, '_waf_2fa_enabled', 'yes');
            update_user_meta($user->ID, '_waf_2fa_secret', $secret_val);
            if (empty($recovery_codes)) {
                $recovery_codes = WAF_FW_2FA::generate_recovery_codes($user->ID);
            }
            $enabled = true;
            $secret = $secret_val;
            $msg = '<div class="notice notice-success is-dismissible" style="margin:0 0 20px;"><p><strong>2FA Activated Successfully!</strong> Two-Factor Authentication is now enabled for your account. Please save the backup recovery codes.</p></div>';
        } else {
            $msg = '<div class="notice notice-error is-dismissible" style="margin:0 0 20px;"><p><strong>Error:</strong> Invalid 6-digit code. Please verify that the code matches your authenticator app and that your server/device clocks are synchronized.</p></div>';
        }
    }
} elseif (isset($_POST['waf_disable_2fa'])) {
    check_admin_referer('waf_2fa_save_action');
    update_user_meta($user->ID, '_waf_2fa_enabled', 'no');
    delete_user_meta($user->ID, '_waf_2fa_secret');
    delete_user_meta($user->ID, '_waf_2fa_secret_temp');
    delete_user_meta($user->ID, '_waf_2fa_recovery_codes');
    $enabled = false;
    $secret = WAF_FW_2FA::generate_secret();
    update_user_meta($user->ID, '_waf_2fa_secret_temp', $secret);
    $recovery_codes = [];
    $msg = '<div class="notice notice-success is-dismissible" style="margin:0 0 20px;"><p><strong>2FA Deactivated.</strong> Two-Factor Authentication is now disabled.</p></div>';
}
?>

<?php echo $msg; ?>

<div style="display:grid;grid-template-columns:1fr 340px;gap:20px;margin-bottom:24px;">
    <!-- Main Setup Card -->
    <div class="war-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
        <div class="war-card-header" style="background:#f8fafc;padding:18px 24px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;color:#fff;">
                    <span class="dashicons dashicons-lock" style="font-size:22px;width:22px;height:22px;margin-top:2px;"></span>
                </div>
                <div>
                    <h3 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">Two-Factor Authentication (2FA) Setup</h3>
                    <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Protect your administrator account with Google Authenticator or Authy 6-digit codes.</p>
                </div>
            </div>
            <span class="waf-badge <?php echo $enabled ? 'waf-badge-pass' : 'waf-badge-warn'; ?>" style="font-size:12px;padding:6px 14px;">
                <?php echo $enabled ? '2FA ACTIVE ✅' : '2FA DISABLED ⚠️'; ?>
            </span>
        </div>

        <div class="war-card-body" style="padding:24px;">
            <?php if ($enabled): ?>
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;text-align:center;">
                    <span class="dashicons dashicons-shield-alt" style="font-size:48px;width:48px;height:48px;color:#10b981;margin-bottom:12px;display:inline-block;line-height:48px;"></span>
                    <h4 style="margin:0 0 8px;color:#14532d;font-size:16px;font-weight:700;">2FA is Active & Protecting Your Account</h4>
                    <p style="margin:0 0 20px;font-size:13px;color:#15803d;line-height:1.5;">Your login is secured. Every time you log in, you will be prompted to enter the 6-digit verification code from your authenticator app.</p>
                    
                    <form method="post" onsubmit="return confirm('Are you sure you want to disable 2FA protection?');">
                        <?php wp_nonce_field('waf_2fa_save_action'); ?>
                        <button type="submit" name="waf_disable_2fa" class="button" style="color:#b91c1c;border-color:#fecaca;background:#fff;padding:4px 18px;font-weight:600;height:36px;border-radius:6px;transition:all 0.2s;">
                            Disable Two-Factor Authentication
                        </button>
                    </form>
                </div>
            <?php else: ?>
                <form method="post">
                    <?php wp_nonce_field('waf_2fa_save_action'); ?>

                    <div style="display:grid;grid-template-columns:200px 1fr;gap:24px;align-items:start;background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:20px;">
                        <div style="text-align:center;">
                            <img src="<?php echo esc_url($qr_url); ?>" alt="2FA QR Code" style="width:180px;height:180px;border-radius:10px;border:1px solid #cbd5e1;box-shadow:0 4px 10px rgba(0,0,0,0.05);display:block;margin:0 auto 10px;" />
                            <span style="font-size:11px;color:#64748b;font-weight:600;">Scan in Authenticator App</span>
                        </div>

                        <div>
                            <h4 style="margin:0 0 8px;font-size:14px;font-weight:700;color:#0f172a;">Step 1: Scan QR Code or Enter Key</h4>
                            <p style="font-size:12.5px;color:#475569;margin:0 0 14px;line-height:1.5;">Open <strong>Google Authenticator</strong>, <strong>Authy</strong>, or <strong>1Password</strong> on your phone. Scan the QR code or manually enter the key below:</p>

                            <div style="margin-bottom:18px;">
                                <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px;">Secret Key</label>
                                <div style="display:flex;gap:8px;max-width:340px;">
                                    <input type="text" readonly value="<?php echo esc_attr($secret); ?>" id="waf2faSecretTxt" style="flex:1;font-family:monospace;font-weight:700;font-size:14px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;padding:6px 12px;color:#0f172a;height:36px;" />
                                    <button type="button" class="button" id="wafCopySecretBtn" style="font-size:12px;height:36px;">Copy</button>
                                </div>
                                <input type="hidden" name="waf_2fa_secret_val" value="<?php echo esc_attr($secret); ?>" />
                            </div>

                            <div style="margin-top:20px;padding-top:20px;border-top:1.5px dashed #e2e8f0;">
                                <h4 style="margin:0 0 8px;font-size:14px;font-weight:700;color:#0f172a;">Step 2: Verify &amp; Activate</h4>
                                <p style="font-size:12.5px;color:#475569;margin:0 0 12px;line-height:1.5;">Enter the 6-digit verification code from your Authenticator app to activate protection:</p>
                                
                                <div style="margin-bottom:16px;">
                                    <input type="text" name="waf_2fa_code" id="waf2faCodeVal" maxlength="6" placeholder="000000" style="letter-spacing:10px;font-family:monospace;font-size:22px;font-weight:800;color:#0f172a;text-align:center;width:180px;height:44px;border:2px solid #cbd5e1;border-radius:10px;box-shadow:inset 0 1px 3px rgba(15,23,42,0.05);transition:border-color 0.2s;" autocomplete="off" />
                                </div>
                                
                                <button type="submit" name="waf_save_2fa" class="button button-primary" style="height:38px;padding:0 24px;font-weight:700;font-size:13px;background:#10b981;border-color:#10b981;border-radius:8px;">
                                    Verify &amp; Activate 2FA
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            <?php endif; ?>
        </div>
    </div>

    <!-- Quick Info Sidebar & Recovery Codes -->
    <div>
        <div class="war-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;box-shadow:0 4px 20px rgba(0,0,0,0.03);margin-bottom:20px;">
            <h4 style="margin:0 0 10px;font-size:14px;font-weight:700;color:#0f172a;">🔑 Recovery Backup Codes</h4>
            <p style="font-size:12px;color:#64748b;margin:0 0 10px;">Use these single-use codes if you lose access to your phone:</p>
            <div style="background:#0f172a;color:#cbd5e1;padding:12px;border-radius:8px;font-family:monospace;font-size:12px;line-height:1.6;text-align:center;">
                <?php if (!empty($recovery_codes)): ?>
                    <?php foreach ($recovery_codes as $rc): ?>
                        <div style="margin:2px 0;letter-spacing:1px;font-weight:700;"><?php echo esc_html($rc); ?></div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <em style="color:#64748b;">Activate 2FA to generate recovery codes.</em>
                <?php endif; ?>
            </div>
        </div>

        <div class="war-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;box-shadow:0 4px 20px rgba(0,0,0,0.03);margin-bottom:20px;">
            <h4 style="margin:0 0 10px;font-size:14px;font-weight:700;color:#0f172a;">📱 Supported Apps</h4>
            <ul style="margin:0;padding-left:18px;font-size:12.5px;color:#475569;line-height:1.6;">
                <li>Google Authenticator</li>
                <li>Authy by Twilio</li>
                <li>1Password / Bitwarden</li>
                <li>Microsoft Authenticator</li>
            </ul>
        </div>

        <div class="war-card" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:20px;">
            <h4 style="margin:0 0 8px;font-size:14px;font-weight:700;color:#0f172a;">🛡️ Emergency Access</h4>
            <p style="font-size:12px;color:#64748b;margin:0;line-height:1.5;">If you ever lose your phone or 2FA app, administrators can disable 2FA for your account using WP-CLI or by clearing the <code>_waf_2fa_enabled</code> user meta in your database.</p>
        </div>
    </div>
</div>

<script>
jQuery(document).ready(function($) {
    $('#wafCopySecretBtn').on('click', function() {
        var secret = $('#waf2faSecretTxt').val();
        navigator.clipboard.writeText(secret).then(function() {
            $('#wafCopySecretBtn').text('Copied! ✅');
            setTimeout(function() {
                $('#wafCopySecretBtn').text('Copy');
            }, 1500);
        });
    });

    $('#waf2faCodeVal').on('input', function() {
        var val = $(this).val();
        val = val.replace(/[^0-9]/g, '');
        $(this).val(val);
    });
});
</script>
