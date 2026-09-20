<?php
defined('ABSPATH') || exit;

class WAF_FW_Rule_Engine {
    private static $_instance = null;
    private $default_rules;
    private $rules_from_db;

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function __construct() {
        $this->default_rules = $this->get_default_rules();
        $this->rules_from_db = $this->load_rules_from_db();
    }

    private function get_default_rules() {
        return [
            ['name' => 'SQL Injection - Union Select', 'pattern' => '/(?:\bUNION\b\s+\bSELECT\b)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SQL Injection - Drop Table', 'pattern' => '/(?:\bDROP\b\s+\bTABLE\b)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SQL Injection - OR 1=1', 'pattern' => "/(?:\bOR\b\s+.*\b1=1\b)/i", 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SQL Injection - Single Quote', 'pattern' => "/(?:%27\s*(?:OR|AND|--|#|\bUNION\b|;))|(?:\'\s*(?:OR|AND|--|#|\bUNION\b|;))/i", 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'XSS - Script Tag', 'pattern' => '/(?:<script[^>]*>[\s\S]*?<\/script>)|(?:<script[^>]*>)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'XSS - OnError', 'pattern' => '/(?:\bonerror\s*=\s*)/i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'XSS - JavaScript Protocol', 'pattern' => '/(?:javascript\s*:\s*[\w\(])/i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'XSS - Alert Function', 'pattern' => '/(?:alert\s*\(\s*(?:document\.cookie|document\.domain|location|window))/i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'LFI - Directory Traversal', 'pattern' => '/(?:\.\.\/(?:\.\.\/){2,}|\.\.\\\\(?:\.\.\\\\){2,})/', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'LFI - etc/passwd', 'pattern' => '/(?:\/etc\/passwd)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'LFI - PHP Filter', 'pattern' => '/(?:php:\/\/filter)/i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'Command Injection - Pipe', 'pattern' => "/(?:\b(?:cat|ls|dir|whoami|id|uname|ps|wget|curl|nc|bash|sh|python|perl|ruby|php|cmd|powershell)\s*\|)|(?:\|\s*(?:cat|ls|dir|whoami|id|uname|ps|wget|curl|nc|bash|sh|python|perl|ruby|php|cmd|powershell))|(?:`[^`]+`)|(?:\$\([\s\w\/]+\))/i", 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'Command Injection - System Commands', 'pattern' => '/(?:;\s*(?:ls|cat|id|whoami|ping|nc|bash|sh|cmd|powershell)\b)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'CSRF - Form Spoofing', 'pattern' => '/(?:<form[^>]*>.*?<\/form>)/i', 'action' => 'alert', 'severity' => 'medium', 'enabled' => true],
            ['name' => 'Path Traversal', 'pattern' => '/(?:\/proc\/self\/)/i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'SSTI - Jinja2 Template', 'pattern' => '/(?:\{\{\s*\d+.*?\}\})/', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SSTI - Python Internals', 'pattern' => '/(?:__class__|__mro__|__subclasses__|__builtins__)/', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SSRF - Internal IP', 'pattern' => '/(?:(?:https?|ftp):\/\/.*(?:169\.254\.|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.))/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SSRF - Cloud Metadata', 'pattern' => '/(?:\/latest\/meta-data|\/computeMetadata|metadata\.google)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SSRF - Internal Hostnames', 'pattern' => '/(?:(?:https?|ftp):\/\/[^\/]*(?:localhost|\.local|\.internal))/i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
        ];
    }

    private function load_rules_from_db() {
        global $wpdb;
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

        $combined = urldecode($combined);
        $combined = urldecode($combined);

        $all_rules = $this->convert_db_rules();
        foreach ($all_rules as $rule) {
            if (!$rule['enabled']) continue;
            if (@preg_match($rule['pattern'], $combined)) {
                $matches[] = [
                    'rule_name' => $rule['name'],
                    'pattern' => $rule['pattern'],
                    'action' => $rule['action'],
                    'severity' => $rule['severity'],
                ];
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
        if (isset($data['name'])) $update['name'] = sanitize_text_field($data['name']);
        if (isset($data['pattern'])) $update['pattern'] = $data['pattern'];
        if (isset($data['action'])) $update['action'] = sanitize_text_field($data['action']);
        if (isset($data['severity'])) $update['severity'] = sanitize_text_field($data['severity']);
        if (isset($data['enabled'])) $update['enabled'] = (bool) $data['enabled'];

        if (is_string($id) && strpos($id, 'db_') === 0) {
            $wpdb->update($table, $update, ['id' => (int) substr($id, 3)]);
        } elseif (is_numeric($id) && $id >= 0 && $id < count($this->default_rules)) {
            $this->default_rules[$id] = array_merge($this->default_rules[$id], $data);
        }
        $this->rules_from_db = $this->load_rules_from_db();
        return true;
    }

    public function delete_rule($id) {
        global $wpdb;
        $table = $wpdb->prefix . WAF_FW_TABLE_FIREWALL_RULES;
        if (is_string($id) && strpos($id, 'db_') === 0) {
            $wpdb->delete($table, ['id' => (int) substr($id, 3)]);
        } elseif (is_numeric($id) && isset($this->default_rules[$id])) {
            array_splice($this->default_rules, $id, 1);
        } else {
            return null;
        }
        $this->rules_from_db = $this->load_rules_from_db();
        return ['deleted' => true];
    }
}
