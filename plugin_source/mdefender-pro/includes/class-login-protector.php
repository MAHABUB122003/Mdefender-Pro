<?php
defined('ABSPATH') || exit;

class WAF_FW_Login_Protector {
    private static $_instance = null;
    private $custom_login_slug = '';

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function register_hooks() {
        $slug = trim(get_option('waf_harden_login_rename', ''));
        $hide_login_enabled = get_option('waf_harden_hide_login_url', 'no') === 'yes' || get_option('waf_hide_login_url', 'no') === 'yes';
        $permalink_structure = get_option('permalink_structure', '');

        // SAFETY: Only rename/hide login if explicitly enabled, non-empty, permalinks active, and not default admin/login
        if (!$hide_login_enabled || empty($slug) || empty($permalink_structure) || in_array(strtolower($slug), ['wp-admin', 'wp-login.php', 'wp-login'])) {
            $slug = '';
        }
        $this->custom_login_slug = $slug;

        add_filter('authenticate', [$this, 'check_login_locked'], 30, 2);
        add_action('wp_login_failed', [$this, 'on_login_failed'], 10, 1);
        add_action('wp_login', [$this, 'on_login_success'], 10, 2);

        if ($this->custom_login_slug) {
            add_action('plugins_loaded', [$this, 'handle_custom_login_url'], 1);
            add_action('init', [$this, 'handle_custom_login_url'], 1);
            add_filter('site_url', [$this, 'filter_site_url'], 10, 3);
            add_filter('network_site_url', [$this, 'filter_site_url'], 10, 3);
            add_filter('login_url', [$this, 'filter_login_url'], 10, 3);
            add_filter('logout_url', [$this, 'filter_logout_url'], 10, 2);
            add_filter('lostpassword_url', [$this, 'filter_lostpassword_url'], 10, 2);
            add_filter('register_url', [$this, 'filter_register_url'], 10, 2);
            add_filter('wp_redirect', [$this, 'filter_login_redirect'], 10, 2);
            add_action('wp_logout', [$this, 'on_logout_redirect']);
        }

        $hold_press_active = get_option('waf_hold_press_enabled', 'yes') === 'yes';
        $captcha_active = get_option('waf_harden_login_captcha', 'no') === 'yes';
        if ($hold_press_active || $captcha_active) {
            add_action('login_form', [$this, 'render_captcha_form'], 20);
            add_filter('authenticate', [$this, 'validate_login_challenge'], 10, 3);
            add_filter('wp_authenticate_user', [$this, 'validate_captcha'], 10, 2);
            add_action('wp_ajax_waf_captcha_image', [$this, 'generate_captcha_image']);
            add_action('wp_ajax_nopriv_waf_captcha_image', [$this, 'generate_captcha_image']);
        }
    }

    public function handle_custom_login_url() {
        $slug = $this->custom_login_slug;
        if (!$slug) return;

        // Emergency admin bypass
        if (isset($_GET['mdefender_bypass']) || isset($_GET['waf_login_restore'])) {
            return;
        }

        $request_uri = $_SERVER['REQUEST_URI'] ?? '';
        $raw_path = parse_url($request_uri, PHP_URL_PATH) ?? '';
        
        $home_path = parse_url(home_url(), PHP_URL_PATH) ?: '';
        $path = $raw_path;
        if (!empty($home_path) && strpos($path, $home_path) === 0) {
            $path = substr($path, strlen($home_path));
        }
        $trimmed_path = trim($path, '/');

        // 1. Serving the custom secret login URL
        if ($trimmed_path === $slug) {
            if (!defined('MDEFENDER_ALLOWED_LOGIN')) {
                define('MDEFENDER_ALLOWED_LOGIN', true);
            }
            
            global $error, $interim_login, $action, $user_login, $user_ID, $current_site, $wp_hasher;
            
            $_SERVER['SCRIPT_NAME'] = '/wp-login.php';
            $_SERVER['PHP_SELF'] = '/wp-login.php';

            $login_path = ABSPATH . 'wp-login.php';
            if (file_exists($login_path)) {
                status_header(200);
                require_once $login_path;
                exit;
            }
        }

        // 2. Intercept direct access to default wp-login.php or wp-admin
        $is_login_path = (strpos($raw_path, 'wp-login.php') !== false);
        $is_admin_path = ($trimmed_path === 'wp-admin' || strpos($trimmed_path, 'wp-admin/') === 0);

        if ($is_login_path || ($is_admin_path && !is_user_logged_in())) {
            $is_ajax = (defined('DOING_AJAX') && DOING_AJAX) || (strpos($request_uri, 'admin-ajax.php') !== false);
            $is_cron = (defined('DOING_CRON') && DOING_CRON);
            $is_admin_post = (strpos($request_uri, 'admin-post.php') !== false);
            $is_allowed = (defined('MDEFENDER_ALLOWED_LOGIN') && MDEFENDER_ALLOWED_LOGIN);

            if (!$is_ajax && !$is_cron && !$is_admin_post && !$is_allowed) {
                $redirect_type = get_option('waf_harden_login_redirect_type', '404');
                if ($redirect_type === '404') {
                    status_header(404);
                    nocache_headers();
                    $this->render_fallback_404();
                    exit;
                } else {
                    wp_redirect(home_url(), 301);
                    exit;
                }
            }
        }
    }

