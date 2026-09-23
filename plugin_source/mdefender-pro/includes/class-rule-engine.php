<?php
/**
 * MDefender-Pro Rule Engine & Threat Pattern Matcher
 *
 * Evaluates inbound HTTP traffic against:
 * 1. Default Hardened WAAP Rule Set (SQLi, XSS, LFI, RFI, Command Injection, SSRF, SSTI)
 * 2. Next-Gen Rules (AI Prompt Injection, Prototype Pollution, Log4j/JNDI)
 * 3. Semantic Grammar Tokenizer (Libinjection-style intent detection)
 * 4. User-Defined Custom DB Rules
 *
 * @package MDefender-Pro
 */

defined('ABSPATH') || exit;

class WAF_FW_Rule_Engine {
    private static $_instance = null;
    private $default_rules;
    private $rules_from_db;
    private $deobfuscator;

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function __construct() {
        $this->default_rules = $this->get_default_rules();
        $this->rules_from_db = $this->load_rules_from_db();
        if (class_exists('WAF_FW_Semantic_Deobfuscator')) {
            $this->deobfuscator = WAF_FW_Semantic_Deobfuscator::instance();
        }
    }

    private function get_default_rules() {
        return [
            // SQL Injection
            ['name' => 'SQL Injection - Union Select', 'pattern' => '/(?:\bUNION\b(?:\s+ALL)?\s+\bSELECT\b)|\bUNION\b\s*[\/\*].*?[\*\/]\s*\bSELECT\b/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SQL Injection - Drop Table', 'pattern' => '/(?:\bDROP\b\s+\bTABLE\b)|(?:\bTRUNCATE\b\s+\bTABLE\b)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SQL Injection - Boolean Tautology', 'pattern' => "/(?:\b(?:OR|AND)\b\s+[\'\"]?\w+[\'\"]?\s*=\s*[\'\"]?\w+[\'\"]?)|(?:\b(?:OR|AND)\b\s+1\s*=\s*1\b)|(?:\b(?:OR|AND)\b\s+\'1\'\s*=\s*\'1\')/i", 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SQL Injection - Single Quote Escape', 'pattern' => "/(?:%27|\')\s*(?:--|#|\/\*|\bOR\b|\bAND\b|\bUNION\b|;)/i", 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'SQL Injection - Blind Sleep / Benchmark', 'pattern' => '/(?:\b(?:SLEEP|BENCHMARK|WAITFOR\s+DELAY|PG_SLEEP|LOAD_FILE|INTO\s+OUTFILE|SCHEMA_NAME)\s*\()/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            
            // Cross-Site Scripting (XSS)
            ['name' => 'XSS - Script Tag', 'pattern' => '/(?:<script[\s\S]*?>[\s\S]*?<\/script>)|(?:<script[\s\S]*?>)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'XSS - Event Handlers', 'pattern' => '/(?:\bon[a-z]{3,15}\s*=\s*[\'\"]?[^\'\">]+)/i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'XSS - JavaScript Protocol', 'pattern' => '/(?:javascript\s*:\s*[^\s\'\"]+)/i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'XSS - Alert / Execution Functions', 'pattern' => '/(?:alert|prompt|confirm)\s*\([^\)]*\)/i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'XSS - Malicious Tags', 'pattern' => '/<(?:iframe|object|embed|svg|img|body|input|link)[^>]+(?:onload|onerror|src\s*=\s*[\'\"]?javascript|data:text\/html)/i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            
            // Local & Remote File Inclusion
            ['name' => 'LFI - Directory Traversal', 'pattern' => '/(?:\.\.[\/\\]){1,}/', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'LFI - Sensitive Files', 'pattern' => '/(?:\/etc\/(?:passwd|shadow|hosts|group|issue))|(?:c:[\/\\]windows)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'LFI - PHP Wrappers', 'pattern' => '/(?:php:\/\/(?:filter|input|memory|data)|data:\/\/text\/plain|file:\/\/)/i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            
            // Remote Command Execution
            ['name' => 'Command Injection - Pipes and Chaining', 'pattern' => "/(?:\b(?:cat|ls|dir|whoami|id|uname|ps|wget|curl|nc|bash|sh|python|perl|ruby|php|cmd|powershell)\s*\|)|(?:\|\s*(?:cat|ls|dir|whoami|id|uname|ps|wget|curl|nc|bash|sh|python|perl|ruby|php|cmd|powershell))|(?:`[^`]+`)|(?:\$\([\s\w\/]+\))/i", 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'Command Injection - Semicolon System Commands', 'pattern' => '/(?:[;&]\s*(?:ls|cat|id|whoami|ping|nc|bash|sh|cmd|powershell)\b)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            
            // Server-Side Request Forgery & Template Injection
            ['name' => 'Path Traversal', 'pattern' => '/(?:\/proc\/(?:self|version|cpuinfo|meminfo)\/)/i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'SSTI - Jinja2 Template', 'pattern' => '/(?:\{\{\s*[\'\"]?.*[\'\"]?\s*\}\})/', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SSTI - Python Internals', 'pattern' => '/(?:__class__|__mro__|__subclasses__|__builtins__)/', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SSRF - Internal IP', 'pattern' => '/(?:(?:https?|ftp):\/\/.*(?:169\.254\.|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.))/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SSRF - Cloud Metadata', 'pattern' => '/(?:\/latest\/meta-data|\/computeMetadata|metadata\.google)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SSRF - Internal Hostnames', 'pattern' => '/(?:(?:https?|ftp):\/\/[^\/]*(?:localhost|\.local|\.internal))/i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            
            // Next-Gen AI & Modern Zero-Day Attack Signatures
            ['name' => 'AI Security - Prompt Injection', 'pattern' => '/(?:ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions|disregard\s+(?:all\s+)?(?:previous|prior)\s+instructions|system\s*:\s*you\s+are\s+now|you\s+are\s+DAN\b)/i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'Prototype Pollution Attack', 'pattern' => '/(?:__proto__|constructor\.prototype)\s*[\.\[]/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'JNDI / Log4j Injection Probe', 'pattern' => '/(?:\$\{\s*(?:jndi|ldap|rmi|dns)\s*:[^\}]+\})/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'GraphQL Introspection Abuse', 'pattern' => '/(?:__schema\s*\{|__type\s*\(\s*name\s*:)/i', 'action' => 'block', 'severity' => 'medium', 'enabled' => true],
        ];
    }

    private function load_rules_from_db() {
        global $wpdb;
        if (!$wpdb || !isset($wpdb->prefix)) {
            return [];
        }
        $table = $wpdb->prefix . WAF_FW_TABLE_FIREWALL_RULES;
        $db_rules = $wpdb->get_results("SELECT * FROM $table WHERE enabled = 1");
        if (!$db_rules) return [];
        return $db_rules;
    }

    public function check_request($data) {
        $matches = [];
        $combined = $data['url'] ?? '';

        if (!empty($data['body'])) {
            $combined .= ' ' . $data['body'];
        }
        if (!empty($data['query_string'])) {
            $combined .= ' ' . $data['query_string'];
        }
        if (!empty($data['query_params']) && is_array($data['query_params'])) {
            $combined .= ' ' . implode(' ', array_values($data['query_params']));
        }
        if (!empty($data['headers']) && is_array($data['headers'])) {
            $combined .= ' ' . implode(' ', array_values($data['headers']));
        }

        // Multi-Pass Recursive De-obfuscation (Only executed ONCE)
        $normalized = $combined;
        if ($this->deobfuscator) {
            $normalized = $this->deobfuscator->deobfuscate($combined);

            // 1. Semantic Intent Tokenizer Analysis (Libinjection AST)
            $sql_intent = $this->deobfuscator->analyze_sql_intent($normalized, true);
            if ($sql_intent['is_sqli']) {
                return [[
                    'rule_name' => 'Semantic WAAP: ' . $sql_intent['type'],
                    'pattern' => 'LIBINJECTION_AST_PARSER',
                    'action' => 'block',
                    'severity' => 'critical',
                ]];
            }

            $xss_intent = $this->deobfuscator->analyze_xss_intent($normalized, true);
            if ($xss_intent['is_xss']) {
                return [[
                    'rule_name' => 'Semantic WAAP: ' . $xss_intent['type'],
                    'pattern' => 'XSS_CONTEXT_PARSER',
                    'action' => 'block',
                    'severity' => 'critical',
                ]];
            }

            $ai_intent = $this->deobfuscator->analyze_ai_prompt_injection($normalized, true);
            if ($ai_intent['is_injection']) {
                return [[
                    'rule_name' => 'Semantic WAAP: ' . $ai_intent['type'],
                    'pattern' => 'AI_JAILBREAK_DETECTOR',
                    'action' => 'block',
                    'severity' => 'high',
                ]];
            }
        }

        // Pattern matching on both normalized text and raw URL decoded input
        $raw_decoded = urldecode(urldecode($combined));
        $all_rules = $this->convert_db_rules();

        foreach ($all_rules as $rule) {
            if (!$rule['enabled']) continue;
            if (@preg_match($rule['pattern'], $normalized) || @preg_match($rule['pattern'], $raw_decoded)) {
                $matches[] = [
                    'rule_name' => $rule['name'],
                    'pattern' => $rule['pattern'],
                    'action' => $rule['action'],
                    'severity' => $rule['severity'],
                ];
                // Early exit on first blocking rule
                if ($rule['action'] === 'block') {
                    return $matches;
                }
            }
        }
        return $matches;
    }

    private function convert_db_rules() {
        $rules = [];
        foreach ($this->default_rules as $i => $rule) {
            $rules['default_' . $i] = $rule;
        }
        if (!empty($this->rules_from_db)) {
            foreach ($this->rules_from_db as $db_rule) {
                $rules['db_' . $db_rule->id] = [
                    'name' => $db_rule->name,
                    'pattern' => $db_rule->pattern,
                    'action' => $db_rule->action,
                    'severity' => $db_rule->severity,
                    'enabled' => (bool) $db_rule->enabled,
                ];
            }
        }
        return $rules;
    }

    public function get_rules() {
        $rules = [];
        $i = 0;
        foreach ($this->default_rules as $rule) {
            $rules[] = array_merge($rule, ['id' => $i, 'source' => 'default']);
            $i++;
        }
        if (!empty($this->rules_from_db)) {
            foreach ($this->rules_from_db as $db_rule) {
                $rules[] = [
                    'id' => 'db_' . $db_rule->id,
                    'name' => $db_rule->name,
                    'pattern' => $db_rule->pattern,
                    'action' => $db_rule->action,
                    'severity' => $db_rule->severity,
                    'enabled' => (bool) $db_rule->enabled,
                    'source' => 'database',
                ];
            }
        }
        return $rules;
    }

    public function add_rule($rule) {
        global $wpdb;
        $table = $wpdb->prefix . WAF_FW_TABLE_FIREWALL_RULES;
        $wpdb->insert($table, [
            'name' => $rule['name'],
            'pattern' => $rule['pattern'],
            'action' => $rule['action'] ?? 'block',
            'severity' => $rule['severity'] ?? 'high',
            'enabled' => 1,
        ]);
        $this->rules_from_db = $this->load_rules_from_db();
        return ['id' => $wpdb->insert_id, 'source' => 'database'];
    }

    public function update_rule($id, $data) {
        global $wpdb;
        $table = $wpdb->prefix . WAF_FW_TABLE_FIREWALL_RULES;
        $update = [];
        if (isset($data['name'])) $update['name'] = $data['name'];
        if (isset($data['pattern'])) $update['pattern'] = $data['pattern'];
        if (isset($data['action'])) $update['action'] = $data['action'];
        if (isset($data['severity'])) $update['severity'] = $data['severity'];
        if (isset($data['enabled'])) $update['enabled'] = $data['enabled'] ? 1 : 0;

        $db_id = str_replace('db_', '', $id);
        $wpdb->update($table, $update, ['id' => $db_id]);
        $this->rules_from_db = $this->load_rules_from_db();
        return true;
    }

    public function delete_rule($id) {
        global $wpdb;
        $table = $wpdb->prefix . WAF_FW_TABLE_FIREWALL_RULES;
        $db_id = str_replace('db_', '', $id);
        $wpdb->delete($table, ['id' => $db_id]);
        $this->rules_from_db = $this->load_rules_from_db();
        return true;
    }

    public function toggle_rule($id) {
        global $wpdb;
        $table = $wpdb->prefix . WAF_FW_TABLE_FIREWALL_RULES;
        $db_id = str_replace('db_', '', $id);
        $rule = $wpdb->get_row($wpdb->prepare("SELECT enabled FROM $table WHERE id = %d", $db_id));
        if ($rule) {
            $new_val = $rule->enabled ? 0 : 1;
            $wpdb->update($table, ['enabled' => $new_val], ['id' => $db_id]);
            $this->rules_from_db = $this->load_rules_from_db();
            return $new_val;
        }
        return false;
    }
}
