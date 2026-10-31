<?php
defined('ABSPATH') || exit;

class WAF_FW_Turnstile {
    private static $_instance = null;
    private $comment_widget_rendered = false;
    private static $scripts_rendered = false;

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function init() {
        $is_connected = get_option('waf_fw_connected', 'no') === 'yes' || !empty(get_option('waf_fw_ml_api_key')) || !empty(get_option('waf_fw_api_key'));
        if (!$is_connected) {
            return;
        }

        $enabled = get_option('waf_fw_turnstile_enabled', get_option('waf_turnstile_enabled', 'no'));
        if ($enabled !== 'yes') {
            return;
        }

        $mode = get_option('waf_fw_turnstile_mode', get_option('waf_turnstile_mode', 'forms'));
        $hold_press_active = get_option('waf_hold_press_enabled', 'no') === 'yes';

        // 1. Hook into WordPress Login Form ONLY IF Biometric Press & Hold is NOT enabled
        if (!$hold_press_active && ($mode === 'login_only' || $mode === 'all')) {
            add_action('login_form', [$this, 'render_login_widget']);
            add_filter('authenticate', [$this, 'validate_login_turnstile'], 5, 3);
        }

        // 2. Public Form Protections (Comments, Registration, Lost Password)
        if ($mode === 'forms' || $mode === 'all') {
            // Comments: Classic themes, block themes, logged-in & guest commenters
            add_action('comment_form_after_fields', [$this, 'render_comment_widget']);
            add_action('comment_form_logged_in_after', [$this, 'render_comment_widget']);
            add_filter('comment_form_submit_field', [$this, 'filter_comment_submit_field'], 10, 2);
            add_filter('preprocess_comment', [$this, 'validate_comment_turnstile'], 10, 1);

            // Registration
            add_action('register_form', [$this, 'render_register_widget']);
            add_filter('registration_errors', [$this, 'validate_registration_turnstile'], 10, 3);

            // Lost Password
            add_action('lostpassword_form', [$this, 'render_lostpassword_widget']);
            add_action('lostpassword_post', [$this, 'validate_lostpassword_turnstile'], 10, 1);
        }

        // 3. AJAX Endpoints for Challenge generation and solution verification
        add_action('wp_ajax_waf_turnstile_challenge', [$this, 'ajax_get_challenge']);
        add_action('wp_ajax_nopriv_waf_turnstile_challenge', [$this, 'ajax_get_challenge']);
        add_action('wp_ajax_waf_turnstile_verify', [$this, 'ajax_verify_solution']);
        add_action('wp_ajax_nopriv_waf_turnstile_verify', [$this, 'ajax_verify_solution']);

        // 4. Site-Wide Visitor Verification Gate (Under Attack / Site-Wide Mode)
        if ($mode === 'site_wide') {
            add_action('init', [$this, 'handle_sitewide_challenge'], 1);
        }
    }

    /**
     * Get or generate a secure local site secret for HMAC signatures
     */
    private function get_turnstile_secret() {
        $secret = get_option('waf_fw_turnstile_secret', get_option('waf_turnstile_secret', ''));
        if (empty($secret)) {
            $secret = wp_generate_password(64, true, true);
            update_option('waf_fw_turnstile_secret', $secret);
            update_option('waf_turnstile_secret', $secret);
        }
        return $secret;
    }

    /**
     * Generates a dynamic PoW challenge
     */
    public function generate_challenge($domain = '') {
        $domain = $domain ?: ($_SERVER['HTTP_HOST'] ?? 'localhost');
        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $nonce = bin2hex(random_bytes(16));
        $salt = bin2hex(random_bytes(8));
        $exp = time() + 180;
        $is_under_attack = get_option('waf_fw_under_attack_mode', 'no') === 'yes';
        $difficulty = $is_under_attack ? 3 : 2; // 2 hex zeros (~256 iterations, <100ms) for normal forms, 3 for under attack

        $payload = "{$domain}|{$ip}|{$nonce}|{$salt}|{$difficulty}|{$exp}";
        $sig = hash_hmac('sha256', $payload, $this->get_turnstile_secret());
        $token = base64_encode("{$payload}|{$sig}");

        return [
            'token' => $token,
            'challenge_token' => $token,
            'nonce' => $nonce,
            'salt' => $salt,
            'difficulty' => $difficulty,
            'expires_in' => 180
        ];
    }