    public function render_fallback_404() {
        $site_name = get_bloginfo('name') ?: 'Website';
        $home_url = home_url('/');
        ?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Page not found &#8211; <?php echo esc_html($site_name); ?></title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
            background-color: #ffffff;
            color: #1a1a1a;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
        }
        .wp-site-header {
            padding: 24px 40px;
            border-bottom: 1px solid #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .wp-site-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: #0f172a;
            text-decoration: none;
            letter-spacing: -0.01em;
        }
        .wp-site-title:hover {
            color: #2563eb;
        }
        .wp-main-content {
            flex: 1;
            max-width: 720px;
            width: 100%;
            margin: 70px auto;
            padding: 0 24px;
            text-align: left;
        }
        .wp-error-title {
            font-size: 2.5rem;
            font-weight: 800;
            letter-spacing: -0.02em;
            color: #0f172a;
            margin-bottom: 16px;
            line-height: 1.2;
        }
        .wp-error-desc {
            font-size: 1.125rem;
            color: #475569;
            margin-bottom: 28px;
            line-height: 1.7;
        }
        .wp-search-form {
            display: flex;
            gap: 10px;
            margin-bottom: 36px;
            max-width: 520px;
        }
        .wp-search-input {
            flex: 1;
            padding: 12px 16px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            font-size: 1rem;
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .wp-search-input:focus {
            border-color: #0f172a;
            box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.1);
        }
        .wp-search-btn {
            padding: 12px 24px;
            background: #0f172a;
            color: #ffffff;
            border: none;
            border-radius: 6px;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .wp-search-btn:hover {
            background: #334155;
        }
        .wp-back-home {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: #2563eb;
            text-decoration: none;
            font-weight: 600;
            font-size: 1rem;
        }
        .wp-back-home:hover {
            text-decoration: underline;
        }
        .wp-site-footer {
            padding: 24px 40px;
            border-top: 1px solid #f1f5f9;
            font-size: 0.875rem;
            color: #94a3b8;
            text-align: center;
        }
        .wp-site-footer a {
            color: #64748b;
            text-decoration: none;
        }
        .wp-site-footer a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body class="error404 wp-theme-default">
    <header class="wp-site-header">
        <a href="<?php echo esc_url($home_url); ?>" class="wp-site-title"><?php echo esc_html($site_name); ?></a>
    </header>

    <main class="wp-main-content">
        <h1 class="wp-error-title">Page not found</h1>
        <p class="wp-error-desc">Oops! That page can&rsquo;t be found. It looks like nothing was found at this location. Maybe try a search?</p>

        <form role="search" method="get" class="wp-search-form" action="<?php echo esc_url($home_url); ?>">
            <input type="search" class="wp-search-input" placeholder="Search..." name="s" value="" required>
            <button type="submit" class="wp-search-btn">Search</button>
        </form>

        <p>
            <a href="<?php echo esc_url($home_url); ?>" class="wp-back-home">&larr; Return to Homepage</a>
        </p>
    </main>

    <footer class="wp-site-footer">
        <p>&copy; <?php echo date('Y'); ?> <a href="<?php echo esc_url($home_url); ?>"><?php echo esc_html($site_name); ?></a>. All rights reserved.</p>
    </footer>
</body>
</html>
        <?php
    }

    public function filter_site_url($url, $path = '', $scheme = null) {
        if (empty($this->custom_login_slug)) return $url;
        if ($path && strpos($path, 'wp-login.php') !== false) {
            if (is_admin() && !wp_doing_ajax()) return $url;
            $query = strpos($path, '?') !== false ? strstr($path, '?') : '';
            return home_url($this->custom_login_slug . '/' . $query, $scheme);
        }
        return $url;
    }

