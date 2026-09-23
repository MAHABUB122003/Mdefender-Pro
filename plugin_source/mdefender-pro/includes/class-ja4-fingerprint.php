<?php
/**
 * MDefender-Pro JA4 / JA4H Client Fingerprinting & Bot Armor Engine
 *
 * Implements modern JA4H (HTTP Client Fingerprinting) based on:
 * - HTTP Request Method
 * - HTTP Protocol Version
 * - Exact ordering and casing of client request headers
 * - Accept-Language and Cookie header signatures
 *
 * Identifies automated AI scrapers, headless browser botnets, and API fuzzers
 * regardless of proxy or residential IP rotation.
 *
 * @package MDefender-Pro
 */

defined('ABSPATH') || exit;

class WAF_FW_JA4_Fingerprint {
    private static $_instance = null;
    private $known_bot_signatures = [];

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function __construct() {
        $this->load_known_bot_signatures();
    }

    /**
     * Known malicious and automated tool JA4 signatures.
     */
    private function load_known_bot_signatures() {
        $this->known_bot_signatures = [
            'python_requests' => [
                'name' => 'Python Requests / AI Automation Agent',
                'category' => 'automation_tool',
                'risk' => 'medium',
            ],
            'curl_raw' => [
                'name' => 'Raw cURL / CLI Probe',
                'category' => 'cli_tool',
                'risk' => 'low',
            ],
            'go_http' => [
                'name' => 'Go-http-client / Fast Bot',
                'category' => 'automation_tool',
                'risk' => 'medium',
            ],
            'scrapy' => [
                'name' => 'Scrapy / AI Crawler Framework',
                'category' => 'scraper',
                'risk' => 'high',
            ],
            'sqlmap' => [
                'name' => 'Automated SQL Injection Fuzzer',
                'category' => 'exploit_tool',
                'risk' => 'critical',
            ],
        ];
    }

    /**
     * Compute the JA4H fingerprint of the incoming request.
     *
     * Format:
     * [method_2char][protocol_version][cookie_flag][lang_flag]_[header_order_hash_12char]
     *
     * Example: ge11cn_a1b2c3d4e5f6
     *
     * @param array|null $headers Optional custom headers array (for testing)
     * @param array|null $server Optional $_SERVER array (for testing)
     * @return array Array containing fingerprint, raw components, and bot risk assessment
     */
    public function calculate_ja4h($headers = null, $server = null) {
        $server = $server ?: $_SERVER;
        $headers = $headers ?: $this->extract_raw_headers($server);

        // 1. Method (first 2 chars lowercase, e.g. "ge" for GET, "po" for POST, "pu" for PUT, "de" for DELETE)
        $method_raw = strtoupper($server['REQUEST_METHOD'] ?? 'GET');
        $method_prefix = strtolower(substr($method_raw, 0, 2));
        if (strlen($method_prefix) < 2) {
            $method_prefix = str_pad($method_prefix, 2, '0');
        }

        // 2. Protocol version (e.g. 10 for HTTP/1.0, 11 for HTTP/1.1, 20 for HTTP/2.0, 30 for HTTP/3)
        $protocol_raw = $server['SERVER_PROTOCOL'] ?? 'HTTP/1.1';
        $protocol_num = '11';
        if (strpos($protocol_raw, '1.0') !== false) {
            $protocol_num = '10';
        } elseif (strpos($protocol_raw, '2.0') !== false || strpos($protocol_raw, '2') !== false) {
            $protocol_num = '20';
        } elseif (strpos($protocol_raw, '3') !== false) {
            $protocol_num = '30';
        }

        // 3. Cookie flag: 'c' if Cookie header is present, 'n' if no cookie
        $has_cookie = !empty($server['HTTP_COOKIE']) || isset($headers['Cookie']) || isset($headers['cookie']);
        $cookie_flag = $has_cookie ? 'c' : 'n';

        // 4. Accept-Language flag: 'l' if present, 'n' if absent (bots rarely send Accept-Language)
        $has_lang = !empty($server['HTTP_ACCEPT_LANGUAGE']) || isset($headers['Accept-Language']) || isset($headers['accept-language']);
        $lang_flag = $has_lang ? 'l' : 'n';

        // 5. Header ordering list (exclude Cookie & Host for standard canonical hashing)
        $header_keys = [];
        foreach ($headers as $key => $val) {
            $k_lower = strtolower($key);
            if ($k_lower === 'cookie' || $k_lower === 'host') {
                continue;
            }
            $header_keys[] = $k_lower;
        }

        // Generate 12-char SHA-256 slice of the header sequence
        $header_sequence_str = implode(',', $header_keys);
        $header_hash = substr(hash('sha256', $header_sequence_str), 0, 12);

        $fingerprint = sprintf('%s%s%s%s_%s', $method_prefix, $protocol_num, $cookie_flag, $lang_flag, $header_hash);

        // Analyze bot characteristics
        $bot_assessment = $this->assess_client_nature($server, $headers, $fingerprint, $has_lang, $has_cookie);

        return [
            'ja4h' => $fingerprint,
            'method' => $method_raw,
            'protocol' => $protocol_num,
            'has_cookie' => $has_cookie,
            'has_lang' => $has_lang,
            'header_count' => count($headers),
            'header_order' => $header_keys,
            'is_automated_agent' => $bot_assessment['is_automated'],
            'bot_confidence' => $bot_assessment['confidence'],
            'bot_type' => $bot_assessment['type'],
            'risk_level' => $bot_assessment['risk'],
        ];
    }