    /**
     * Validates a PoW solution submitted by the client
     */
    public function verify_solution($token, $solution, $telemetry = []) {
        if (empty($token) || $solution === null || $solution === '') {
            return ['valid' => false, 'message' => 'Missing token or solution'];
        }

        $decoded = base64_decode($token);
        if (!$decoded) {
            return ['valid' => false, 'message' => 'Invalid token encoding'];
        }

        $parts = explode('|', $decoded);
        if (count($parts) !== 7) {
            return ['valid' => false, 'message' => 'Malformed token structure'];
        }

        list($domain, $ip, $nonce, $salt, $diff_str, $exp_str, $sig) = $parts;
        $difficulty = (int)$diff_str;
        $exp = (int)$exp_str;

        // Verify HMAC Signature
        $payload = "{$domain}|{$ip}|{$nonce}|{$salt}|{$difficulty}|{$exp}";
        $expected_sig = hash_hmac('sha256', $payload, $this->get_turnstile_secret());
        if (!hash_equals($expected_sig, $sig)) {
            return ['valid' => false, 'message' => 'Invalid cryptographic signature'];
        }

        // Verify Expiration
        if (time() > $exp) {
            return ['valid' => false, 'message' => 'Security challenge expired'];
        }

        // Verify Proof-of-Work
        $computed = hash('sha256', "{$nonce}:{$salt}:{$solution}");
        $target = str_repeat('0', $difficulty);
        if (strpos($computed, $target) !== 0) {
            return ['valid' => false, 'message' => 'Proof-of-work computation incorrect'];
        }

        // Validate Telemetry
        if (!empty($telemetry)) {
            if (!empty($telemetry['webdriver'])) {
                return ['valid' => false, 'message' => 'Automated bot environment detected'];
            }
            if (isset($telemetry['duration_ms']) && (int)$telemetry['duration_ms'] < 40) {
                return ['valid' => false, 'message' => 'Inhuman interaction speed'];
            }
        }

        // Generate Clearance Token
        $clearance_exp = time() + 86400; // 24 hours
        $entropy = bin2hex(random_bytes(8));
        $clearance_payload = "{$domain}|{$ip}|{$clearance_exp}|{$entropy}";
        $clearance_sig = hash_hmac('sha256', $clearance_payload, $this->get_turnstile_secret());
        $clearance_token = base64_encode("{$clearance_payload}|{$clearance_sig}");

        return [
            'valid' => true,
            'clearance_token' => $clearance_token
        ];
    }

    /**
     * Verifies if a visitor has a valid clearance token cookie
     */
    public function is_visitor_cleared() {
        $cookie = $_COOKIE['__mdef_challenge_token'] ?? '';
        if (empty($cookie)) {
            return false;
        }

        $decoded = base64_decode($cookie);
        if (!$decoded) return false;

        $parts = explode('|', $decoded);
        if (count($parts) !== 5) return false;

        list($domain, $ip, $exp_str, $entropy, $sig) = $parts;
        $exp = (int)$exp_str;

        if (time() > $exp) return false;

        $payload = "{$domain}|{$ip}|{$exp}|{$entropy}";
        $expected_sig = hash_hmac('sha256', $payload, $this->get_turnstile_secret());
        return hash_equals($expected_sig, $sig);
    }

    /**
     * AJAX Challenge Generation Endpoint
     */
    public function ajax_get_challenge() {
        $challenge = $this->generate_challenge();
        wp_send_json_success($challenge);
    }

    /**
     * AJAX Verify Solution Endpoint
     */
    public function ajax_verify_solution() {
        $token = sanitize_text_field($_POST['token'] ?? '');
        $solution = sanitize_text_field($_POST['solution'] ?? '');
        $telemetry = isset($_POST['telemetry']) ? (array)$_POST['telemetry'] : [];

        $res = $this->verify_solution($token, $solution, $telemetry);
        if ($res['valid']) {
            // Set clearance cookie (24 hours)
            setcookie('__mdef_challenge_token', $res['clearance_token'], time() + 86400, '/', '', false, true);
            wp_send_json_success(['clearance_token' => $res['clearance_token']]);
        } else {
            wp_send_json_error(['message' => $res['message']]);
        }
    }

