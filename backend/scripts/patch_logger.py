with open(r"Mdefender\plugin_source\mdefender-pro\includes\class-logger.php", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update log_request to no-op
old_log_request = """    public function log_request($data) {
        if (!empty($GLOBALS['waf_fw_request_logged_in_request']) || !empty($GLOBALS['waf_fw_attack_logged_in_request'])) {
            return;
        }
        $GLOBALS['waf_fw_request_logged_in_request'] = true;

        global $wpdb;
        $table = $this->db->get_requests_table();
        $ip = $data['ip'] ?? '';
        $country_code = $this->fast_get_country_code($ip);
        $now = current_time('mysql');

        $wpdb->insert(
            $table,
            [
                'ip' => $ip,
                'country_code' => $country_code,
                'url' => substr((string)($data['url'] ?? ''), 0, 500),
                'method' => substr((string)($data['method'] ?? 'GET'), 0, 10),
                'status' => substr((string)($data['status'] ?? 'allowed'), 0, 20),
                'user_agent' => substr((string)($data['user_agent'] ?? ''), 0, 255),
                'created_at' => $now,
            ]
        );
        $this->auto_recycle_if_needed();
    }"""

new_log_request = """    public function log_request($data) {
        // Zero-Bloat Pure Security Engine:
        // Ordinary benign visitor requests are not logged to prevent database bloat and maximize site performance.
        return;
    }"""

assert old_log_request in code, "old_log_request not found"
code = code.replace(old_log_request, new_log_request)

# 2. Update get_logs to focus purely on genuine security threat events
old_get_logs_query = """        if ($status === 'allowed') {
            $table_query = "SELECT id, ip, country_code, url, method, 'Clean Traffic' AS attack_type, 0 AS confidence, 'allowed' AS status, 'Allowed Request' AS rule_matched, user_agent, '' AS referer, '' AS request_body, '' AS reference_id, '' AS details, created_at FROM $requests_table";
        } elseif ($status === 'blocked') {
            $table_query = "SELECT id, ip, country_code, url, method, attack_type, confidence, status, rule_matched, user_agent, referer, request_body, reference_id, details, created_at FROM $attacks_table";
        } else {
            $table_query = "SELECT id, ip, country_code, url, method, attack_type, confidence, status, rule_matched, user_agent, referer, request_body, reference_id, details, created_at FROM $attacks_table
                            UNION ALL
                            SELECT id, ip, country_code, url, method, 'Clean Traffic' AS attack_type, 0 AS confidence, 'allowed' AS status, 'Allowed Request' AS rule_matched, user_agent, '' AS referer, '' AS request_body, '' AS reference_id, '' AS details, created_at FROM $requests_table";
        }"""

new_get_logs_query = """        // Pure Security Event Stream: Attacks, Injections, Blacklist Blocks, Country Geo-Restrictions
        $table_query = "SELECT id, ip, country_code, url, method, attack_type, confidence, status, rule_matched, user_agent, referer, request_body, reference_id, details, created_at FROM $attacks_table";"""

assert old_get_logs_query in code, "old_get_logs_query not found"
code = code.replace(old_get_logs_query, new_get_logs_query)

with open(r"Mdefender\plugin_source\mdefender-pro\includes\class-logger.php", "w", encoding="utf-8") as f:
    f.write(code)

print("Successfully updated class-logger.php with zero-bloat pure security logging!")

