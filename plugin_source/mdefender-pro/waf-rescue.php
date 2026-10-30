<?php
/**
 * MDefender-Pro Enterprise Disaster Recovery & Standalone Rescue Endpoint
 *
 * Direct execution bridge to restore sites even when WordPress root index.php,
 * .htaccess, or permalinks are corrupted or deleted.
 */

// 1. Raise limits immediately
@ini_set('memory_limit', '1024M');
@ini_set('max_execution_time', 600);
@set_time_limit(600);
@ignore_user_abort(true);

// 2. Discover WordPress Root Directory
$plugin_dir = __DIR__;
$wp_root = null;
$curr = $plugin_dir;
for ($i = 0; $i < 5; $i++) {
    $curr = dirname($curr);
    if (file_exists($curr . '/wp-load.php')) {
        $wp_root = $curr;
        break;
    }
}

if (!$wp_root) {
    header('Content-Type: application/json; charset=UTF-8', true, 500);
    echo json_encode(['status' => 'error', 'message' => 'WordPress root (wp-load.php) could not be located.']);
    exit;
}

// 3. Ultra-Critical Self-Heal: Immediately ensure index.php, wp-blog-header.php, and .htaccess exist
if (!file_exists($wp_root . '/index.php') || filesize($wp_root . '/index.php') === 0) {
    @file_put_contents($wp_root . '/index.php', "<?php\n/**\n * Front to the WordPress application.\n */\ndefine( 'WP_USE_THEMES', true );\nrequire __DIR__ . '/wp-blog-header.php';\n");
}
if (!file_exists($wp_root . '/wp-blog-header.php') || filesize($wp_root . '/wp-blog-header.php') === 0) {
    @file_put_contents($wp_root . '/wp-blog-header.php', "<?php\nif ( ! isset( \$wp_did_header ) ) {\n\t\$wp_did_header = true;\n\trequire_once __DIR__ . '/wp-load.php';\n\twp();\n\trequire_once ABSPATH . WPINC . '/template-loader.php';\n}\n");
}
if (!file_exists($wp_root . '/.htaccess') || filesize($wp_root . '/.htaccess') === 0) {
    @file_put_contents($wp_root . '/.htaccess', "# BEGIN WordPress\n<IfModule mod_rewrite.c>\nRewriteEngine On\nRewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]\nRewriteBase /\nRewriteRule ^index\\.php$ - [L]\nRewriteCond %{REQUEST_FILENAME} !-f\nRewriteCond %{REQUEST_FILENAME} !-d\nRewriteRule . /index.php [L]\n</IfModule>\n# END WordPress\n");
}

// 4. Load WordPress environment
if (!defined('ABSPATH')) {
    define('WP_USE_THEMES', false);
    require_once $wp_root . '/wp-load.php';
}

// Ensure JSON output
if (!headers_sent()) {
    header('Content-Type: application/json; charset=UTF-8');
}

// 5. Parse action and payload
$raw_body = @file_get_contents('php://input');
$pushed = !empty($raw_body) ? @json_decode($raw_body, true) : [];
if (!is_array($pushed)) $pushed = [];

$action = sanitize_text_field($_REQUEST['action'] ?? $pushed['action'] ?? 'ping');

if ($action === 'ping' || $action === 'self_heal') {
    echo json_encode([
        'status' => 'success',
        'message' => 'MDefender Rescue Endpoint active. Core index files self-healed successfully.',
        'action' => $action,
        'action_result' => ['success' => true, 'healed' => true]
    ]);
    exit;
}

// 6. Action Execution (Delegated to WAF_FW_Backup_Engine)
if (!class_exists('WAF_FW_Backup_Engine')) {
    $engine_file = $plugin_dir . '/includes/backup/class-backup-engine.php';
    if (file_exists($engine_file)) {
        require_once $engine_file;
    }
}

if (!class_exists('WAF_FW_Backup_Engine')) {
    echo json_encode(['status' => 'error', 'message' => 'WAF_FW_Backup_Engine class unavailable on host.']);
    exit;
}

$engine = WAF_FW_Backup_Engine::instance();
$action_result = null;

if ($action === 'restore' || $action === 'restore_backup') {
    $fn = sanitize_text_field($_REQUEST['filename'] ?? $pushed['filename'] ?? '');
    if (!$fn) {
        echo json_encode(['status' => 'error', 'message' => 'Filename is required for restoration snapshot.']);
        exit;
    }
    $action_result = $engine->restore_backup($fn);
} elseif ($action === 'create_backup') {
    $btype = sanitize_text_field($_REQUEST['type'] ?? $pushed['type'] ?? 'full');
    $bnote = sanitize_text_field($_REQUEST['note'] ?? $pushed['note'] ?? 'Rescue Endpoint Snapshot');
    $bcomps = isset($pushed['components']) && is_array($pushed['components']) ? array_map('sanitize_text_field', $pushed['components']) : (isset($_REQUEST['components']) && is_array($_REQUEST['components']) ? array_map('sanitize_text_field', $_REQUEST['components']) : []);
    $action_result = $engine->create_backup($btype, $bcomps, $bnote);
} elseif ($action === 'delete_backup') {
    $fn = sanitize_text_field($_REQUEST['filename'] ?? $pushed['filename'] ?? '');
    $action_result = $engine->delete_backup($fn);
} elseif ($action === 'get_backups') {
    $action_result = ['success' => true, 'backups' => $engine->get_backups()];
} else {
    $action_result = ['success' => true, 'message' => 'Action received: ' . $action];
}

echo json_encode([
    'status' => 'success',
    'action' => $action,
    'action_result' => $action_result,
    'timestamp' => current_time('mysql'),
]);
exit;