    /**
     * Validates Turnstile on login form submit
     */
    public function validate_login_turnstile($user, $username, $password) {
        if (defined('DOING_CRON') && DOING_CRON) return $user;
        if (defined('XMLRPC_REQUEST') && XMLRPC_REQUEST) return $user;

        if (empty($_POST) || !isset($_POST['log'])) {
            return $user;
        }

        $token = sanitize_text_field($_POST['mdefender_turnstile_token'] ?? '');
        $solution = sanitize_text_field($_POST['mdefender_turnstile_solution'] ?? '');

        if (empty($token)) {
            remove_filter('authenticate', 'wp_authenticate_username_password', 20);
            remove_filter('authenticate', 'wp_authenticate_email_password', 20);
            $err = new WP_Error('waf_turnstile_required', '<strong>Security Verification Required:</strong> Please complete the MDefender human verification.');
            add_filter('authenticate', function() use ($err) { return $err; }, 999);
            return $err;
        }

        $decoded = base64_decode($token);
        if ($decoded) {
            $parts = explode('|', $decoded);
            if (count($parts) === 5) {
                list($domain, $ip, $exp_str, $entropy, $sig) = $parts;
                $payload = "{$domain}|{$ip}|{$exp_str}|{$entropy}";
                $expected = hash_hmac('sha256', $payload, $this->get_turnstile_secret());
                if (hash_equals($expected, $sig) && time() <= (int)$exp_str) {
                    return $user; // Cleared!
                }
            }
        }

        $verify = $this->verify_solution($token, $solution);
        if (!$verify['valid']) {
            remove_filter('authenticate', 'wp_authenticate_username_password', 20);
            remove_filter('authenticate', 'wp_authenticate_email_password', 20);
            $err = new WP_Error('waf_turnstile_failed', '<strong>Verification Failed:</strong> ' . esc_html($verify['message']));
            add_filter('authenticate', function() use ($err) { return $err; }, 999);
            return $err;
        }

        return $user;
    }

    /**
     * Validates Turnstile PoW on public comment submission
     */
    public function validate_comment_turnstile($commentdata) {
        if (defined('DOING_CRON') && DOING_CRON) return $commentdata;
        if (defined('XMLRPC_REQUEST') && XMLRPC_REQUEST) return $commentdata;

        if (is_user_logged_in() && current_user_can('moderate_comments')) {
            return $commentdata;
        }

        if ($this->is_visitor_cleared()) {
            return $commentdata;
        }

        $token = sanitize_text_field($_POST['mdefender_turnstile_token'] ?? '');
        $solution = sanitize_text_field($_POST['mdefender_turnstile_solution'] ?? '');

        if (empty($token)) {
            wp_die(
                '<h3>Security Verification Required</h3><p>Please complete the MDefender Pro human verification before submitting your comment.</p>',
                'Bot Verification Required',
                ['response' => 403, 'back_link' => true]
            );
        }

        $decoded = base64_decode($token);
        if ($decoded) {
            $parts = explode('|', $decoded);
            if (count($parts) === 5) {
                list($domain, $ip, $exp_str, $entropy, $sig) = $parts;
                $payload = "{$domain}|{$ip}|{$exp_str}|{$entropy}";
                $expected = hash_hmac('sha256', $payload, $this->get_turnstile_secret());
                if (hash_equals($expected, $sig) && time() <= (int)$exp_str) {
                    return $commentdata;
                }
            }
        }

        $verify = $this->verify_solution($token, $solution);
        if (!$verify['valid']) {
            wp_die(
                '<h3>Verification Failed</h3><p>' . esc_html($verify['message']) . '</p>',
                'Bot Verification Failed',
                ['response' => 403, 'back_link' => true]
            );
        }

        return $commentdata;
    }

    /**
     * Validates Turnstile on user registration
     */
    public function validate_registration_turnstile($errors, $sanitized_user_login, $user_email) {
        if ($this->is_visitor_cleared()) {
            return $errors;
        }

        $token = sanitize_text_field($_POST['mdefender_turnstile_token'] ?? '');
        $solution = sanitize_text_field($_POST['mdefender_turnstile_solution'] ?? '');

        if (empty($token)) {
            $errors->add('waf_turnstile_empty', '<strong>Security Verification Required:</strong> Please complete the MDefender human verification.');
            return $errors;
        }

        $decoded = base64_decode($token);
        if ($decoded) {
            $parts = explode('|', $decoded);
            if (count($parts) === 5) {
                list($domain, $ip, $exp_str, $entropy, $sig) = $parts;
                $payload = "{$domain}|{$ip}|{$exp_str}|{$entropy}";
                $expected = hash_hmac('sha256', $payload, $this->get_turnstile_secret());
                if (hash_equals($expected, $sig) && time() <= (int)$exp_str) {
                    return $errors;
                }
            }
        }

        $verify = $this->verify_solution($token, $solution);
        if (!$verify['valid']) {
            $errors->add('waf_turnstile_failed', '<strong>Verification Failed:</strong> ' . esc_html($verify['message']));
        }
        return $errors;
    }