    public function filter_login_url($url, $redirect = '', $force_reauth = false) {
        if (empty($this->custom_login_slug)) return $url;
        $args = [];
        if (!empty($redirect)) $args['redirect_to'] = urlencode($redirect);
        if ($force_reauth) $args['reauth'] = '1';
        return add_query_arg($args, home_url($this->custom_login_slug . '/'));
    }

    public function filter_logout_url($url, $redirect = '') {
        if (empty($this->custom_login_slug)) return $url;
        $args = ['action' => 'logout'];
        if (!empty($redirect)) $args['redirect_to'] = urlencode($redirect);
        $args['_wpnonce'] = wp_create_nonce('log-out');
        return add_query_arg($args, home_url($this->custom_login_slug . '/'));
    }

    public function filter_lostpassword_url($url, $redirect = '') {
        if (empty($this->custom_login_slug)) return $url;
        $args = ['action' => 'lostpassword'];
        if (!empty($redirect)) $args['redirect_to'] = urlencode($redirect);
        return add_query_arg($args, home_url($this->custom_login_slug . '/'));
    }

    public function filter_register_url($url) {
        if (empty($this->custom_login_slug)) return $url;
        return add_query_arg(['action' => 'register'], home_url($this->custom_login_slug . '/'));
    }

    public function filter_login_redirect($location, $status) {
        if (empty($this->custom_login_slug)) return $location;
        if (strpos($location, 'wp-login.php') !== false) {
            $location = str_replace('wp-login.php', $this->custom_login_slug, $location);
        }
        return $location;
    }

    public function on_logout_redirect() {
        if ($this->custom_login_slug) {
            wp_redirect(home_url($this->custom_login_slug));
            exit;
        }
    }

    /* =====================================================================
       ADVANCED CAPTCHA  (reCAPTCHA v2 + honeypot + math fallback)
       ===================================================================== */

        /* =====================================================================
       MDEFENDER PRO ADVANCED BOT DEFENSE & BIOMETRIC VERIFICATION
       ===================================================================== */

    public function render_captcha_form() {
        $hold_press_enabled = get_option('waf_hold_press_enabled', 'yes') === 'yes';
        if ($hold_press_enabled) {
            $this->render_hold_press_challenge();
            return;
        }

        if (get_option('waf_fw_turnstile_enabled', get_option('waf_turnstile_enabled', 'no')) === 'yes') {
            return; // Managed by Turnstile class
        }

        $site_key = get_option('waf_harden_recaptcha_site_key', '');
        $secret_key = get_option('waf_harden_recaptcha_secret_key', '');

        echo '<div style="margin: 14px 0 16px; background: #ffffff; border: 1px solid #dcdfe4; border-radius: 8px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-family: -apple-system, BlinkMacSystemFont, sans-serif;">';

        if ($site_key && $secret_key) {
            $this->render_recaptcha($site_key);
        } elseif (function_exists('imagecreatetruecolor')) {
            $this->render_image_captcha();
        } else {
            $this->render_math_captcha();
        }

        $this->render_honeypot();

        echo '</div>';
    }

