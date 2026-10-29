with open(r"Mdefender\plugin_source\mdefender-pro\waf-bootstrap.php", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update loopback bypass to respect local_server_country and country test
old_loopback = """// If not explicitly blacklisted, allow safe loopback traffic
if (!$is_blocked && (empty($_GET['test_ip']) && empty($_GET['ip_test']) && empty($_GET['country_test']) && empty($_GET['test_country']) && empty($_GET['country']) && empty($_SERVER['HTTP_CF_IPCOUNTRY']) && empty($_SERVER['CF_IPCOUNTRY']))) {
    if ($mdefender_ip === '127.0.0.1' || $mdefender_ip === '::1' || $mdefender_ip === '0.0.0.0' || $mdefender_ip === 'localhost') {
        return;
    }
}"""

new_loopback = """// If not explicitly blacklisted, allow safe loopback traffic unless country/test simulation is provided
$has_country_test = (!empty($_GET['country_test']) || !empty($_GET['test_country']) || !empty($_GET['country']) || !empty($_GET['geo_country']) || !empty($_SERVER['HTTP_CF_IPCOUNTRY']) || !empty($_SERVER['CF_IPCOUNTRY']) || !empty($_SERVER['GEOIP_COUNTRY_CODE']));
if (!$is_blocked && empty($_GET['test_ip']) && empty($_GET['ip_test']) && !$has_country_test) {
    if ($mdefender_ip === '127.0.0.1' || $mdefender_ip === '::1' || $mdefender_ip === '0.0.0.0' || $mdefender_ip === 'localhost') {
        $local_c = !empty($mdefender_cache_data['local_server_country']) ? strtoupper($mdefender_cache_data['local_server_country']) : '';
        $raw_b = (array)($mdefender_cache_data['blocked_countries'] ?? []);
        $is_local_c_blocked = false;
        foreach ($raw_b as $rb) {
            foreach (explode(',', strtoupper((string)$rb)) as $c_item) {
                $c_clean = trim($c_item);
                if (!empty($local_c) && !empty($c_clean) && $c_clean === $local_c) {
                    $is_local_c_blocked = true;
                    break 2;
                }
            }
        }
        if (!$is_local_c_blocked) {
            return;
        }
    }
}"""

assert old_loopback in code, "old_loopback not found"
code = code.replace(old_loopback, new_loopback)

# 2. Add REDIRECT_GEOIP_COUNTRY_CODE and is_country_block flag
old_geo_block = """    if (!empty($geo_country) && in_array($geo_country, $blocked_list, true)) {
        $is_blocked = true;
        $attack_name = 'Country / Regional Restriction';
        $rule_name = 'Pre-Flight WAAP: Geolocation Restriction Policy';
        $block_reason = 'Access from your country/region (' . htmlspecialchars($geo_country) . ') is restricted by security policy.';
    }"""

new_geo_block = """    if (!empty($geo_country) && in_array($geo_country, $blocked_list, true)) {
        $is_blocked = true;
        $is_country_block = true;
        $attack_name = 'Country / Regional Restriction';
        $rule_name = 'Pre-Flight WAAP: Geolocation Restriction Policy';
        $block_reason = 'Access from your country/region (' . htmlspecialchars($geo_country) . ') is restricted by security policy.';
    }"""

assert old_geo_block in code, "old_geo_block not found"
code = code.replace(old_geo_block, new_geo_block)

# 3. Render dead network template for blacklisted IPs and country blocks
old_dead_net = """    // 3. Blacklisted IP, Geolocation Policy, and Control Panel Probes: Render Dead Network (Offline connection drop)
    // 3. Control Panel Probes: Render Dead Network (Offline connection drop)
    if ($attack_name === 'Server Admin Probe') {
        include __DIR__ . '/dead-network-template.php';
        exit;
    }"""

new_dead_net = """    // 3. Stealth Dead Network: Blacklisted IPs, Country/Regional Restrictions, and Server Admin Probes
    // Never reveal that a security plugin or WAF is present. To the attacker or blocked region, the site is completely down!
    if ($attack_name === 'Blacklisted IP' || $attack_name === 'Country / Regional Restriction' || $attack_name === 'Server Admin Probe' || !empty($is_country_block)) {
        include __DIR__ . '/dead-network-template.php';
        exit;
    }"""

assert old_dead_net in code, "old_dead_net not found"
code = code.replace(old_dead_net, new_dead_net)

with open(r"Mdefender\plugin_source\mdefender-pro\waf-bootstrap.php", "w", encoding="utf-8") as f:
    f.write(code)

print("Successfully updated waf-bootstrap.php!")
