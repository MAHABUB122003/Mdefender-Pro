import os, requests
import subprocess

def get_db_counts():
    cmd = [r'C:\xampp\php\php.exe', '-r', """
require 'C:/xampp/htdocs/mahabub/wp-load.php';
global $wpdb;
$r = (int)$wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}waf_requests");
$a = (int)$wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}waf_attacks");
echo json_encode(['requests' => $r, 'attacks' => $a]);
"""]
    out = subprocess.check_output(cmd).decode().strip()
    import json
    return json.loads(out)

before = get_db_counts()
print(f"Before load: allowed requests = {before['requests']}, attacks = {before['attacks']}")

# Make ONE clean page load
res = requests.get('http://localhost/mahabub/', headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
print(f"Loaded page: HTTP {res.status_code}")

after = get_db_counts()
print(f"After load: allowed requests = {after['requests']}, attacks = {after['attacks']}")
print(f"Difference: +{after['requests'] - before['requests']} allowed requests! (Expected exactly +1)")