    /**
     * MDefender Pro Unbypassable Biometric 'Press & Hold' Challenge
     */
    public function render_hold_press_challenge() {
        $client_ip = $this->get_client_ip();
        $render_time = time();
        $seed_nonce = bin2hex(random_bytes(16));
        $duration_ms = intval(get_option('waf_hold_press_duration_ms', 2000));
        if ($duration_ms < 1000 || $duration_ms > 5000) $duration_ms = 2000;

        $secret = wp_salt('nonce') . '|mdefender_biometric_salt';
        $payload = "{$client_ip}|{$render_time}|{$seed_nonce}|{$duration_ms}";
        $sig = hash_hmac('sha256', $payload, $secret);
        $token = base64_encode("{$payload}|{$sig}");

        // Store active seed in transient with 300s expiration
        set_transient("mdf_hp_{$seed_nonce}", $client_ip, 300);
        ?>
        <div class="mdf-hold-press-wrapper" style="margin: 18px 0; padding: 14px 16px; background: #081412; border: 1px solid #1a3832; border-radius: 12px; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; user-select: none; box-shadow: 0 4px 16px rgba(0,0,0,0.25);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; padding: 0 2px;">
                <span style="font-size: 11px; font-weight: 700; color: #87a49e; letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 5px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2A8B68" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    MDEFENDER PRO
                </span>
                <span id="mdfHoldStatus" style="font-size: 10.5px; font-weight: 600; color: #53756e;">Verification Gateway</span>
            </div>
            <button type="button" id="mdfHoldButton" style="width: 100%; height: 48px; position: relative; overflow: hidden; border: 1.5px solid #234d44; background: #0c1e1b; color: #FFFFFF; font-weight: 700; font-size: 13.5px; border-radius: 10px; cursor: pointer; transition: border-color 0.2s, background 0.2s; outline: none;">
                <span id="mdfHoldProgress" style="position: absolute; left: 0; top: 0; bottom: 0; width: 0%; background: linear-gradient(90deg, #184e44, #2A8B68); opacity: 0.85; transition: width 0.04s linear; pointer-events: none;"></span>
                <span id="mdfHoldText" style="position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; gap: 9px; pointer-events: none;">
                    <svg id="mdfIconFp" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#F38A3E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/>
                        <path d="M5 19.5C5.5 18 6 15 6 12c0-.7.1-1.4.3-2"/>
                        <path d="M17.7 17.7A10 10 0 0 0 22 12c0-1.8-.5-3.5-1.4-5"/>
                        <path d="M9 21c.5-1 1-2.5 1-4.5 0-2.5 1-4 2-4s2 1.5 2 4c0 1.5.3 2.8.7 3.5"/>
                        <path d="M12 7v5"/>
                    </svg>
                    <span id="mdfLabel">Press &amp; Hold</span>
                </span>
            </button>
            <input type="hidden" name="waf_hold_press_token" id="mdfHoldToken" value="<?php echo esc_attr($token); ?>" />
            <input type="hidden" name="waf_hold_press_proof" id="mdfHoldProof" value="" />
            <script>
            (function(){
                var btn = document.getElementById('mdfHoldButton');
                var prog = document.getElementById('mdfHoldProgress');
                var label = document.getElementById('mdfLabel');
                var iconFp = document.getElementById('mdfIconFp');
                var pField = document.getElementById('mdfHoldProof');
                var stat = document.getElementById('mdfHoldStatus');
                var holdTimer = null;
                var startTime = 0;
                var duration = <?php echo intval($duration_ms); ?>;
                var isVerified = false;
                var jitterCount = 0;

                function onMove() { jitterCount++; }
                window.addEventListener('mousemove', onMove);
                window.addEventListener('touchmove', onMove);

                function startHold(e) {
                    if (isVerified) return;
                    e.preventDefault();
                    startTime = Date.now();
                    btn.style.borderColor = '#2A8B68';
                    btn.style.boxShadow = '0 0 14px rgba(42, 139, 104, 0.35)';
                    holdTimer = setInterval(function() {
                        var elapsed = Date.now() - startTime;
                        var pct = Math.min(100, (elapsed / duration) * 100);
                        prog.style.width = pct + '%';
                        if (elapsed >= duration) {
                            clearInterval(holdTimer);
                            isVerified = true;
                            pField.value = btoa(elapsed + '|' + jitterCount);
                            prog.style.background = '#2A8B68';
                            prog.style.width = '100%';
                            btn.style.borderColor = '#2A8B68';
                            btn.style.background = '#0e2b25';
                            btn.style.cursor = 'default';
                            label.innerText = 'Human Verified';
                            iconFp.outerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2A8B68" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                            stat.innerText = 'Verified';
                            stat.style.color = '#2A8B68';
                        }
                    }, 25);
                }

                function stopHold() {
                    if (isVerified) return;
                    clearInterval(holdTimer);
                    prog.style.width = '0%';
                    btn.style.borderColor = '#234d44';
                    btn.style.boxShadow = 'none';
                }

                btn.addEventListener('mousedown', startHold);
                btn.addEventListener('mouseup', stopHold);
                btn.addEventListener('mouseleave', stopHold);
                btn.addEventListener('touchstart', startHold);
                btn.addEventListener('touchend', stopHold);
            })();
            </script>
        </div>
        <?php
    }

    private function render_recaptcha($site_key) {
        wp_enqueue_script('google-recaptcha', 'https://www.google.com/recaptcha/api.js', [], null, true);
        ?>
        <div class="g-recaptcha" data-sitekey="<?php echo esc_attr($site_key); ?>" style="margin-bottom:10px;"></div>
        <input type="hidden" name="waf_captcha_type" value="recaptcha" />
        <?php
    }

