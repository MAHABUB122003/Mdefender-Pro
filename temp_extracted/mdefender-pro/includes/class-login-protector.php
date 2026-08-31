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
        if (in_array(strtolower($slug), ['wp-admin', 'wp-login.php', 'wp-login'])) {
            $slug = '';
        }
        $this->custom_login_slug = $slug;

        add_filter('authenticate', [$this, 'check_login_locked'], 30, 2);
        add_action('wp_login_failed', [$this, 'on_login_failed'], 10, 1);
        add_action('wp_login', [$this, 'on_login_success'], 10, 2);

        if ($this->custom_login_slug) {
            add_action('plugins_loaded', [$this, 'handle_custom_login_url'], 1);
            add_action('init', [$this, 'handle_custom_login_url'], 1);
            add_filter('site_url', [$this, 'filter_login_url'], 10, 3);
            add_filter('network_site_url', [$this, 'filter_login_url'], 10, 3);
            add_filter('wp_redirect', [$this, 'filter_login_redirect'], 10, 2);
            add_action('wp_logout', [$this, 'on_logout_redirect']);
        }

        if (get_option('waf_harden_login_captcha', 'no') === 'yes') {
            add_action('login_form', [$this, 'render_captcha_form']);
            add_filter('wp_authenticate_user', [$this, 'validate_captcha'], 10, 2);
            add_action('wp_ajax_waf_captcha_image', [$this, 'generate_captcha_image']);
            add_action('wp_ajax_nopriv_waf_captcha_image', [$this, 'generate_captcha_image']);
        }
    }

    public function handle_custom_login_url() {
        $slug = $this->custom_login_slug;
        if (!$slug) return;

        $request_uri = $_SERVER['REQUEST_URI'] ?? '';
        $request_path = parse_url($request_uri, PHP_URL_PATH);
        $request_path = trim($request_path, '/');

        // 1. Serving the custom secret login URL
        if ($request_path === $slug || $request_path === $slug . '/') {
            if (!defined('MDEFENDER_ALLOWED_LOGIN')) {
                define('MDEFENDER_ALLOWED_LOGIN', true);
            }
            $login_path = ABSPATH . 'wp-login.php';
            if (file_exists($login_path)) {
                status_header(200);
                require_once $login_path;
                exit;
            }
        }

        // 2. Intercept direct access to default wp-login.php or wp-admin
        $is_login_path = (strpos($request_path, 'wp-login.php') !== false);
        $is_admin_path = ($request_path === 'wp-admin' || strpos($request_path, 'wp-admin/') === 0);

        if ($is_login_path || ($is_admin_path && !is_user_logged_in())) {
            $is_ajax = (defined('DOING_AJAX') && DOING_AJAX) || (strpos($request_uri, 'admin-ajax.php') !== false);
            $is_cron = (defined('DOING_CRON') && DOING_CRON);
            $is_admin_post = (strpos($request_uri, 'admin-post.php') !== false);
            $is_allowed = defined('MDEFENDER_ALLOWED_LOGIN') && MDEFENDER_ALLOWED_LOGIN;

            if (!$is_ajax && !$is_cron && !$is_admin_post && !$is_allowed) {
                // Block & Render 404 / 301 Redirect
                $redirect_type = get_option('waf_harden_login_redirect_type', '404');
                if ($redirect_type === '404') {
                    status_header(404);
                    nocache_headers();
                    include get_query_template('404');
                    exit;
                } else {
                    wp_redirect(home_url(), 301);
                    exit;
                }
            }
        }
    }

    public function filter_login_url($url, $path, $scheme) {
        if ($path && strpos($path, 'wp-login.php') !== false && !empty($this->custom_login_slug)) {
            if (is_admin() && !wp_doing_ajax()) return $url;
            return home_url($this->custom_login_slug . '/' . (strpos($path, '?') !== false ? strstr($path, '?') : ''), $scheme);
        }
        return $url;
    }

    public function filter_login_redirect($location, $status) {
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

    public function render_captcha_form() {
        $site_key = get_option('waf_harden_recaptcha_site_key', '');
        $secret_key = get_option('waf_harden_recaptcha_secret_key', '');

        echo '<div style="margin-bottom:16px;">';

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

    public function validate_captcha($user, $password) {
        if (is_wp_error($user)) return $user;

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

        // Log successful login event to Live Admin Attack Stream!
        WAF_FW_Logger::instance()->log_attack([
            'ip' => $ip,
            'url' => $_SERVER['REQUEST_URI'] ?? '/wp-login.php',
            'method' => $_SERVER['REQUEST_METHOD'] ?? 'POST',
            'attack_type' => 'Successful Login (User: ' . sanitize_text_field($user_login) . ')',
            'status' => 'allowed',
            'rule_matched' => 'User Authentication Success',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            'details' => ['username' => $user_login, 'event' => 'login_success']
        ]);
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
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            return trim($ips[0]);
        }
        if (!empty($_SERVER['HTTP_X_REAL_IP'])) {
            return $_SERVER['HTTP_X_REAL_IP'];
        }
        return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    }
}
