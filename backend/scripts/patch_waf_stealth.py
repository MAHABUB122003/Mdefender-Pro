with open("plugin_source/mdefender-pro/waf-firewall.php", "r", encoding="utf-8") as f:
    waf_code = f.read().replace("\r\n", "\n")

old_stealth_check = """                $atype = $result['attack_type'] ?? '';
                if ($atype === 'Blacklisted IP' || $atype === 'Country Blocked' || strpos($atype, 'Country') !== false || strpos($atype, 'Geograph') !== false || $atype === 'Server Admin Probe') {
                    include WAF_FW_PLUGIN_DIR . 'dead-network-template.php';
                    exit;
                }"""

new_stealth_check = """                $atype = $result['attack_type'] ?? '';
                $rule_m = $result['rule_matched'] ?? '';
                $msg = $result['message'] ?? '';
                $is_stealth = (
                    $atype === 'Blacklisted IP' ||
                    $atype === 'Country Blocked' ||
                    stripos($atype, 'Blacklist') !== false ||
                    stripos($atype, 'Country') !== false ||
                    stripos($atype, 'Geograph') !== false ||
                    stripos($atype, 'GeoIP') !== false ||
                    stripos($atype, 'Probe') !== false ||
                    stripos($rule_m, 'Blacklist') !== false ||
                    stripos($rule_m, 'Country') !== false ||
                    stripos($rule_m, 'GeoIP') !== false ||
                    stripos($msg, 'blacklist') !== false ||
                    stripos($msg, 'country') !== false
                );
                if ($is_stealth) {
                    include WAF_FW_PLUGIN_DIR . 'dead-network-template.php';
                    exit;
                }"""

old_stealth_check2 = """        $atype = $result['attack_type'] ?? '';
        if ($atype === 'Blacklisted IP' || $atype === 'Country Blocked' || strpos($atype, 'Country') !== false || strpos($atype, 'Geograph') !== false || $atype === 'Server Admin Probe') {
            include WAF_FW_PLUGIN_DIR . 'dead-network-template.php';
            exit;
        }"""

new_stealth_check2 = """        $atype = $result['attack_type'] ?? '';
        $rule_m = $result['rule_matched'] ?? '';
        $msg = $result['message'] ?? '';
        $is_stealth = (
            $atype === 'Blacklisted IP' ||
            $atype === 'Country Blocked' ||
            stripos($atype, 'Blacklist') !== false ||
            stripos($atype, 'Country') !== false ||
            stripos($atype, 'Geograph') !== false ||
            stripos($atype, 'GeoIP') !== false ||
            stripos($atype, 'Probe') !== false ||
            stripos($rule_m, 'Blacklist') !== false ||
            stripos($rule_m, 'Country') !== false ||
            stripos($rule_m, 'GeoIP') !== false ||
            stripos($msg, 'blacklist') !== false ||
            stripos($msg, 'country') !== false
        );
        if ($is_stealth) {
            include WAF_FW_PLUGIN_DIR . 'dead-network-template.php';
            exit;
        }"""

if old_stealth_check in waf_code:
    waf_code = waf_code.replace(old_stealth_check, new_stealth_check)
    print("Patched stealth check 1 in waf-firewall.php")

if old_stealth_check2 in waf_code:
    waf_code = waf_code.replace(old_stealth_check2, new_stealth_check2)
    print("Patched stealth check 2 in waf-firewall.php")

with open("plugin_source/mdefender-pro/waf-firewall.php", "w", encoding="utf-8") as f:
    f.write(waf_code)
print("Updated waf-firewall.php successfully")