    private function render_image_captcha() {
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $code = '';
        $len = 5;
        for ($i = 0; $i < $len; $i++) {
            $code .= $chars[rand(0, strlen($chars) - 1)];
        }
        $hash = wp_hash($code . time() . wp_rand());
        $key = 'waf_captcha_' . md5($hash);
        set_transient($key, $code, 300);
        $img_url = admin_url('admin-ajax.php?action=waf_captcha_image&hash=' . urlencode($hash) . '&t=' . time());
        ?>
        <p style="margin-bottom:8px;">
            <label for="waf_captcha">Type the characters shown below:</label>
        </p>
        <p style="margin-bottom:8px;text-align:center;">
            <img src="<?php echo esc_url($img_url); ?>" alt="CAPTCHA" style="border:1px solid #ccc;border-radius:4px;max-width:100%;height:auto;" />
        </p>
        <p style="margin-bottom:4px;">
            <input type="text" name="waf_captcha" id="waf_captcha" class="input" value="" size="20" autocomplete="off" required style="text-transform:uppercase;" placeholder="Enter code" />
            <input type="hidden" name="waf_captcha_hash" value="<?php echo esc_attr($hash); ?>" />
            <input type="hidden" name="waf_captcha_type" value="image" />
        </p>
        <?php
    }

    private function render_math_captcha() {
        $ops = ['+', '-', "\xC3\x97"];
        $op = $ops[array_rand($ops)];
        if ($op === "\xC3\x97") {
            $a = rand(2, 9);
            $b = rand(2, 9);
            $answer = $a * $b;
            $display = $a . ' &times; ' . $b;
        } else {
            $a = rand(5, 50);
            $b = rand(1, 25);
            if ($op === '-' && $a < $b) { list($a, $b) = [$b, $a]; }
            $answer = $op === '+' ? ($a + $b) : ($a - $b);
            $display = $a . ' ' . $op . ' ' . $b;
        }
        $hash = wp_hash($a . $op . $b . time() . wp_rand());
        $key = 'waf_captcha_' . md5($hash);
        set_transient($key, $answer, 300);
        ?>
        <p style="margin-bottom:6px;">
            <label for="waf_captcha">Security Question: <?php echo $display; ?> = ?</label>
        </p>
        <p style="margin-bottom:4px;">
            <input type="number" name="waf_captcha" id="waf_captcha" class="input" value="" size="20" autocomplete="off" required />
            <input type="hidden" name="waf_captcha_hash" value="<?php echo esc_attr($hash); ?>" />
            <input type="hidden" name="waf_captcha_type" value="math" />
        </p>
        <?php
    }

    private function render_honeypot() {
        ?>
        <p style="display:none !important;position:absolute !important;left:-9999px !important;">
            <label for="waf_website">Website</label>
            <input type="text" name="waf_website" id="waf_website" value="" tabindex="-1" autocomplete="off" />
        </p>
        <?php
    }

    public function generate_captcha_image() {
        $hash = sanitize_text_field($_GET['hash'] ?? '');
        if (!$hash) {
            $this->output_blank_image();
            exit;
        }
        $key = 'waf_captcha_' . md5($hash);
        $code = get_transient($key);
        if ($code === false) {
            $this->output_blank_image();
            exit;
        }

        $width = 160;
        $height = 50;
        $img = imagecreatetruecolor($width, $height);

        $bg = imagecolorallocate($img, 245, 247, 250);
        $text_colors = [
            imagecolorallocate($img, 30, 64, 175),
            imagecolorallocate($img, 180, 40, 40),
            imagecolorallocate($img, 20, 120, 60),
            imagecolorallocate($img, 140, 80, 20),
        ];
        $line_color = imagecolorallocate($img, 200, 210, 220);
        $noise_color = imagecolorallocate($img, 180, 190, 200);

        imagefilledrectangle($img, 0, 0, $width, $height, $bg);

        for ($i = 0; $i < 4; $i++) {
            imageline($img, rand(0, $width), rand(0, $height), rand(0, $width), rand(0, $height), $line_color);
        }

        for ($i = 0; $i < 80; $i++) {
            imagesetpixel($img, rand(0, $width), rand(0, $height), $noise_color);
        }

        $font = $this->get_captcha_font();
        if ($font && function_exists('imagettftext')) {
            $font_size = 22;
            $x = 12;
            for ($i = 0; $i < strlen($code); $i++) {
                $color = $text_colors[$i % count($text_colors)];
                $angle = rand(-25, 25);
                $y = rand(32, 40);
                $char = $code[$i];
                $box = imagettfbbox($font_size, 0, $font, $char);
                $char_w = $box[2] - $box[0];
                $spacing = rand(6, 10);
                imagettftext($img, $font_size, $angle, $x, $y, $color, $font, $char);
                $x += $char_w + $spacing;
            }
        } else {
            $font_size = 5;
            $x = 10;
            $colors = [imagecolorallocate($img, 30, 64, 175), imagecolorallocate($img, 180, 40, 40)];
            for ($i = 0; $i < strlen($code); $i++) {
                $color = $colors[$i % 2];
                $y = rand(14, 30);
                imagestring($img, $font_size, $x, $y, $code[$i], $color);
                $x += rand(22, 30);
            }
        }

        header('Content-Type: image/png');
        header('Cache-Control: no-store, no-cache, must-revalidate');
        imagepng($img);
        imagedestroy($img);
        exit;
    }

