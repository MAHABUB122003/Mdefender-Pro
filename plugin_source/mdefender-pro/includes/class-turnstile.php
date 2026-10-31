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
        $difficulty = 3; // 3 hex zeroes (average ~2,000 iterations, 30-60ms)

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
        $clearance_cookie = $is_cleared ? ($_COOKIE['__mdef_challenge_token'] ?? '') : '';
        ?>
        <div class="mdefender-turnstile-container" data-theme="<?php echo esc_attr($theme); ?>" data-context="<?php echo esc_attr($context); ?>" style="margin: 14px 0 16px; user-select: none;">
            <div class="mdef-ts-card">
                <div class="mdef-ts-left">
                    <div class="mdef-ts-checkbox <?php echo $is_cleared ? 'state-success' : 'state-idle'; ?>" role="checkbox" aria-checked="<?php echo $is_cleared ? 'true' : 'false'; ?>" tabindex="0">
                        <!-- Radar Spinner -->
                        <div class="mdef-ts-spinner">
                            <svg viewBox="0 0 28 28">
                                <circle class="mdef-track" cx="14" cy="14" r="11" />
                                <circle class="mdef-head" cx="14" cy="14" r="11" />
                            </svg>
                        </div>
                        <!-- Animated Checkmark -->
                        <div class="mdef-ts-check" style="<?php echo $is_cleared ? 'display:block;' : ''; ?>">
                            <svg viewBox="0 0 24 24">
                                <path class="mdef-check-path" style="<?php echo $is_cleared ? 'stroke-dashoffset: 0;' : ''; ?>" d="M4.5 12.5l5 5L19.5 7" />
                            </svg>
                        </div>
                    </div>
                    <div class="mdef-ts-text-wrap">
                        <div class="mdef-ts-title" style="<?php echo $is_cleared ? 'color: #059669;' : ''; ?>">
                            <?php echo $is_cleared ? 'Success!' : 'Verify you are human'; ?>
                        </div>
                        <div class="mdef-ts-sub">
                            <span class="mdef-sub-idle" style="<?php echo $is_cleared ? 'display:none;' : ''; ?>">MDefender Bot Shield</span>
                            <span class="mdef-sub-success" style="<?php echo $is_cleared ? 'display:inline;' : ''; ?>">✓ Verification complete</span>
                        </div>
                    </div>
                </div>

                <div class="mdef-ts-brand">
                    <div class="mdef-brand-header">
                        <svg class="mdef-shield-logo" viewBox="0 0 24 24">
                            <defs>
                                <linearGradient id="mdefShieldGradWp" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stop-color="#2563eb" />
                                    <stop offset="60%" stop-color="#3b82f6" />
                                    <stop offset="100%" stop-color="#06b6d4" />
                                </linearGradient>
                            </defs>
                            <path d="M12 1.5L3.5 5.2v6.5c0 5.6 3.6 10.8 8.5 12.3 4.9-1.5 8.5-6.7 8.5-12.3V5.2L12 1.5z" fill="url(#mdefShieldGradWp)" />
                            <path d="M12 4L5.5 6.8v5c0 4.2 2.7 8.2 6.5 9.5 3.8-1.3 6.5-5.3 6.5-9.5v-5L12 4z" fill="#ffffff" fill-opacity="0.18" />
                            <path d="M9.5 12.2l1.8 1.8 3.5-3.5" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
                        </svg>
                        <span class="mdef-brand-text">MDefender</span>
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
            }
            .mdef-ts-card {
                display: flex;
                align-items: center;
                justify-content: space-between;
                height: 65px;
                padding: 0 14px 0 12px;
                border-radius: 8px;
                background: #ffffff;
                border: 1px solid #dcdfe4;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03);
                transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                cursor: pointer;
                box-sizing: border-box;
                position: relative;
                overflow: hidden;
            }
            .mdef-ts-card:hover {
                border-color: #2563eb;
                background: #fbfdff;
                box-shadow: 0 3px 8px rgba(37, 99, 235, 0.1), 0 1px 2px rgba(0,0,0,0.04);
            }

            /* Dark Theme Overrides */
            .mdefender-turnstile-container[data-theme="dark"] .mdef-ts-card {
                background: #081412;
                border-color: #1a3832;
                box-shadow: 0 4px 14px rgba(0,0,0,0.35);
            }
            .mdefender-turnstile-container[data-theme="dark"] .mdef-ts-card:hover {
                border-color: #2A8B68;
                box-shadow: 0 0 16px rgba(42, 139, 104, 0.2);
            }
            .mdefender-turnstile-container[data-theme="dark"] .mdef-ts-title {
                color: #f8fafc;
            }
            .mdefender-turnstile-container[data-theme="dark"] .mdef-brand-text {
                color: #f1f5f9;
            }

            .mdef-ts-left {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .mdef-ts-checkbox {
                width: 28px;
                height: 28px;
                border-radius: 6px;
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
            .mdefender-turnstile-container[data-theme="dark"] .mdef-ts-checkbox.state-idle {
                background: rgba(255,255,255,0.04);
                border-color: rgba(255,255,255,0.25);
            }
            .mdef-ts-card:hover .mdef-ts-checkbox.state-idle {
                border-color: #2563eb;
                background: #eff6ff;
                box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
            }

            .mdef-ts-checkbox.state-loading {
                background: transparent;
                border: 2px solid transparent;
            }
            .mdef-ts-checkbox.state-success {
                background: #10b981;
                border: 2px solid #10b981;
                box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
                transform: scale(1.02);
            }

            /* High-tech Radar Spinner */
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
                stroke: rgba(37, 99, 235, 0.15);
                stroke-width: 2.8;
            }
            .mdef-head {
                fill: none;
                stroke: #2563eb;
                stroke-width: 2.8;
                stroke-linecap: round;
                stroke-dasharray: 40 35;
            }
            @keyframes mdefSpinRot { to { transform: rotate(360deg); } }

            /* Animated Checkmark */
            .mdef-ts-check {
                display: none;
                width: 18px;
                height: 18px;
            }
            .mdef-ts-check svg {
                width: 100%;
                height: 100%;
            }
            .mdef-check-path {
                fill: none;
                stroke: #ffffff;
                stroke-width: 2.8;
                stroke-linecap: round;
                stroke-linejoin: round;
                stroke-dasharray: 24;
                stroke-dashoffset: 24;
                animation: mdefDraw 0.35s 0.05s ease-out forwards;
            }
            @keyframes mdefDraw { to { stroke-dashoffset: 0; } }

            /* Text Styling */
            .mdef-ts-text-wrap {
                display: flex;
                flex-direction: column;
                justify-content: center;
                gap: 2px;
            }
            .mdef-ts-title {
                font-size: 13.5px;
                font-weight: 500;
                color: #1e293b;
                line-height: 1.25;
                transition: color 0.2s;
            }
            .mdef-ts-sub {
                font-size: 11px;
                color: #64748b;
                line-height: 1.2;
            }
            .mdef-sub-success {
                display: none;
                color: #059669;
                font-weight: 600;
            }

            /* Branding Right */
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
                gap: 4.5px;
            }
            .mdef-shield-logo {
                width: 15px;
                height: 16px;
                filter: drop-shadow(0 1px 2px rgba(37,99,235,0.25));
            }
            .mdef-brand-text {
                font-size: 11px;
                font-weight: 800;
                letter-spacing: 0.5px;
                text-transform: uppercase;
                color: #1e293b;
            }
            .mdef-brand-footer {
                font-size: 9px;
                color: #94a3b8;
                display: flex;
                align-items: center;
                gap: 3.5px;
            }
            .mdef-brand-footer a {
                color: #94a3b8;
                text-decoration: none;
                transition: color 0.2s;
            }
            .mdef-brand-footer a:hover {
                color: #2563eb;
                text-decoration: underline;
            }
            .mdef-dot { font-size: 7px; opacity: 0.6; }
        </style>

        <script>
        (function() {
            function initTurnstileWidgets() {
                var containers = document.querySelectorAll('.mdefender-turnstile-container:not([data-initialized])');
                containers.forEach(function(container) {
                    container.setAttribute('data-initialized', '1');
                    var box = container.querySelector('.mdef-ts-card');
                    var check = container.querySelector('.mdef-ts-checkbox');
                    var spin = container.querySelector('.mdef-ts-spinner');
                    var svg = container.querySelector('.mdef-ts-check');
                    var label = container.querySelector('.mdef-ts-title');
                    var subIdle = container.querySelector('.mdef-sub-idle');
                    var subSuccess = container.querySelector('.mdef-sub-success');
                    var inputToken = container.querySelector('.mdef-token-input');
                    var inputSol = container.querySelector('.mdef-solution-input');

                    var isRunning = false;
                    var isSolved = check.classList.contains('state-success');

                    box.addEventListener('click', async function() {
                        if (isRunning || isSolved) return;
                        isRunning = true;

                        check.className = 'mdef-ts-checkbox state-loading';
                        spin.style.display = 'block';
                        svg.style.display = 'none';
                        label.textContent = 'Verifying...';

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

                            var t1 = performance.now();

                            // 3. Submit solution
                            var fd2 = new FormData();
                            fd2.append('action', 'waf_turnstile_verify');
                            fd2.append('token', ch.token);
                            fd2.append('solution', sol);
                            fd2.append('telemetry[webdriver]', navigator.webdriver === true ? '1' : '0');
                            fd2.append('telemetry[duration_ms]', Math.round(t1 - t0));

                            var r2 = await fetch('<?php echo esc_url($ajax_url); ?>', { method: 'POST', body: fd2 });
                            var data2 = await r2.json();

                            if (data2.success) {
                                isSolved = true;
                                spin.style.display = 'none';
                                svg.style.display = 'block';
                                check.className = 'mdef-ts-checkbox state-success';
                                label.textContent = 'Success!';
                                label.style.color = '#059669';
                                if (subIdle) subIdle.style.display = 'none';
                                if (subSuccess) subSuccess.style.display = 'inline';
                                inputToken.value = data2.data.clearance_token;
                                inputSol.value = sol;
                            } else {
                                throw new Error(data2.data?.message || 'Verification rejected');
                            }
                        } catch(e) {
                            isRunning = false;
                            spin.style.display = 'none';
                            check.className = 'mdef-ts-checkbox state-idle';
                            check.style.borderColor = '#ef4444';
                            label.textContent = 'Verification Failed';
                            label.style.color = '#dc2626';
                            if (subIdle) subIdle.textContent = 'Click to retry verification';
                        }
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

    /**
     * Renders Full-Screen Interstitial Page for WordPress Site-Wide Gate
     */
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
            <title>Just a moment... | MDefender Pro</title>
            <style>
                :root {
                    --bg-canvas: #070a13;
                    --card-surface: rgba(15, 23, 42, 0.7);
                    --card-border: rgba(255, 255, 255, 0.08);
                    --accent-blue: #2563eb;
                    --accent-cyan: #06b6d4;
                    --text-heading: #ffffff;
                    --text-body: #94a3b8;
                }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    background-color: var(--bg-canvas);
                    background-image: 
                        radial-gradient(circle at 50% 10%, rgba(37, 99, 235, 0.15) 0%, transparent 55%),
                        radial-gradient(circle at 85% 85%, rgba(6, 182, 212, 0.08) 0%, transparent 45%);
                    color: #f8fafc;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    padding: 24px;
                }
                .challenge-shell {
                    width: 100%;
                    max-width: 490px;
                    background: var(--card-surface);
                    border: 1px solid var(--card-border);
                    border-radius: 20px;
                    padding: 42px 36px 32px;
                    text-align: center;
                    box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 50px rgba(37, 99, 235, 0.1);
                    backdrop-filter: blur(24px);
                    -webkit-backdrop-filter: blur(24px);
                    animation: mdefPop 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes mdefPop {
                    from { opacity: 0; transform: translateY(12px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }

                .shield-pulse-wrapper {
                    position: relative;
                    width: 64px;
                    height: 64px;
                    margin: 0 auto 22px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .pulse-halo {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(37, 99, 235, 0.35) 0%, transparent 70%);
                    animation: haloPulse 2.4s ease-out infinite;
                }
                @keyframes haloPulse {
                    0% { transform: scale(0.9); opacity: 0.8; }
                    50% { transform: scale(1.4); opacity: 0.2; }
                    100% { transform: scale(0.9); opacity: 0.8; }
                }
                .shield-icon {
                    width: 48px;
                    height: 48px;
                    filter: drop-shadow(0 4px 12px rgba(37, 99, 235, 0.5));
                }

                h1 {
                    font-size: 22px;
                    font-weight: 700;
                    letter-spacing: -0.02em;
                    margin-bottom: 8px;
                    color: var(--text-heading);
                }
                p.intro {
                    font-size: 14px;
                    color: var(--text-body);
                    line-height: 1.5;
                    margin-bottom: 28px;
                }
                .site-badge {
                    display: inline-block;
                    color: #e2e8f0;
                    font-weight: 600;
                    background: rgba(255, 255, 255, 0.05);
                    padding: 2px 8px;
                    border-radius: 6px;
                }

                .turnstile-card-box {
                    background: rgba(2, 6, 23, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                    padding: 16px 18px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 28px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .turnstile-card-box:hover {
                    border-color: rgba(37, 99, 235, 0.4);
                    background: rgba(15, 23, 42, 0.8);
                }
                .turnstile-left {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }
                .check-box-holder {
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    border: 2px solid #334155;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    position: relative;
                }
                .check-box-holder.active {
                    border-color: transparent;
                }
                .spinner-rot {
                    width: 22px;
                    height: 22px;
                    border: 2.5px solid rgba(37, 99, 235, 0.2);
                    border-top-color: #2563eb;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    display: none;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                .check-icon-svg {
                    display: none;
                    width: 16px;
                    height: 16px;
                    stroke: #10b981;
                    stroke-width: 3;
                    fill: none;
                }
                .card-labels {
                    text-align: left;
                }
                .main-label {
                    font-size: 14px;
                    font-weight: 600;
                    color: #f1f5f9;
                }
                .sub-label {
                    font-size: 11.5px;
                    color: #64748b;
                }

                .brand-meta {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 2px;
                }
                .brand-title {
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 0.5px;
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .brand-title svg { width: 14px; height: 14px; }
                .brand-legal {
                    font-size: 9px;
                    color: #475569;
                }

                .footer-meta {
                    border-top: 1px solid rgba(255, 255, 255, 0.06);
                    padding-top: 18px;
                    display: flex;
                    justify-content: space-between;
                    font-size: 11.5px;
                    color: #64748b;
                }
                .ray-code {
                    font-family: monospace;
                    color: #94a3b8;
                }
            </style>
        </head>
        <body>
            <div class="challenge-shell">
                <div class="shield-pulse-wrapper">
                    <div class="pulse-halo"></div>
                    <svg class="shield-icon" viewBox="0 0 24 24">
                        <defs>
                            <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="#2563eb" />
                                <stop offset="100%" stop-color="#06b6d4" />
                            </linearGradient>
                        </defs>
                        <path d="M12 2L4 5.5v6c0 5.25 3.4 10.15 8 11.5 4.6-1.35 8-6.25 8-11.5v-6L12 2z" fill="url(#shieldGrad)" />
                        <path d="M12 4.2L5.8 6.9v4.6c0 4.1 2.6 8 6.2 9.1 3.6-1.1 6.2-5 6.2-9.1V6.9L12 4.2z" fill="#070a13" opacity="0.35" />
                        <path d="M9.5 12l1.8 1.8 3.5-3.5" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
                    </svg>
                </div>

                <h1>Checking your browser</h1>
                <p class="intro">
                    Please stand by while we verify your connection to <span class="site-badge"><?php echo esc_html($domain); ?></span>. This automated process completes in a few moments.
                </p>

                <div class="turnstile-card-box" id="interstitialCard">
                    <div class="turnstile-left">
                        <div class="check-box-holder" id="interCheckHolder">
                            <div class="spinner-rot" id="interSpinner"></div>
                            <svg class="check-icon-svg" id="interCheck" viewBox="0 0 24 24">
                                <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <div class="card-labels">
                            <div class="main-label" id="interLabel">Verifying your browser...</div>
                            <div class="sub-label">MDefender Cryptographic PoW</div>
                        </div>
                    </div>
                    <div class="brand-meta">
                        <div class="brand-title">
                            <svg viewBox="0 0 24 24" fill="#3b82f6"><path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"/></svg>
                            MDefender
                        </div>
                        <div class="brand-legal">Cloud Defense</div>
                    </div>
                </div>

                <div class="footer-meta">
                    <div>Ray ID: <span class="ray-code"><?php echo esc_html($ray_id); ?></span></div>
                    <div>Client IP: <span class="ray-code"><?php echo esc_html($ip); ?></span></div>
                </div>
            </div>

            <script>
            var isRunning = false;
            async function solveInterstitial() {
                if (isRunning) return;
                isRunning = true;

                var card = document.getElementById('interstitialCard');
                var holder = document.getElementById('interCheckHolder');
                var spin = document.getElementById('interSpinner');
                var chk = document.getElementById('interCheck');
                var label = document.getElementById('interLabel');

                holder.className = 'check-box-holder active';
                spin.style.display = 'block';
                label.textContent = 'Verifying connection...';

                var t0 = performance.now();

                try {
                    var fd = new FormData();
                    fd.append('action', 'waf_turnstile_challenge');
                    var r1 = await fetch('<?php echo esc_url($ajax_url); ?>', { method: 'POST', body: fd });
                    var data1 = await r1.json();
                    if (!data1.success) throw new Error('Challenge request failed');
                    var ch = data1.data;

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

                    var t1 = performance.now();

                    var fd2 = new FormData();
                    fd2.append('action', 'waf_turnstile_verify');
                    fd2.append('token', ch.token);
                    fd2.append('solution', sol);
                    fd2.append('telemetry[webdriver]', navigator.webdriver === true ? '1' : '0');
                    fd2.append('telemetry[duration_ms]', Math.round(t1 - t0));

                    var r2 = await fetch('<?php echo esc_url($ajax_url); ?>', { method: 'POST', body: fd2 });
                    var data2 = await r2.json();

                    if (data2.success) {
                        spin.style.display = 'none';
                        chk.style.display = 'block';
                        label.textContent = 'Success! Redirecting...';
                        label.style.color = '#10b981';
                        setTimeout(function() {
                            window.location.reload();
                        }, 500);
                    } else {
                        throw new Error('Verification rejected');
                    }
                } catch(e) {
                    isRunning = false;
                    spin.style.display = 'none';
                    label.textContent = 'Failed. Click to retry.';
                    label.style.color = '#f87171';
                }
            }

            window.addEventListener('DOMContentLoaded', function() {
                setTimeout(solveInterstitial, 300);
            });
            </script>
        </body>
        </html>
        <?php
    }
}