    /**
     * Heuristic analysis of HTTP headers to identify AI scrapers, headless browsers, and fuzzers.
     */
    private function assess_client_nature($server, $headers, $ja4h, $has_lang, $has_cookie) {
        $ua = strtolower($server['HTTP_USER_AGENT'] ?? '');
        $header_count = count($headers);

        $is_automated = false;
        $confidence = 0.0;
        $bot_type = 'human_browser';
        $risk = 'none';

        // Obvious automated tools / exploit frameworks
        if (preg_match('/(sqlmap|nikto|nmap|acunetix|dirbuster|gobuster|wpscan|hydra|masscan|zgrab)/i', $ua)) {
            return [
                'is_automated' => true,
                'confidence' => 0.99,
                'type' => 'exploit_fuzzer',
                'risk' => 'critical',
            ];
        }

        // Headless browsers / automation frameworks
        if (preg_match('/(headlesschrome|puppeteer|playwright|selenium|phantomjs|webdriver)/i', $ua)) {
            return [
                'is_automated' => true,
                'confidence' => 0.95,
                'type' => 'headless_browser',
                'risk' => 'high',
            ];
        }

        // AI scrapers / automated libraries
        if (preg_match('/(python-requests|aiohttp|httpx|guzzlehttp|go-http-client|apache-httpclient|curl\/|wget\/|scrapy|okhttp)/i', $ua)) {
            return [
                'is_automated' => true,
                'confidence' => 0.90,
                'type' => 'automated_script',
                'risk' => 'medium',
            ];
        }

        // Header anomaly detection (AI agents faking Chrome UA but missing standard browser headers)
        $is_faking_chrome = (strpos($ua, 'chrome') !== false || strpos($ua, 'mozilla') !== false);
        $has_sec_ch_ua = isset($headers['sec-ch-ua']) || isset($headers['Sec-Ch-Ua']) || isset($server['HTTP_SEC_CH_UA']);
        $has_accept_encoding = isset($headers['accept-encoding']) || isset($headers['Accept-Encoding']) || isset($server['HTTP_ACCEPT_ENCODING']);

        // Modern Chrome always sends Sec-Ch-Ua, Accept-Language, Accept-Encoding and at least 6 headers
        if ($is_faking_chrome && !$has_lang && !$has_sec_ch_ua && $header_count < 5) {
            $is_automated = true;
            $confidence = 0.85;
            $bot_type = 'spoofed_ai_bot';
            $risk = 'high';
        } elseif (!$has_lang && !$has_cookie && $header_count <= 3) {
            $is_automated = true;
            $confidence = 0.75;
            $bot_type = 'minimal_bot';
            $risk = 'medium';
        }

        return [
            'is_automated' => $is_automated,
            'confidence' => $confidence,
            'type' => $bot_type,
            'risk' => $risk,
        ];
    }

    /**
     * Extract all request headers in their exact received order.
     */
    private function extract_raw_headers($server) {
        if (function_exists('getallheaders')) {
            $raw = getallheaders();
            if (!empty($raw) && is_array($raw)) {
                return $raw;
            }
        }

        $headers = [];
        foreach ($server as $name => $value) {
            if (strpos($name, 'HTTP_') === 0) {
                $header = str_replace('_', '-', substr($name, 5));
                $headers[$header] = $value;
            } elseif ($name === 'CONTENT_TYPE') {
                $headers['Content-Type'] = $value;
            } elseif ($name === 'CONTENT_LENGTH') {
                $headers['Content-Length'] = $value;
            }
        }
        return $headers;
    }
}