    private function get_captcha_font() {
        $fonts = [
            WAF_FW_PLUGIN_DIR . 'assets/fonts/arial.ttf',
            WAF_FW_PLUGIN_DIR . 'assets/fonts/verdana.ttf',
            WAF_FW_PLUGIN_DIR . 'assets/fonts/opensans.ttf',
        ];
        foreach ($fonts as $f) {
            if (file_exists($f)) return $f;
        }
        $sys_fonts = [
            'C:/Windows/Fonts/arial.ttf',
            'C:/Windows/Fonts/verdana.ttf',
            'C:/Windows/Fonts/calibri.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
        ];
        foreach ($sys_fonts as $f) {
            if (file_exists($f)) return $f;
        }
        return '';
    }

    private function output_blank_image() {
        $img = imagecreatetruecolor(160, 50);
        $bg = imagecolorallocate($img, 245, 247, 250);
        imagefilledrectangle($img, 0, 0, 160, 50, $bg);
        header('Content-Type: image/png');
        header('Cache-Control: no-store');
        imagepng($img);
        imagedestroy($img);
    }

        /**
     * MDefender Pro Unbypassable Biometric 'Press & Hold' Challenge Pre-Validation
     * Hooks into 'authenticate' filter (priority 10) to block automated brute-force scripts before credentials check
     */
    public function validate_login_challenge($user, $username, $password) {
        if (defined('DOING_CRON') && DOING_CRON) return $user;
        if (defined('XMLRPC_REQUEST') && XMLRPC_REQUEST) return $user;
        if (empty($_POST) || !isset($_POST['log'])) {
            return $user;
        }
        if (is_wp_error($user)) return $user;

        $hold_press_enabled = get_option('waf_hold_press_enabled', 'yes') === 'yes';
        if ($hold_press_enabled) {
            $token_raw = sanitize_text_field($_POST['waf_hold_press_token'] ?? '');
            $proof_raw = sanitize_text_field($_POST['waf_hold_press_proof'] ?? '');

            if (empty($token_raw) || empty($proof_raw)) {
                remove_filter('authenticate', 'wp_authenticate_username_password', 20);
                remove_filter('authenticate', 'wp_authenticate_email_password', 20);
                return new WP_Error('waf_hold_fail', '<strong>Bot Verification Required:</strong> Please press and hold the security button to authenticate as a human.');
            }

            $decoded = base64_decode($token_raw);
            if (!$decoded) {
                remove_filter('authenticate', 'wp_authenticate_username_password', 20);
                remove_filter('authenticate', 'wp_authenticate_email_password', 20);
                return new WP_Error('waf_hold_fail', '<strong>Security Verification Failed:</strong> Malformed token.');
            }

            $parts = explode('|', $decoded);
            if (count($parts) !== 5) {
                remove_filter('authenticate', 'wp_authenticate_username_password', 20);
                remove_filter('authenticate', 'wp_authenticate_email_password', 20);
                return new WP_Error('waf_hold_fail', '<strong>Security Verification Failed:</strong> Invalid token structure.');
            }

            list($tok_ip, $render_time, $seed_nonce, $dur_str, $tok_sig) = $parts;
            $client_ip = $this->get_client_ip();

            // Verify HMAC signature
            $secret = wp_salt('nonce') . '|mdefender_biometric_salt';
            $expected_sig = hash_hmac('sha256', "{$tok_ip}|{$render_time}|{$seed_nonce}|{$dur_str}", $secret);
            if (!hash_equals($expected_sig, $tok_sig)) {
                return new WP_Error('waf_hold_fail', '<strong>Security Verification Failed:</strong> Tampered signature.');
            }

            // Check IP match (anti-token-hijacking)
            if ($client_ip !== $tok_ip && $tok_ip !== '127.0.0.1' && $client_ip !== '127.0.0.1' && $client_ip !== '::1') {
                return new WP_Error('waf_hold_fail', '<strong>Security Verification Failed:</strong> Network mismatch.');
            }

            // Replay Attack check & Token Burn
            $transient_key = "mdf_hp_{$seed_nonce}";
            $saved_ip = get_transient($transient_key);
            if (!$saved_ip) {
                return new WP_Error('waf_hold_fail', '<strong>Security Verification Expired:</strong> Challenge token already used or expired. Please reload.');
            }
            delete_transient($transient_key); // BURN TOKEN IMMEDIATELY!

            // Human Timing check: Form submit cannot be faster than the required hold time
            $elapsed_since_render = time() - intval($render_time);
            $required_seconds = max(1, floor(intval($dur_str) / 1000));
            if ($elapsed_since_render < $required_seconds) {
                return new WP_Error('waf_hold_fail', '<strong>Bot Detected:</strong> Automated submission was too fast.');
            }

            return $user; // Biometric Passed!
        }

        return $user;
    }