    /**
     * Validates Turnstile on lost password requests
     */
    public function validate_lostpassword_turnstile($errors = null) {
        if ($this->is_visitor_cleared()) {
            return;
        }

        $token = sanitize_text_field($_POST['mdefender_turnstile_token'] ?? '');
        $solution = sanitize_text_field($_POST['mdefender_turnstile_solution'] ?? '');

        if (empty($token)) {
            if (is_wp_error($errors)) {
                $errors->add('waf_turnstile_empty', '<strong>Security Verification Required:</strong> Please complete the MDefender human verification.');
            }
            return;
        }

        $decoded = base64_decode($token);
        if ($decoded) {
            $parts = explode('|', $decoded);
            if (count($parts) === 5) {
                list($domain, $ip, $exp_str, $entropy, $sig) = $parts;
                $payload = "{$domain}|{$ip}|{$exp_str}|{$entropy}";
                $expected = hash_hmac('sha256', $payload, $this->get_turnstile_secret());
                if (hash_equals($expected, $sig) && time() <= (int)$exp_str) {
                    return;
                }
            }
        }

        $verify = $this->verify_solution($token, $solution);
        if (!$verify['valid'] && is_wp_error($errors)) {
            $errors->add('waf_turnstile_failed', '<strong>Verification Failed:</strong> ' . esc_html($verify['message']));
        }
    }

    /**
     * Public Widget Renderers
     */
    public function render_login_widget() {
        $this->render_widget('login');
    }

    public function render_register_widget() {
        $this->render_widget('register');
    }

    public function render_lostpassword_widget() {
        $this->render_widget('lostpassword');
    }

    public function render_comment_widget() {
        if ($this->comment_widget_rendered) return;
        $this->comment_widget_rendered = true;
        $this->render_widget('comment');
    }

    public function filter_comment_submit_field($submit_field, $args = []) {
        if ($this->comment_widget_rendered) return $submit_field;
        $this->comment_widget_rendered = true;
        ob_start();
        $this->render_widget('comment');
        $widget = ob_get_clean();
        return $widget . $submit_field;
    }

    /**
     * Site-Wide Visitor Challenge Gate
     */
    public function handle_sitewide_challenge() {
        if (is_admin() || (defined('DOING_AJAX') && DOING_AJAX) || (defined('DOING_CRON') && DOING_CRON)) {
            return;
        }

        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        // Allow static assets, AJAX, and wp-login.php
        if (strpos($uri, 'wp-admin/admin-ajax.php') !== false ||
            strpos($uri, 'wp-login.php') !== false ||
            preg_match('/\.(css|js|png|jpg|jpeg|gif|svg|woff2?|ico)$/i', $uri)) {
            return;
        }

        if (!$this->is_visitor_cleared()) {
            $this->render_interstitial_page();
            exit;
        }
    }

