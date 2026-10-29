import os

target_file = os.path.join(os.path.dirname(__file__), '..', '..', 'plugin_source', 'mdefender-pro', 'waf-firewall.php')
with open(target_file, 'r', encoding='utf-8') as f:
    code = f.read()

code_norm = code.replace('\r\n', '\n')

old_auth_block = '''function waf_fw_handle_cloud_sync_webhook() {
    if (isset($_GET['waf_cloud_sync']) || isset($_GET['waf_sync']) || isset($_POST['waf_cloud_sync']) || (isset($_GET['action']) && $_GET['action'] === 'waf_cloud_sync')) {
        $token = sanitize_text_field($_REQUEST['site_token'] ?? $_REQUEST['token'] ?? $_SERVER['HTTP_X_SITE_TOKEN'] ?? '');
        $stored_token = (string) get_option('waf_fw_site_token', '');
        
        $raw_auth = $_REQUEST['api_key'] ?? $_REQUEST['key'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['HTTP_X_API_KEY'] ?? '';
        $api_key = trim(str_ireplace('Bearer ', '', sanitize_text_field($raw_auth)));
        $stored_key = trim((string) get_option('waf_fw_ml_api_key', get_option('waf_fw_api_key', '')));

        $remote_ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $is_local_req = in_array($remote_ip, ['127.0.0.1', '::1', 'localhost', '0.0.0.0'], true) ||
            strpos($remote_ip, '192.168.') === 0 || strpos($remote_ip, '10.') === 0 || strpos($remote_ip, '172.16.') === 0;

        $is_authorized = (!empty($token) && !empty($stored_token) && (hash_equals($stored_token, $token) || strcasecmp($stored_token, $token) === 0))
            || (!empty($api_key) && !empty($stored_key) && (strpos($api_key, $stored_key) !== false || strpos($stored_key, $api_key) !== false || hash_equals($stored_key, $api_key) || strcasecmp($stored_key, $api_key) === 0))
            || empty($stored_key)
            || $is_local_req
            || (function_exists('current_user_can') && current_user_can('manage_options'));

        if ($is_authorized) {
            delete_transient('waf_fw_last_bl_sync');
            delete_transient('waf_fw_cloud_threat_ips');
            
            // Check if full JSON payload was pushed in request body
            $raw_body = file_get_contents('php://input');
            $pushed_data = !empty($raw_body) ? json_decode($raw_body, true) : null;'''

new_auth_block = '''function waf_fw_handle_cloud_sync_webhook() {
    if (isset($_GET['waf_cloud_sync']) || isset($_GET['waf_sync']) || isset($_POST['waf_cloud_sync']) || (isset($_GET['action']) && $_GET['action'] === 'waf_cloud_sync')) {
        // Read JSON payload early so api_key/site_token can be verified from JSON body, headers, or query string
        $raw_body = @file_get_contents('php://input');
        $pushed_data = !empty($raw_body) ? @json_decode($raw_body, true) : null;

        $token = sanitize_text_field($_REQUEST['site_token'] ?? $_REQUEST['token'] ?? $_SERVER['HTTP_X_SITE_TOKEN'] ?? ($pushed_data['site_token'] ?? ''));
        $stored_token = (string) get_option('waf_fw_site_token', '');
        
        $raw_auth = $_REQUEST['api_key'] ?? $_REQUEST['key'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['HTTP_X_API_KEY'] ?? ($pushed_data['api_key'] ?? '');
        $api_key = trim(str_ireplace('Bearer ', '', sanitize_text_field($raw_auth)));
        $stored_key = trim((string) get_option('waf_fw_ml_api_key', get_option('waf_fw_api_key', '')));

        $remote_ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $is_local_req = in_array($remote_ip, ['127.0.0.1', '::1', 'localhost', '0.0.0.0'], true) ||
            strpos($remote_ip, '192.168.') === 0 || strpos($remote_ip, '10.') === 0 || strpos($remote_ip, '172.16.') === 0;

        $is_authorized = (!empty($token) && !empty($stored_token) && (hash_equals($stored_token, $token) || strcasecmp($stored_token, $token) === 0))
            || (!empty($api_key) && !empty($stored_key) && (strpos($api_key, $stored_key) !== false || strpos($stored_key, $api_key) !== false || hash_equals($stored_key, $api_key) || strcasecmp($stored_key, $api_key) === 0))
            || empty($stored_key)
            || $is_local_req
            || (function_exists('current_user_can') && current_user_can('manage_options'));

        if ($is_authorized) {
            delete_transient('waf_fw_last_bl_sync');
            delete_transient('waf_fw_cloud_threat_ips');'''

if old_auth_block in code_norm:
    code_norm = code_norm.replace(old_auth_block, new_auth_block)
    with open(target_file, 'w', encoding='utf-8') as f:
        f.write(code_norm)
    print("SUCCESS: waf-firewall.php auth block patched")
else:
    print("FAILED: old_auth_block pattern not found in waf-firewall.php")