    public function validate_captcha($user, $password) {
        if (is_wp_error($user)) return $user;

        $hold_press_enabled = get_option('waf_hold_press_enabled', 'yes') === 'yes';
        if ($hold_press_enabled) {
            return $user; // Handled strictly in validate_login_challenge on authenticate filter
        }

        $honeypot = $_POST['waf_website'] ?? '';
        if (!empty($honeypot)) {
            return new WP_Error('waf_captcha_bot', 'Your submission was flagged as spam.');
        }

        $type = sanitize_text_field($_POST['waf_captcha_type'] ?? '');

        if ($type === 'recaptcha') {
            return $this->validate_recaptcha($user);
        }

        $hash = sanitize_text_field($_POST['waf_captcha_hash'] ?? '');
        $answer = sanitize_text_field($_POST['waf_captcha'] ?? '');
        if (!$hash || $answer === '') {
            return new WP_Error('waf_captcha_empty', 'Please complete the security check.');
        }
        $key = 'waf_captcha_' . md5($hash);
        $expected = get_transient($key);
        if ($expected === false) {
            return new WP_Error('waf_captcha_expired', 'Security check expired. Please refresh and try again.');
        }
        delete_transient($key);

        if ($type === 'image') {
            if (strtoupper(trim($answer)) !== strtoupper(trim($expected))) {
                return new WP_Error('waf_captcha_wrong', 'Incorrect code entered. Please try again.');
            }
        } elseif ((int)$answer !== (int)$expected) {
            return new WP_Error('waf_captcha_wrong', 'Incorrect answer. Please try again.');
        }

        return $user;
    }

    private function validate_recaptcha($user) {
        $secret = get_option('waf_harden_recaptcha_secret_key', '');
        $response = sanitize_text_field($_POST['g-recaptcha-response'] ?? '');
        if (!$response) {
            return new WP_Error('waf_captcha_recaptcha', 'Please complete the reCAPTCHA verification.');
        }
        $verify = wp_remote_post('https://www.google.com/recaptcha/api/siteverify', [
            'body' => [
                'secret' => $secret,
                'response' => $response,
                'remoteip' => $this->get_client_ip(),
            ],
        ]);
        if (is_wp_error($verify)) {
            return new WP_Error('waf_captcha_error', 'reCAPTCHA verification failed. Please try again.');
        }
        $result = json_decode(wp_remote_retrieve_body($verify), true);
        if (empty($result['success'])) {
            return new WP_Error('waf_captcha_recaptcha_fail', 'reCAPTCHA verification failed. Please try again.');
        }
        return $user;
    }

    /* =====================================================================
       BRUTE FORCE THRESHOLDS & TEMPORARY LOCKOUTS
       ===================================================================== */

    public function check_login_locked($user, $username) {
        if (empty($username)) return $user;

        $enabled = get_option('waf_fw_login_lockout_enabled', 'yes');
        if ($enabled !== 'yes') return $user;

        $ip = $this->get_client_ip();
        if (WAF_FW_IP_Filter::instance()->is_whitelisted($ip)) return $user;

        if ($this->is_login_locked($ip)) {
            $duration = $this->get_lockout_duration();
            $remaining = $this->get_remaining_block_time($ip);
            $minutes = ceil($remaining / 60);
            return new WP_Error(
                'waf_login_locked',
                sprintf(
                    'Too many failed login attempts from your IP. Please try again in approximately %d minute(s).',
                    $minutes
                )
            );
        }

        return $user;
    }

