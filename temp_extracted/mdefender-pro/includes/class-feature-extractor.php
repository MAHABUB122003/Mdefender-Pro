<?php
defined('ABSPATH') || exit;

class WAF_FW_Feature_Extractor {
    private static $_instance = null;

    private $sql_patterns = [
        '/select\s+.*\s+from/i', '/insert\s+into/i', '/update\s+.*\s+set/i',
        '/delete\s+from/i', '/drop\s+table/i', '/union\s+select/i',
        '/order\s+by/i', '/group\s+by/i', '/having/i', "/like\s+['\"%]/i",
        '/\/\*.*\*\//', '/--/', '/#/', '/information_schema/i',
        '/pg_sleep/i', '/benchmark/i', '/load_file/i', '/into\s+outfile/i',
    ];
    private $xss_patterns = [
        '/<script/i', '/<\/script>/i', '/javascript:/i', '/onerror=/i',
        '/onload=/i', '/onclick=/i', '/onmouseover=/i', '/alert\(/i',
        '/prompt\(/i', '/confirm\(/i', '/document\./i', '/window\./i',
        '/\.cookie/i', '/localStorage/i', '/eval\(/i', '/setTimeout\(/i',
        '/<iframe/i', '/<object/i', '/<embed/i', '/<svg/i', '/<img/i',
    ];
    private $lfi_patterns = [
        '/\.\.\//', '/\.\.\\\\\\\\/', '/\/etc\/passwd/i', '/\/etc\/shadow/i',
        '/\/etc\/hosts/i', '/c:\\\\windows/i', '/boot\.ini/i',
        '/web\.config/i', '/\.htaccess/i', '/php:\/\//i', '/file:\/\//i',
    ];
    private $ssti_patterns = [
        '/\{\{.*\}\}/', '/\$\{.*\}/', '/#\{.*\}/', '/\*\{.*\}/',
        '/__class__/', '/__mro__/', '/__subclasses__/',
        '/__builtins__/', '/__import__/', '/eval\(/',
    ];
    private $rce_patterns = [
        '/;.*\s+/', '/\|.*\s+/',
        '/`.*`/', '/\$\(.*\)/', '/bash\s+-c/i', '/sh\s+-c/i',
        '/whoami/i', '/id\s+/i', '/uname/i', '/cat\s+/i', '/ls\s+/i',
        '/wget\s+/i', '/curl\s+/i',
    ];
    private $ssrf_patterns = [
        '/169\.254\.169\.254/', '/127\.0\.0\.1/', '/localhost/i',
        '/metadata/i', '/instance-data/i', '/0\.0\.0\.0/',
    ];

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function extract_features($text) {
        if (!is_string($text)) {
            $text = (string) $text;
        }
        $text_lower = strtolower($text);
        $len = strlen($text);
        $features = [];

        $features['length'] = min($len, 2000);
        $features['length_log'] = log(1 + $len);

        $words = str_word_count($text);
        $features['words'] = min($words, 50);
        $features['avg_word_len'] = $len / max(1, $words);

        preg_match_all('/[!@#$%^&*()_+=\[\]{}|;:,.<>?\/\\\\`~"\']/', $text, $special);
        $features['special_chars'] = min(count($special[0]), 50);
        $features['special_ratio'] = count($special[0]) / max(1, $len);

        $features['quotes'] = min(substr_count($text, "'") + substr_count($text, '"'), 20);
        $features['slashes'] = min(substr_count($text, '/') + substr_count($text, '\\'), 20);
        $features['equals'] = min(substr_count($text, '='), 20);
        $features['question'] = min(substr_count($text, '?'), 20);
        $features['percent'] = min(substr_count($text, '%'), 20);
        $features['semicolon'] = min(substr_count($text, ';'), 20);
        $features['ampersand'] = min(substr_count($text, '&'), 20);
        $features['hash'] = min(substr_count($text, '#'), 20);
        $features['colon'] = min(substr_count($text, ':'), 20);
        $features['space'] = min(substr_count($text, ' '), 20);

        preg_match_all('/\d/', $text, $digits);
        $digits_count = count($digits[0]);
        $features['digits'] = min($digits_count, 50);
        $features['digit_ratio'] = $digits_count / max(1, $len);

        $features['has_ip'] = preg_match('/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/', $text) ? 1 : 0;

        preg_match_all('/%[0-9a-fA-F]{2}/', $text, $url_encoded);
        $features['url_encoded'] = min(count($url_encoded[0]), 50);
        $features['has_url_encoding'] = !empty($url_encoded[0]) ? 1 : 0;
        $features['has_double_encoding'] = preg_match('/%25[0-9a-fA-F]{2}/', $text) ? 1 : 0;
        $features['has_unicode'] = preg_match('/\\\\u[0-9a-fA-F]{4}/', $text) ? 1 : 0;

        $sql_score = $this->score_patterns($text_lower, $this->sql_patterns);
        $features['sql_score'] = min($sql_score / 5.0, 1.0);

        $xss_score = $this->score_patterns($text_lower, $this->xss_patterns);
        $features['xss_score'] = min($xss_score / 5.0, 1.0);

        $lfi_score = $this->score_patterns($text_lower, $this->lfi_patterns);
        $features['lfi_score'] = min($lfi_score / 5.0, 1.0);

        $ssti_score = $this->score_patterns($text_lower, $this->ssti_patterns);
        $features['ssti_score'] = min($ssti_score / 5.0, 1.0);

        $rce_score = $this->score_patterns($text_lower, $this->rce_patterns);
        $features['rce_score'] = min($rce_score / 5.0, 1.0);

        $ssrf_score = $this->score_patterns($text_lower, $this->ssrf_patterns);
        $features['ssrf_score'] = min($ssrf_score / 5.0, 1.0);

        $features['total_attack_score'] = min(
            $features['sql_score'] + $features['xss_score'] +
            $features['lfi_score'] + $features['ssti_score'] +
            $features['rce_score'] + $features['ssrf_score'], 1.0
        );

        $features['has_protocol'] = preg_match('/https?:\/\/|ftp:\/\//i', $text) ? 1 : 0;
        $features['has_question'] = strpos($text, '?') !== false ? 1 : 0;
        $features['has_equal'] = strpos($text, '=') !== false ? 1 : 0;
        $features['has_ampersand'] = strpos($text, '&') !== false ? 1 : 0;
        $features['has_underscore'] = strpos($text, '_') !== false ? 1 : 0;
        $features['has_dash'] = strpos($text, '-') !== false ? 1 : 0;
        $features['has_dot'] = strpos($text, '.') !== false ? 1 : 0;
        $features['has_at'] = strpos($text, '@') !== false ? 1 : 0;

        $features['entropy'] = $this->calc_entropy($text);
        $unique = count(array_unique(str_split($text)));
        $features['unique_chars'] = min($unique, 100);
        $features['unique_ratio'] = $unique / max(1, $len);

        return $features;
    }

    private function score_patterns($text, $patterns) {
        $score = 0;
        foreach ($patterns as $pattern) {
            if (@preg_match($pattern, $text)) {
                $score++;
            }
        }
        return $score;
    }

    private function calc_entropy($text) {
        if (empty($text)) return 0;
        $len = strlen($text);
        $chars = array_count_values(str_split($text));
        $entropy = 0;
        foreach ($chars as $count) {
            $p = $count / $len;
            $entropy -= $p * log($p, 2);
        }
        return min($entropy, 8.0);
    }

    public function get_attack_type($features) {
        if (($features['sql_score'] ?? 0) > 0) return 'SQL Injection';
        if (($features['xss_score'] ?? 0) > 0) return 'XSS';
        if (($features['lfi_score'] ?? 0) > 0) return 'LFI';
        if (($features['rce_score'] ?? 0) > 0) return 'Command Injection';
        return 'Suspicious';
    }
}
