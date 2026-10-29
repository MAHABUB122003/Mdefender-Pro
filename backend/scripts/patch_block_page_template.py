import os

tmpl_file = os.path.join(os.path.dirname(__file__), '..', '..', 'plugin_source', 'mdefender-pro', 'block-page-template.php')
with open(tmpl_file, 'r', encoding='utf-8') as f:
    code = f.read()

code_norm = code.replace('\r\n', '\n')

old_block = '''// Determine Policy vs Attack Type
$is_country_block = (
    $attack_type === 'Country Blocked' ||
    $attack_type === 'Country / Regional Restriction' ||
    stripos($attack_type, 'Country') !== false ||
    stripos($attack_type, 'GeoIP') !== false ||
    stripos($reason, 'country') !== false ||
    stripos($reason, 'geographic') !== false
);

$is_ip_blacklist = (
    !$is_country_block && (
        $attack_type === 'Blacklisted IP' ||
        stripos($attack_type, 'Blacklist') !== false ||
        stripos($reason, 'blacklisted') !== false
    )
);'''

new_block = '''// Determine Policy vs Attack Type
$is_country_block = (
    $attack_type === 'Country Blocked' ||
    $attack_type === 'Country / Regional Restriction' ||
    stripos($attack_type, 'Country') !== false ||
    stripos($attack_type, 'GeoIP') !== false ||
    stripos($reason, 'country') !== false ||
    stripos($reason, 'geographic') !== false
);

$is_ip_blacklist = (
    !$is_country_block && (
        $attack_type === 'Blacklisted IP' ||
        stripos($attack_type, 'Blacklist') !== false ||
        stripos($reason, 'blacklisted') !== false
    )
);

// Absolute Stealth Enforcement: Blacklisted IPs, Country Blocks, and Admin Probes
// MUST NEVER show a 403 Forbidden page. They must always show the authentic browser "Website Down" offline screen!
if ($is_country_block || $is_ip_blacklist || $attack_type === 'Server Admin Probe') {
    $dead_template = __DIR__ . '/dead-network-template.php';
    if (file_exists($dead_template)) {
        include $dead_template;
        exit;
    }
}'''

if old_block in code_norm:
    code_norm = code_norm.replace(old_block, new_block)
    with open(tmpl_file, 'w', encoding='utf-8') as f:
        f.write(code_norm)
    print("SUCCESS: block-page-template.php patched with unconditional stealth fail-safe")
else:
    print("FAILED: old_block pattern not found in block-page-template.php")
