with open(r"Mdefender\plugin_source\mdefender-pro\waf-firewall.php", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Early analysis block check
old_early = """            $result = $engine->analyze_current_request();
            if ($result['status'] === 'blocked') {
                status_header(403);
                header('HTTP/1.1 403 Forbidden', true, 403);
                header('X-Protected-By: MDefender-Pro-WAAP');
                header('Connection: close');
                include WAF_FW_PLUGIN_DIR . 'block-page-template.php';
                exit;
            }"""

new_early = """            $result = $engine->analyze_current_request();
            if ($result['status'] === 'blocked') {
                $atype = $result['attack_type'] ?? '';
                if ($atype === 'Blacklisted IP' || $atype === 'Country Blocked' || strpos($atype, 'Country') !== false || strpos($atype, 'Geograph') !== false || $atype === 'Server Admin Probe') {
                    include WAF_FW_PLUGIN_DIR . 'dead-network-template.php';
                    exit;
                }
                status_header(403);
                header('HTTP/1.1 403 Forbidden', true, 403);
                header('X-Protected-By: MDefender-Pro-WAAP');
                header('Connection: close');
                include WAF_FW_PLUGIN_DIR . 'block-page-template.php';
                exit;
            }"""

assert old_early in code, "old_early not found"
code = code.replace(old_early, new_early)

# 2. Main analysis block check
old_main = """    if ($result['status'] === 'blocked') {
        $atype = $result['attack_type'] ?? '';

        status_header(403);
        header('HTTP/1.1 403 Forbidden', true, 403);
        header('X-Protected-By: MDefender-Pro-WAAP');
        header('Connection: close');
        include WAF_FW_PLUGIN_DIR . 'block-page-template.php';"""

new_main = """    if ($result['status'] === 'blocked') {
        $atype = $result['attack_type'] ?? '';
        if ($atype === 'Blacklisted IP' || $atype === 'Country Blocked' || strpos($atype, 'Country') !== false || strpos($atype, 'Geograph') !== false || $atype === 'Server Admin Probe') {
            include WAF_FW_PLUGIN_DIR . 'dead-network-template.php';
            exit;
        }

        status_header(403);
        header('HTTP/1.1 403 Forbidden', true, 403);
        header('X-Protected-By: MDefender-Pro-WAAP');
        header('Connection: close');
        include WAF_FW_PLUGIN_DIR . 'block-page-template.php';"""

assert old_main in code, "old_main not found"
code = code.replace(old_main, new_main)

with open(r"Mdefender\plugin_source\mdefender-pro\waf-firewall.php", "w", encoding="utf-8") as f:
    f.write(code)

print("Successfully updated waf-firewall.php with dead network template!")

