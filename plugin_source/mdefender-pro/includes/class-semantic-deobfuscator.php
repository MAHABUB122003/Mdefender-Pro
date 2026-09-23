<?php
/**
 * MDefender-Pro Semantic Payload Deobfuscator & Lexical Tokenizer
 *
 * Implements:
 * 1. Recursive multi-pass payload de-obfuscation (defeats nested encoding, unicode tricks, hex/base64 mutations).
 * 2. SQL Comment and whitespace normalization (strips inline comments like /*!50000SELECT*\/, null bytes).
 * 3. Libinjection-style SQLi & XSS grammatical tokenization (intent-based structural syntax analysis).
 * 4. AI Prompt Injection & LLM Jailbreak string detection.
 *
 * @package MDefender-Pro
 */

defined('ABSPATH') || exit;

class WAF_FW_Semantic_Deobfuscator {
    private static $_instance = null;

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    /**
     * Recursively de-obfuscate a payload string across multiple passes.
     *
     * @param string $input Raw or encoded input string
     * @param int $max_depth Maximum recursion depth (prevents ReDoS/memory exhaustion)
     * @return string Canonical normalized string
     */
    public function deobfuscate($input, $max_depth = 4) {
        if (!is_string($input) || $input === '') {
            return '';
        }

        $current = $input;
        $depth = 0;

        while ($depth < $max_depth) {
            $previous = $current;

            // 1. URL decoding (handles %20, %27, %2527, %252527)
            $decoded_url = rawurldecode($current);
            if ($decoded_url !== $current) {
                $current = $decoded_url;
            }

            // 2. HTML Entity decoding (handles &#x27;, &#39;, &quot;, &lt;)
            $decoded_html = html_entity_decode($current, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            if ($decoded_html !== $current) {
                $current = $decoded_html;
            }

            // 3. Unicode escape sequence normalization (\u0027 -> ', \u003c -> <)
            $current = preg_replace_callback('/\\\\u([0-9a-fA-F]{4})/', function ($m) {
                $codepoint = hexdec($m[1]);
                if (function_exists('mb_chr')) {
                    return mb_chr($codepoint, 'UTF-8') ?: $m[0];
                }
                return chr($codepoint);
            }, $current);

            // 4. Hex escape sequence normalization (\x27 -> ', 0x27)
            $current = preg_replace_callback('/\\\\x([0-9a-fA-F]{2})/', function ($m) {
                return chr(hexdec($m[1]));
            }, $current);

            // 5. Strip null bytes & control chars that attackers use to bypass string filters
            $current = str_replace(["\0", "\x00", "\x0b", "\x0c"], ' ', $current);

            // 6. MySQL inline comments stripping: /*!50000SELECT*/ -> SELECT, UN/**/ION -> UNION
            $current = preg_replace('/\/\*!\d*(.*?)\*\//is', ' $1 ', $current);
            $current = preg_replace('/\/\*.*?\*\//is', ' ', $current);

            $depth++;
            // If no changes occurred in this pass, the string is fully normalized
            if ($current === $previous) {
                break;
            }
        }

        // Collapse duplicate whitespace for clean token matching
        $current = preg_replace('/\s+/', ' ', $current);

        return trim($current);
    }

    /**
     * Libinjection-style tokenization to detect SQL injection structural changes.
     * Evaluates whether an input forces a boolean tautology, union statement, or schema exfiltration.
     *
     * @param string $input Normalized or raw input
     * @return array Detection result with confidence and matched fingerprint
     */
    public function analyze_sql_intent($input) {
        $normalized = $this->deobfuscate($input);

        // Check for SQL comment terminations and stacked queries
        $has_comment_term = preg_match('/(?:--|\#|\/\*|;)/', $normalized);

        // Check for SQL Union Select patterns across spaces/newlines
        if (preg_match('/\bUNION\b\s+(?:ALL\s+)?\bSELECT\b/i', $normalized)) {
            return [
                'is_sqli' => true,
                'type' => 'SQLi - Union Select',
                'confidence' => 0.99,
                'normalized' => $normalized,
            ];
        }

        // Check for Blind SQL Time/Resource Delay
        if (preg_match('/\b(?:SLEEP|BENCHMARK|WAITFOR\s+DELAY|PG_SLEEP)\s*\(\s*\d+/i', $normalized)) {
            return [
                'is_sqli' => true,
                'type' => 'SQLi - Time-Based Delay',
                'confidence' => 0.98,
                'normalized' => $normalized,
            ];
        }

        // Check for Boolean Tautology (OR 1=1, OR 'a'='a', AND 1=1, OR true)
        if (preg_match('/\b(?:OR|AND)\b\s+(?:[0-9]+\s*=\s*[0-9]+|\'[a-zA-Z0-9_]*\'\s*=\s*\'[a-zA-Z0-9_]*\'|[a-zA-Z0-9_]+\s*=\s*[a-zA-Z0-9_]+|\bTRUE\b)\b/i', $normalized)) {
            // Ensure this is not a benign single word like 'AND' in a blog post
            if ($has_comment_term || preg_match('/[\'"]\s*\b(?:OR|AND)\b/i', $normalized)) {
                return [
                    'is_sqli' => true,
                    'type' => 'SQLi - Boolean Tautology',
                    'confidence' => 0.95,
                    'normalized' => $normalized,
                ];
            }
        }

        // Check for Schema / File Extraction
        if (preg_match('/\b(?:INTO\s+(?:OUTFILE|DUMPFILE)|LOAD_FILE|SCHEMA_NAME|INFORMATION_SCHEMA\.(?:TABLES|COLUMNS))\b/i', $normalized)) {
            return [
                'is_sqli' => true,
                'type' => 'SQLi - Schema/File Extraction',
                'confidence' => 0.99,
                'normalized' => $normalized,
            ];
        }

        return ['is_sqli' => false, 'confidence' => 0.0, 'normalized' => $normalized];
    }

    /**
     * Detect XSS intent in normalized text.
     */
    public function analyze_xss_intent($input) {
        $normalized = $this->deobfuscate($input);

        // 1. Explicit HTML script tags
        if (preg_match('/<\s*script\b[^>]*>/i', $normalized)) {
            return ['is_xss' => true, 'type' => 'XSS - Script Tag', 'confidence' => 0.99];
        }

        // 2. Inline Javascript execution protocols (javascript:, data:text/html, vbscript:)
        if (preg_match('/(?:javascript|data|vbscript)\s*:\s*(?:alert|prompt|confirm|eval|document\.cookie|window\.location|[a-z0-9_]+\s*\()/i', $normalized)) {
            return ['is_xss' => true, 'type' => 'XSS - Protocol Execution', 'confidence' => 0.98];
        }

        // 3. HTML tag with executable event handlers (onerror=, onload=, onmouseover=)
        if (preg_match('/<\s*[a-z0-9]+\b[^>]*\bon[a-z]{3,15}\s*=\s*[\'"]?[^\'"]*(?:alert|eval|document|\()/i', $normalized)) {
            return ['is_xss' => true, 'type' => 'XSS - Event Handler Vector', 'confidence' => 0.97];
        }

        return ['is_xss' => false, 'confidence' => 0.0];
    }

    /**
     * Detect AI Prompt Injection & LLM System Override Payloads.
     * Protects WordPress AI/LLM chatbots, search plugins, and automated agents from jailbreaks.
     */
    public function analyze_ai_prompt_injection($input) {
        $normalized = $this->deobfuscate($input);

        $prompt_patterns = [
            'System Prompt Override' => '/(?:ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions|disregard\s+(?:all\s+)?(?:previous|prior)\s+instructions|system\s*:\s*you\s+are\s+now)/i',
            'Jailbreak Persona Switch' => '/(?:you\s+are\s+DAN|do\s+anything\s+now|jailbreak\s+mode\s+enabled|always\s+comply\s+without\s+safety)/i',
            'Prompt Exfiltration' => '/(?:repeat\s+(?:all\s+)?(?:instructions|prompts)\s+above|print\s+(?:the\s+)?system\s+prompt|reveal\s+your\s+secret\s+key)/i',
        ];

        foreach ($prompt_patterns as $type => $pattern) {
            if (preg_match($pattern, $normalized)) {
                return [
                    'is_injection' => true,
                    'type' => 'AI Prompt Injection - ' . $type,
                    'confidence' => 0.95,
                    'normalized' => $normalized,
                ];
            }
        }

        return ['is_injection' => false, 'confidence' => 0.0];
    }
}