    /**
     * Unified Widget Renderer for All Public Forms & Login Gateways
     */
    public function render_widget($context = 'form') {
        $ajax_url = admin_url('admin-ajax.php');
        $theme = get_option('waf_fw_turnstile_theme', get_option('waf_turnstile_theme', 'auto'));
        $is_cleared = $this->is_visitor_cleared();
        $clearance_cookie = $is_cleared ? ($_COOKIE['__mdef_challenge_token'] ?? $_COOKIE['__mdef_clearance'] ?? '') : '';
        ?>
        <div class="mdefender-turnstile-container" data-theme="<?php echo esc_attr($theme); ?>" data-context="<?php echo esc_attr($context); ?>">
            <div class="mdef-ts-card">
                <div class="mdef-ts-left">
                    <div class="mdef-ts-checkbox <?php echo $is_cleared ? 'state-success' : 'state-idle'; ?>" role="checkbox" aria-checked="<?php echo $is_cleared ? 'true' : 'false'; ?>" tabindex="0">
                        <!-- High-Tech Radar Spinner -->
                        <div class="mdef-ts-spinner">
                            <svg viewBox="0 0 28 28">
                                <circle class="mdef-track" cx="14" cy="14" r="11" />
                                <circle class="mdef-head" cx="14" cy="14" r="11" />
                            </svg>
                        </div>
                        <!-- Animated Flame Checkmark -->
                        <div class="mdef-ts-check" style="<?php echo $is_cleared ? 'display:block;' : 'display:none;'; ?>">
                            <svg viewBox="0 0 24 24">
                                <path class="mdef-check-path" style="<?php echo $is_cleared ? 'stroke-dashoffset: 0;' : ''; ?>" d="M4.5 12.5l5 5L19.5 7" />
                            </svg>
                        </div>
                    </div>
                    <div class="mdef-ts-text-wrap">
                        <div class="mdef-ts-title <?php echo $is_cleared ? 'is-success' : ''; ?>">
                            <?php echo $is_cleared ? 'Success!' : 'Verify you are human'; ?>
                        </div>
                        <div class="mdef-ts-sub">
                            <span class="mdef-sub-idle" style="<?php echo $is_cleared ? 'display:none;' : 'display:inline;'; ?>">MDefender Bot Shield</span>
                            <span class="mdef-sub-success" style="<?php echo $is_cleared ? 'display:inline;' : 'display:none;'; ?>">✓ Verification complete</span>
                        </div>
                    </div>
                </div>

                <div class="mdef-ts-brand">
                    <div class="mdef-brand-header">
                        <svg class="mdef-shield-logo" viewBox="0 0 24 24">
                            <defs>
                                <linearGradient id="mdefShieldGradWp" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stop-color="#0B2522" />
                                    <stop offset="55%" stop-color="#164E48" />
                                    <stop offset="100%" stop-color="#E8792F" />
                                </linearGradient>
                            </defs>
                            <path d="M12 1.5L3.5 5.2v6.5c0 5.6 3.6 10.8 8.5 12.3 4.9-1.5 8.5-6.7 8.5-12.3V5.2L12 1.5z" fill="url(#mdefShieldGradWp)" />
                            <path d="M12 4L5.5 6.8v5c0 4.2 2.7 8.2 6.5 9.5 3.8-1.3 6.5-5.3 6.5-9.5v-5L12 4z" fill="#ffffff" fill-opacity="0.15" />
                            <path d="M9.5 12.2l1.8 1.8 3.5-3.5" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
                        </svg>
                        <span class="mdef-brand-text">MDEFENDER</span>
                    </div>
                    <div class="mdef-brand-footer">
                        <span>Bot Shield</span>
                        <span class="mdef-dot">&bull;</span>
                        <a href="https://mdefender.io" target="_blank" rel="noopener">Privacy</a>
                    </div>
                </div>
            </div>
            <input type="hidden" name="mdefender_turnstile_token" class="mdef-token-input" value="<?php echo esc_attr($clearance_cookie); ?>">
            <input type="hidden" name="mdefender_turnstile_solution" class="mdef-solution-input" value="<?php echo $is_cleared ? 'cleared' : ''; ?>">
        </div>

        <?php if (!self::$scripts_rendered): self::$scripts_rendered = true; ?>
        <style>
            .mdefender-turnstile-container {
                display: block;
                width: 100%;
                max-width: 320px;
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Helvetica Neue", Arial, sans-serif;
                margin: 14px 0 16px;
                user-select: none;
            }
            .mdef-ts-card {
                display: flex;
                align-items: center;
                justify-content: space-between;
                height: 65px;
                padding: 0 14px 0 12px;
                border-radius: 10px;
                background: #ffffff;
                border: 1.5px solid #dcdfe4;
                box-shadow: 0 2px 8px rgba(11, 37, 34, 0.05);
                transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                cursor: pointer;
                box-sizing: border-box;
                position: relative;
                overflow: hidden;
            }
            .mdef-ts-card:hover {
                border-color: #0B2522;
                background: #fbfdfa;
                box-shadow: 0 4px 14px rgba(11, 37, 34, 0.09), 0 0 0 1px rgba(232, 121, 47, 0.15);
            }
            .mdefender-turnstile-container[data-theme="dark"] .mdef-ts-card {
                background: #081412;
                border-color: #1a3832;
                box-shadow: 0 4px 14px rgba(0,0,0,0.4);
            }
            .mdefender-turnstile-container[data-theme="dark"] .mdef-ts-card:hover {
                border-color: #E8792F;
                box-shadow: 0 0 16px rgba(232, 121, 47, 0.2);
            }
            .mdef-ts-left {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .mdef-ts-checkbox {
                width: 28px;
                height: 28px;
                border-radius: 7px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
                position: relative;
                flex-shrink: 0;
                box-sizing: border-box;
            }
            .mdef-ts-checkbox.state-idle {
                background: #ffffff;
                border: 2px solid #cbd5e1;
            }
            .mdef-ts-card:hover .mdef-ts-checkbox.state-idle {
                border-color: #0B2522;
                background: #f4f7f5;
                box-shadow: 0 0 0 3px rgba(11, 37, 34, 0.08);
            }
            .mdefender-turnstile-container[data-theme="dark"] .mdef-ts-checkbox.state-idle {
                background: rgba(255,255,255,0.04);
                border-color: #244840;
            }
            .mdef-ts-checkbox.state-loading {
                background: transparent;
                border: 2px solid transparent;
            }
            .mdef-ts-checkbox.state-success {
                background: #0B2522 !important;
                border: 2px solid #0B2522 !important;
                box-shadow: 0 0 12px rgba(11, 37, 34, 0.4), 0 2px 6px rgba(232, 121, 47, 0.25) !important;
                transform: scale(1.02);
            }
            .mdef-ts-check {
                display: none;
                width: 18px;
                height: 18px;
            }
            .mdef-ts-check svg {
                width: 100%;
                height: 100%;
                display: block;
            }
            .mdef-check-path {
                fill: none;
                stroke: #E8792F !important;
                stroke-width: 3.2 !important;
                stroke-linecap: round;
                stroke-linejoin: round;
                stroke-dasharray: 24;
                stroke-dashoffset: 0;
                transition: stroke-dashoffset 0.35s ease-out;
            }
            .mdef-ts-spinner {
                display: none;
                width: 24px;
                height: 24px;
            }
            .mdef-ts-spinner svg {
                width: 100%;
                height: 100%;
                animation: mdefSpinRot 0.75s linear infinite;
            }
            .mdef-track {
                fill: none;
                stroke: rgba(11, 37, 34, 0.12);
                stroke-width: 2.8;
            }
            .mdef-head {
                fill: none;
                stroke: #E8792F;
                stroke-width: 3;
                stroke-linecap: round;
                stroke-dasharray: 40 35;
            }
            @keyframes mdefSpinRot { to { transform: rotate(360deg); } }
            .mdef-ts-text-wrap {
                display: flex;
                flex-direction: column;
                justify-content: center;
                gap: 2px;
            }
            .mdef-ts-title {
                font-size: 13.5px;
                font-weight: 700;
                color: #10201E;
                line-height: 1.25;
                transition: color 0.2s;
            }
            .mdef-ts-title.is-success {
                color: #0B2522 !important;
            }
            .mdefender-turnstile-container[data-theme="dark"] .mdef-ts-title {
                color: #f8fafc;
            }
            .mdefender-turnstile-container[data-theme="dark"] .mdef-ts-title.is-success {
                color: #FFFFFF !important;
            }
            .mdef-ts-sub {
                font-size: 11px;
                color: #60716B;
                line-height: 1.2;
                font-weight: 500;
            }
            .mdef-sub-success {
                display: none;
                color: #E8792F !important;
                font-weight: 700 !important;
                font-size: 11.5px !important;
            }
            .mdef-ts-brand {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                justify-content: center;
                gap: 2px;
                flex-shrink: 0;
            }
            .mdef-brand-header {
                display: inline-flex;
                align-items: center;
                gap: 5px;
            }
            .mdef-shield-logo {
                width: 16px;
                height: 17px;
                filter: drop-shadow(0 1px 3px rgba(11, 37, 34, 0.25));
            }
            .mdef-brand-text {
                font-size: 11px;
                font-weight: 800;
                letter-spacing: 0.6px;
                text-transform: uppercase;
                color: #0B2522;
            }
            .mdefender-turnstile-container[data-theme="dark"] .mdef-brand-text {
                color: #f1f5f9;
            }
            .mdef-brand-footer {
                font-size: 9.5px;
                color: #60716B;
                display: flex;
                align-items: center;
                gap: 3.5px;
                font-weight: 600;
            }
            .mdef-brand-footer a {
                color: #60716B;
                text-decoration: none;
                transition: color 0.2s;
            }
            .mdef-brand-footer a:hover {
                color: #E8792F;
                text-decoration: underline;
            }
            .mdef-dot { font-size: 7px; opacity: 0.6; }
        </style>

        <script>
        (function() {
            function inspectBrowserEnvironment() {
                var suspicious = false;
                var reasons = [];
                try {
                    if (navigator.webdriver === true) { suspicious = true; reasons.push('webdriver'); }
                    if (window._phantom || window.__nightmare || window.callPhantom) { suspicious = true; reasons.push('phantom'); }
                    if (window.document.__selenium_unwrapped || window.document.__webdriver_evaluate) { suspicious = true; reasons.push('selenium'); }
                    if (!window.screen || window.screen.width === 0 || window.screen.height === 0 || window.screen.availWidth === 0) { suspicious = true; reasons.push('screen'); }
                    if (/Chrome/.test(navigator.userAgent) && !window.chrome) { suspicious = true; reasons.push('fake_chrome'); }
                    if (!navigator.languages || navigator.languages.length === 0) { suspicious = true; reasons.push('no_languages'); }
                    if (!window.crypto || !window.crypto.subtle) { suspicious = true; reasons.push('no_crypto'); }
                } catch(e) {
                    suspicious = true;
                    reasons.push('eval_error');
                }
                return { suspicious: suspicious, reasons: reasons };
            }

            async function solveProofOfWork(ch) {
                var target = '0'.repeat(ch.difficulty);
                var count = 0;
                var enc = new TextEncoder();
                var sol = '0';
                while (count < 2000000) {
                    var msg = ch.nonce + ':' + ch.salt + ':' + count;
                    var buf = await crypto.subtle.digest('SHA-256', enc.encode(msg));
                    var arr = Array.from(new Uint8Array(buf));
                    var hex = arr.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
                    if (hex.indexOf(target) === 0) {
                        sol = String(count);
                        break;
                    }
                    count++;
                }
                return sol;
            }

            async function runChallengeVerification(container, isSilent) {
                var box = container.querySelector('.mdef-ts-card');
                var check = container.querySelector('.mdef-ts-checkbox');
                var spin = container.querySelector('.mdef-ts-spinner');
                var svg = container.querySelector('.mdef-ts-check');
                var label = container.querySelector('.mdef-ts-title');
                var subIdle = container.querySelector('.mdef-sub-idle');
                var subSuccess = container.querySelector('.mdef-sub-success');
                var inputToken = container.querySelector('.mdef-token-input');
                var inputSol = container.querySelector('.mdef-solution-input');

                if (container.dataset.solving === '1' || (check && check.classList.contains('state-success'))) return;
                container.dataset.solving = '1';

                check.className = 'mdef-ts-checkbox state-loading';
                spin.style.display = 'block';
                svg.style.display = 'none';
                label.textContent = isSilent ? 'Verifying browser...' : 'Verifying...';

                var t0 = performance.now();

                try {
                    // 1. Fetch challenge
                    var fd = new FormData();
                    fd.append('action', 'waf_turnstile_challenge');
                    var r1 = await fetch('<?php echo esc_url($ajax_url); ?>', { method: 'POST', body: fd });
                    var data1 = await r1.json();
                    if (!data1.success) throw new Error(data1.data?.message || 'Challenge failed');
                    var ch = data1.data;

                    // 2. Solve PoW in browser WebCrypto
                    var sol = await solveProofOfWork(ch);
                    var t1 = performance.now();

                    // 3. Submit solution with environmental telemetry
                    var fd2 = new FormData();
                    fd2.append('action', 'waf_turnstile_verify');
                    fd2.append('token', ch.token);
                    fd2.append('solution', sol);
                    fd2.append('telemetry[webdriver]', navigator.webdriver === true ? '1' : '0');
                    fd2.append('telemetry[is_silent]', isSilent ? '1' : '0');
                    fd2.append('telemetry[duration_ms]', Math.round(t1 - t0));

                    var r2 = await fetch('<?php echo esc_url($ajax_url); ?>', { method: 'POST', body: fd2 });
                    var data2 = await r2.json();

                    if (data2.success) {
                        spin.style.display = 'none';
                        svg.style.display = 'block';
                        check.className = 'mdef-ts-checkbox state-success';
                        label.textContent = 'Success!';
                        label.className = 'mdef-ts-title is-success';
                        if (subIdle) subIdle.style.display = 'none';
                        if (subSuccess) subSuccess.style.display = 'inline';
                        if (inputToken) inputToken.value = data2.data.clearance_token;
                        if (inputSol) inputSol.value = sol;
                        container.dataset.solved = '1';

                        // Set cookies for 24-hour clearance persistence
                        var tokenVal = data2.data.clearance_token;
                        document.cookie = '__mdef_challenge_token=' + encodeURIComponent(tokenVal) + '; path=/; max-age=86400; SameSite=Lax';
                        document.cookie = '__mdef_clearance=' + encodeURIComponent(tokenVal) + '; path=/; max-age=86400; SameSite=Lax';

                        window.dispatchEvent(new CustomEvent('mdefender:verified', { detail: { token: tokenVal } }));
                    } else {
                        throw new Error(data2.data?.message || 'Verification rejected');
                    }
                } catch(e) {
                    spin.style.display = 'none';
                    check.className = 'mdef-ts-checkbox state-idle';
                    check.style.borderColor = '#E8792F';
                    label.textContent = 'Verification Required';
                    label.className = 'mdef-ts-title';
                    if (subIdle) subIdle.textContent = 'Click to verify human access';
                } finally {
                    container.dataset.solving = '0';
                }
            }

            function initTurnstileWidgets() {
                var containers = document.querySelectorAll('.mdefender-turnstile-container:not([data-initialized])');
                containers.forEach(function(container) {
                    container.setAttribute('data-initialized', '1');
                    var check = container.querySelector('.mdef-ts-checkbox');
                    var isAlreadyCleared = check && check.classList.contains('state-success');

                    if (isAlreadyCleared) {
                        return;
                    }

                    var env = inspectBrowserEnvironment();

                    // Step 1: Silent Challenge (Automatic background check for clean human browsers)
                    if (!env.suspicious) {
                        setTimeout(function() {
                            runChallengeVerification(container, true);
                        }, 50);
                    }

                    // Step 2: Interactive Challenge (When user clicks or if suspicious)
                    var box = container.querySelector('.mdef-ts-card');
                    box.addEventListener('click', function() {
                        if (container.dataset.solved === '1') return;
                        runChallengeVerification(container, false);
                    });
                });
            }

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initTurnstileWidgets);
            } else {
                initTurnstileWidgets();
            }
        })();
        </script>
        <?php endif; ?>
        <?php
    }

    public function render_interstitial_page() {
        $ajax_url = admin_url('admin-ajax.php');
        $domain = $_SERVER['HTTP_HOST'] ?? 'Website';
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $ray_id = bin2hex(random_bytes(6));
        status_header(403);
        nocache_headers();
        ?>
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Just a moment... | <?php echo esc_html($domain); ?></title>
            <style>
                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }
                body {
                    background-color: #ffffff;
                    color: #111827;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 24px;
                    user-select: none;
                    -webkit-font-smoothing: antialiased;
                }
                .challenge-container {
                    width: 100%;
                    max-width: 520px;
                    padding: 40px 20px;
                }
                h1.challenge-title {
                    font-size: 28px;
                    font-weight: 700;
                    color: #000000;
                    letter-spacing: -0.02em;
                    margin-bottom: 12px;
                    line-height: 1.25;
                }
                p.challenge-desc {
                    font-size: 15px;
                    color: #374151;
                    line-height: 1.5;
                    margin-bottom: 28px;
                }
                .mdef-widget-host {
                    margin-bottom: 28px;
                }
                .challenge-meta {
                    font-size: 13.5px;
                    color: #6b7280;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                    line-height: 1.6;
                }
            </style>
        </head>
        <body>
            <div class="challenge-container">
                <h1 class="challenge-title">We need to confirm you're human.</h1>
                <p class="challenge-desc">Thanks for helping us keep the bots away. Check the box and let's get you where you're going.</p>

                <div class="mdef-widget-host">
                    <?php $this->render_widget('interstitial'); ?>
                </div>

                <div class="challenge-meta">
                    <div>Request ID: <?php echo esc_html($ray_id); ?></div>
                    <div>IP: <?php echo esc_html($ip); ?></div>
                </div>
            </div>

            <script>
            window.addEventListener('mdefender:verified', function(e) {
                setTimeout(function() {
                    window.location.reload();
                }, 350);
            });
            </script>
        </body>
        </html>
        <?php
    }
}
