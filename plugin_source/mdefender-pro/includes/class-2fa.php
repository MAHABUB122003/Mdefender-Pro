<?php
defined('ABSPATH') || exit;

class WAF_FW_2FA {
    private static $instance = null;
    private static $base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    public static function instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function __construct() {
        add_action('login_form', [$this, 'render_login_field']);
        add_filter('authenticate', [$this, 'verify_2fa_login'], 30, 3);
        add_action('show_user_profile', [$this, 'render_user_2fa_profile']);
        add_action('edit_user_profile', [$this, 'render_user_2fa_profile']);
        add_action('personal_options_update', [$this, 'save_user_2fa_profile']);
        add_action('edit_user_profile_update', [$this, 'save_user_2fa_profile']);
    }

    public function render_login_field() {
        global $wpdb;
        $has_active_2fa = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->usermeta} WHERE meta_key = '_waf_2fa_enabled' AND meta_value = 'yes'");
        if (!$has_active_2fa) {
            return; // 100% hidden unless 2FA is set up!
        }
        ?>
        <p class="waf-2fa-login-wrap" style="margin-bottom:16px;">
            <label for="waf_2fa_code" style="font-weight:600;font-size:12px;color:#475569;">
                2FA Code (Google Authenticator)
                <br />
                <input type="text" name="waf_2fa_code" id="waf_2fa_code" class="input" value="" size="20" placeholder="6-digit code" autocomplete="off" style="letter-spacing:2px;font-weight:700;margin-top:4px;" />
            </label>
        </p>
        <?php
    }

    public function verify_2fa_login($user, $username, $password) {
        if (is_wp_error($user) || !$user || !($user instanceof WP_User)) {
            return $user;
        }

        $enabled = get_user_meta($user->ID, '_waf_2fa_enabled', true);
        $secret = get_user_meta($user->ID, '_waf_2fa_secret', true);

        // Strict Bypass: If 2FA is NOT explicitly enabled or secret is empty, let user log in freely!
        if ($enabled !== 'yes' || empty($secret)) {
            return $user;
        }

        $code = sanitize_text_field($_POST['waf_2fa_code'] ?? '');
        $code = preg_replace('/\s+/', '', $code);

        // If no code submitted, or invalid code
        $valid = false;
        if (!empty($code)) {
            $valid = $this->verify_totp($secret, $code);
            if (!$valid) {
                $valid = $this->verify_and_consume_recovery_code($user->ID, $code);
            }
        }

        if (!$valid) {
            return new WP_Error('waf_2fa_invalid', '<strong>MDefender-Pro Security</strong>: Invalid or missing 2FA code.');
        }

        return $user;
    }

    public static function generate_recovery_codes($user_id) {
        $codes = [];
        for ($i = 0; $i < 8; $i++) {
            $codes[] = strtoupper(substr(wp_hash(uniqid($user_id, true)), 0, 8));
        }
        update_user_meta($user_id, '_waf_2fa_recovery_codes', $codes);
        return $codes;
    }

    public function verify_and_consume_recovery_code($user_id, $code) {
        $codes = get_user_meta($user_id, '_waf_2fa_recovery_codes', true);
        if (!is_array($codes) || empty($codes)) return false;

        $code = strtoupper(trim($code));
        $key = array_search($code, $codes);
        if ($key !== false) {
            unset($codes[$key]);
            update_user_meta($user_id, '_waf_2fa_recovery_codes', array_values($codes));
            return true;
        }
        return false;
    }

    public function render_user_2fa_profile($user) {
        if (!current_user_can('edit_user', $user->ID)) return;

        $enabled = get_user_meta($user->ID, '_waf_2fa_enabled', true) === 'yes';
        $secret = get_user_meta($user->ID, '_waf_2fa_secret', true);
        if (empty($secret)) {
            $secret = self::generate_secret();
            update_user_meta($user->ID, '_waf_2fa_secret_temp', $secret);
        } else {
            $secret = get_user_meta($user->ID, '_waf_2fa_secret_temp', true) ?: $secret;
        }

        $qr_url = self::get_qr_code_url($user->user_login, $secret, get_bloginfo('name'));
        ?>
        <h3>MDefender-Pro Two-Factor Authentication (2FA)</h3>
        <table class="form-table">
            <tr>
                <th><label for="waf_2fa_toggle">Enable 2FA Protection</label></th>
                <td>
                    <label>
                        <input type="checkbox" name="waf_2fa_toggle" id="waf_2fa_toggle" value="1" <?php checked($enabled); ?> />
                        Enable 2FA requirement for login using Authenticator App (Google Authenticator, Authy, 1Password)
                    </label>
                    
                    <div style="margin-top:16px;background:#fafbfc;border:1px solid #e2e8f0;padding:16px;border-radius:10px;max-width:500px;">
                        <p style="margin:0 0 10px;font-size:13px;">Scan this QR code in your Authenticator app:</p>
                        <img src="<?php echo esc_url($qr_url); ?>" alt="2FA QR Code" style="width:160px;height:160px;border:1px solid #cbd5e1;border-radius:8px;display:block;margin-bottom:10px;" />
                        <p style="font-size:12px;color:#64748b;margin:0 0 6px;">Secret Key (manual entry): <strong style="font-family:monospace;color:#0f172a;"><?php echo esc_html($secret); ?></strong></p>
                        <input type="hidden" name="waf_2fa_secret_val" value="<?php echo esc_attr($secret); ?>" />
                    </div>
                </td>
            </tr>
        </table>
        <?php
    }

    public function save_user_2fa_profile($user_id) {
        if (!current_user_can('edit_user', $user_id)) return;

        $toggle = isset($_POST['waf_2fa_toggle']) ? 'yes' : 'no';
        update_user_meta($user_id, '_waf_2fa_enabled', $toggle);

        if ($toggle === 'yes' && !empty($_POST['waf_2fa_secret_val'])) {
            $secret = sanitize_text_field($_POST['waf_2fa_secret_val']);
            update_user_meta($user_id, '_waf_2fa_secret', $secret);
        }
    }

    public static function generate_secret($secretLength = 16) {
        $secret = '';
        for ($i = 0; $i < $secretLength; $i++) {
            $secret .= self::$base32chars[random_int(0, 31)];
        }
        return $secret;
    }

    public function verify_totp($secret, $code, $discrepancy = 1) {
        $currentTimeSlice = floor(time() / 30);
        for ($i = -$discrepancy; $i <= $discrepancy; $i++) {
            $calculatedCode = $this->get_totp_code($secret, $currentTimeSlice + $i);
            if ($calculatedCode === $code) {
                return true;
            }
        }
        return false;
    }

    private function get_totp_code($secret, $timeSlice = null) {
        if ($timeSlice === null) {
            $timeSlice = floor(time() / 30);
        }

        $secretkey = $this->base32_decode($secret);
        if (!$secretkey) return '';

        $time = pack("N", 0) . pack("N", $timeSlice);
        $hmac = hash_hmac('sha1', $time, $secretkey, true);
        $offset = ord(substr($hmac, -1)) & 0x0F;
        $hashpart = substr($hmac, $offset, 4);
        $value = unpack("N", $hashpart);
        $value = $value[1];
        $value = $value & 0x7FFFFFFF;

        $modulo = pow(10, 6);
        return str_pad($value % $modulo, 6, '0', STR_PAD_LEFT);
    }

    private function base32_decode($secret) {
        if (empty($secret)) return '';
        $secret = strtoupper($secret);
        $base32chars = self::$base32chars;
        $base32charsFlipped = array_flip(str_split($base32chars));

        $secret = str_replace('=', '', $secret);
        $secretArr = str_split($secret);
        $binaryString = '';
        for ($i = 0; $i < count($secretArr); $i = $i + 8) {
            $x = '';
            for ($j = 0; $j < 8; $j++) {
                if (!isset($secretArr[$i + $j])) break;
                $char = $secretArr[$i + $j];
                if (!isset($base32charsFlipped[$char])) return false;
                $x .= sprintf('%05b', $base32charsFlipped[$char]);
            }
            $binaryString .= $x;
        }

        $secretkey = '';
        for ($i = 0; $i < strlen($binaryString); $i = $i + 8) {
            if ($i + 8 > strlen($binaryString)) break;
            $secretkey .= chr(bindec(substr($binaryString, $i, 8)));
        }
        return $secretkey;
    }

    public static function get_qr_code_url($name, $secret, $title = 'MDefender-Pro') {
        $otpauth = 'otpauth://totp/' . rawurlencode($title) . ':' . rawurlencode($name) . '?secret=' . $secret . '&issuer=' . rawurlencode($title);
        return 'https://api.qrserver.com/v1/create-qr-code/?data=' . urlencode($otpauth) . '&size=200x200&ecc=M';
    }
}