    public function on_login_failed($username) {
        $ip = $this->get_client_ip();

        // Log failed login attempt to Live Admin Attack Stream!
        WAF_FW_Logger::instance()->log_attack([
            'ip' => $ip,
            'url' => $_SERVER['REQUEST_URI'] ?? '/wp-login.php',
            'method' => $_SERVER['REQUEST_METHOD'] ?? 'POST',
            'attack_type' => 'Failed Login (User: ' . sanitize_text_field($username) . ')',
            'status' => 'blocked',
            'rule_matched' => 'Brute Force Login Protection',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            'details' => ['username' => $username, 'event' => 'login_failed']
        ]);

        $enabled = get_option('waf_fw_login_lockout_enabled', 'yes');
        if ($enabled !== 'yes') return;

        if (WAF_FW_IP_Filter::instance()->is_whitelisted($ip)) return;

        $this->increment_attempts($ip);

        $attempts = $this->get_attempts($ip);
        $threshold = $this->get_brute_force_threshold();

        if ($attempts >= $threshold) {
            $this->auto_block_ip($ip);
        }
    }

    public function on_login_success($user_login, $user) {
        $ip = $this->get_client_ip();
        $this->clear_attempts($ip);

        // Request is already captured once by the WAF engine upon request ingress.
    }

    public function get_attempts($ip) {
        global $wpdb;
        $table = WAF_FW_DB::instance()->get_login_attempts_table();
        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT attempts FROM $table WHERE ip = %s",
            $ip
        ));
        return $row ? (int) $row->attempts : 0;
    }

    public function increment_attempts($ip) {
        global $wpdb;
        $table = WAF_FW_DB::instance()->get_login_attempts_table();
        $now = current_time('mysql');

        $exists = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $table WHERE ip = %s",
            $ip
        ));

        if ($exists) {
            $wpdb->query($wpdb->prepare(
                "UPDATE $table SET attempts = attempts + 1, last_attempt = %s WHERE ip = %s",
                $now,
                $ip
            ));
        } else {
            $wpdb->insert($table, [
                'ip' => $ip,
                'attempts' => 1,
                'first_attempt' => $now,
                'last_attempt' => $now,
            ]);
        }
    }

    public function clear_attempts($ip) {
        global $wpdb;
        $table = WAF_FW_DB::instance()->get_login_attempts_table();
        $wpdb->delete($table, ['ip' => $ip]);
    }

    public function is_login_locked($ip) {
        global $wpdb;
        $table = WAF_FW_DB::instance()->get_blacklist_table();
        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT block_expires_at FROM $table WHERE ip = %s AND type = 'temporary' AND block_expires_at IS NOT NULL",
            $ip
        ));
        if (!$row) return false;

        if (strtotime($row->block_expires_at) <= current_time('timestamp')) {
            $wpdb->delete($table, ['ip' => $ip]);
            return false;
        }
        return true;
    }

    public function get_remaining_block_time($ip) {
        global $wpdb;
        $table = WAF_FW_DB::instance()->get_blacklist_table();
        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT block_expires_at FROM $table WHERE ip = %s AND block_expires_at IS NOT NULL",
            $ip
        ));
        if (!$row) return 0;

        $expires = strtotime($row->block_expires_at);
        $now = current_time('timestamp');
        return max(0, $expires - $now);
    }

    public function auto_block_ip($ip) {
        $duration = $this->get_lockout_duration();
        $threshold = $this->get_brute_force_threshold();
        $reason = sprintf(
            'Auto-blocked after %d failed login attempts',
            $threshold
        );
        WAF_FW_IP_Filter::instance()->add_temporary_block($ip, $reason, $duration);
    }

    public function get_blocked_login_count() {
        global $wpdb;
        $table = WAF_FW_DB::instance()->get_blacklist_table();
        return (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM $table WHERE type = 'temporary' AND (block_expires_at IS NULL OR block_expires_at > NOW())"
        );
    }

    private function get_brute_force_threshold() {
        $harden = get_option('waf_harden_brute_force_threshold', '');
        return $harden !== '' ? (int) $harden : (int) get_option('waf_fw_login_threshold', 10);
    }

    private function get_lockout_duration() {
        $harden = get_option('waf_harden_login_lockout_time', '');
        return $harden !== '' ? (int) $harden : (int) get_option('waf_fw_login_block_duration', 86400);
    }

    private function get_client_ip() {
        if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
            return trim($_SERVER['HTTP_CF_CONNECTING_IP']);
        }
        if (!empty($_SERVER['HTTP_X_REAL_IP'])) {
            return trim($_SERVER['HTTP_X_REAL_IP']);
        }
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            return trim($ips[0]);
        }
        return trim($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
    }
}
