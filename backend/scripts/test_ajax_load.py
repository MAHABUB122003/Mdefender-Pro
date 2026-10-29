import os, requests, subprocess, json

def get_db_counts():
    cmd = [r'C:\xampp\php\php.exe', '-r', """
require 'C:/xampp/htdocs/mahabub/wp-load.php';
global $wpdb;
$r = (int)$wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}waf_requests");
$a = (int)$wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}waf_attacks");
echo json_encode(['requests' => $r, 'attacks' => $a]);
"""]
    out = subprocess.check_output(cmd).decode().strip()
    return json.loads(out)

before = get_db_counts()

# Simulate MDefender dashboard opening 4 AJAX requests and heartbeat
actions = [
    'waf_fw_get_dashboard',
    'waf_fw_get_active_or_last_scan',
    'waf_fw_get_backups',
    'waf_fw_get_scan_history',
    'heartbeat'
]

for act in actions:
    requests.post('http://localhost/mahabub/wp-admin/admin-ajax.php', data={'action': act})

after = get_db_counts()
print(f"Before: requests={before['requests']}")
print(f"After internal AJAX calls: requests={after['requests']}")
print(f"Difference: +{after['requests'] - before['requests']} (Expected 0 since internal AJAX is filtered out!)")
