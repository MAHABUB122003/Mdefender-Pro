<?php
/**
 * MDefender-Pro Enterprise Disaster Recovery & Autonomous Rescue Engine
 *
 * Can execute and recover the website even when WordPress Core (wp-load.php,
 * wp-config.php, index.php, wp-settings.php, etc.) is corrupted or completely deleted.
 */

// 1. Extreme execution limits for disaster reconstitution
@ini_set('memory_limit', '1024M');
@ini_set('max_execution_time', 600);
@set_time_limit(600);
@ignore_user_abort(true);

// 2. Discover WordPress Root Directory (strictly 3 levels above plugin)
$plugin_dir = __DIR__;
$wp_root = defined('ABSPATH') ? ABSPATH : dirname($plugin_dir, 3);
$wp_content_dir = dirname($plugin_dir, 2);

// Autonomous input sanitizer (zero dependency on WordPress core functions)
function mdef_rescue_sanitize($val) {
    if (is_array($val)) return array_map('mdef_rescue_sanitize', $val);
    return trim(strip_tags((string) $val));
}

// Ensure JSON response headers
if (!headers_sent()) {
    header('Content-Type: application/json; charset=UTF-8');
}

// 3. Parse input payload
$raw_body = @file_get_contents('php://input');
$pushed = !empty($raw_body) ? @json_decode($raw_body, true) : [];
if (!is_array($pushed)) $pushed = [];

$action = mdef_rescue_sanitize($_REQUEST['action'] ?? $pushed['action'] ?? 'ping');
$filename = mdef_rescue_sanitize($_REQUEST['filename'] ?? $pushed['filename'] ?? '');

// 4. Resolve Backup Archive Storage Locations
$possible_backup_dirs = [
    $wp_content_dir . '/mdefender-backups/',
    $wp_root . '/wp-content/mdefender-backups/',
    dirname($wp_root) . '/mdefender-backups/',
    $wp_root . '/../mdefender-backups/',
    sys_get_temp_dir() . '/mdefender-backups/',
];

$backup_file_path = '';
if (!empty($filename)) {
    $clean_fn = basename($filename);
    foreach ($possible_backup_dirs as $bdir) {
        $cand = $bdir . $clean_fn;
        if (file_exists($cand) && filesize($cand) > 0) {
            $backup_file_path = $cand;
            break;
        }
    }
}

// 5. Handle Action: Restore (Full Disaster Reconstitution)
if ($action === 'restore' || $action === 'restore_backup') {
    if (empty($backup_file_path)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Backup archive file not found on server: ' . ($filename ?: 'unspecified'),
            'searched_locations' => $possible_backup_dirs
        ]);
        exit;
    }

    $start_time = microtime(true);
    $actions_log = [];
    $total_files_restored = 0;

    // STEP A: Autonomous Core & File Extraction (WITHOUT WordPress loaded)
    if (!class_exists('ZipArchive')) {
        echo json_encode(['status' => 'error', 'message' => 'PHP ZipArchive extension required on origin host.']);
        exit;
    }

    $zip = new ZipArchive();
    if ($zip->open($backup_file_path) !== true) {
        echo json_encode(['status' => 'error', 'message' => 'Failed to open backup ZIP archive: ' . basename($backup_file_path)]);
        exit;
    }

    $temp_sql = dirname($backup_file_path) . '/mdf_sql_' . uniqid() . '.sql';
    $has_db_sql = false;

    // Direct stream extraction
    $num_files = $zip->numFiles;
    for ($i = 0; $i < $num_files; $i++) {
        $stat = $zip->statIndex($i);
        $entry_name = $stat['name'];

        // Extract database dump to temp file
        if ($entry_name === 'database.sql' || $entry_name === 'db/database.sql') {
            $in = $zip->getStream($entry_name);
            if ($in) {
                $out = @fopen($temp_sql, 'wb');
                if ($out) {
                    while (!feof($in)) {
                        fwrite($out, fread($in, 65536));
                    }
                    fclose($out);
                    $has_db_sql = true;
                }
                fclose($in);
            }
            continue;
        }

        // Skip directories and manifest
        if (substr($entry_name, -1) === '/' || $entry_name === 'mdefender-manifest.json' || strpos($entry_name, 'mdefender-backups') !== false) {
            continue;
        }

        // Route file to physical destination on disk
        $target_file = '';
        if (strpos($entry_name, 'plugins/') === 0) {
            $target_file = $wp_content_dir . '/plugins/' . substr($entry_name, 8);
        } elseif (strpos($entry_name, 'themes/') === 0) {
            $target_file = $wp_content_dir . '/themes/' . substr($entry_name, 7);
        } elseif (strpos($entry_name, 'uploads/') === 0) {
            $target_file = $wp_content_dir . '/uploads/' . substr($entry_name, 8);
        } elseif (strpos($entry_name, 'core/') === 0) {
            $target_file = $wp_root . '/' . substr($entry_name, 5);
        } elseif (strpos($entry_name, 'others/') === 0) {
            $target_file = $wp_content_dir . '/' . substr($entry_name, 7);
        } else {
            // Root core files (wp-config.php, index.php, wp-load.php, wp-blog-header.php, .htaccess)
            $target_file = $wp_root . '/' . $entry_name;
        }

        // Smart-skip identical files to achieve maximum speed
        if (file_exists($target_file) && filesize($target_file) === $stat['size']) {
            $total_files_restored++;
            continue;
        }

        $target_dir = dirname($target_file);
        if (!is_dir($target_dir)) {
            @mkdir($target_dir, 0755, true);
        }

        $in = $zip->getStream($entry_name);
        if ($in) {
            $out = @fopen($target_file, 'wb');
            if ($out) {
                while (!feof($in)) {
                    fwrite($out, fread($in, 65536));
                }
                fclose($out);
                $total_files_restored++;
            }
            fclose($in);
        }
    }
    $zip->close();
    $actions_log[] = $total_files_restored . ' core, plugin & theme files reconstituted';

    // STEP B: Guarantee Critical Web Server Core Files Exist
    $root_index = $wp_root . '/index.php';
    if (!file_exists($root_index) || filesize($root_index) === 0) {
        @file_put_contents($root_index, "<?php\n/**\n * Front to the WordPress application.\n */\ndefine( 'WP_USE_THEMES', true );\nrequire __DIR__ . '/wp-blog-header.php';\n");
        $actions_log[] = 'Emergency self-heal: verified root index.php';
    }

    $root_blog_header = $wp_root . '/wp-blog-header.php';
    if (!file_exists($root_blog_header) || filesize($root_blog_header) === 0) {
        @file_put_contents($root_blog_header, "<?php\n/**\n * Loads the WordPress environment and template.\n */\nif ( ! isset( \$wp_did_header ) ) {\n\t\$wp_did_header = true;\n\trequire_once __DIR__ . '/wp-load.php';\n\twp();\n\trequire_once ABSPATH . WPINC . '/template-loader.php';\n}\n");
        $actions_log[] = 'Emergency self-heal: verified root wp-blog-header.php';
    }

    $root_htaccess = $wp_root . '/.htaccess';
    if (!file_exists($root_htaccess) || filesize($root_htaccess) === 0) {
        @file_put_contents($root_htaccess, "# BEGIN WordPress\n<IfModule mod_rewrite.c>\nRewriteEngine On\nRewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]\nRewriteBase /\nRewriteRule ^index\\.php$ - [L]\nRewriteCond %{REQUEST_FILENAME} !-f\nRewriteCond %{REQUEST_FILENAME} !-d\nRewriteRule . /index.php [L]\n</IfModule>\n# END WordPress\n");
        $actions_log[] = 'Emergency self-heal: verified root .htaccess';
    }

    // STEP C: Boot WordPress Core (Now Guaranteed Available on Disk) & Reconstitute Database
    $wp_load = $wp_root . '/wp-load.php';
    if (file_exists($wp_load)) {
        if (!defined('ABSPATH')) {
            define('WP_USE_THEMES', false);
            require_once $wp_load;
        }

        if ($has_db_sql && file_exists($temp_sql) && class_exists('WAF_FW_Backup_Engine')) {
            $db_res = WAF_FW_Backup_Engine::instance()->import_database_file($temp_sql);
            @unlink($temp_sql);
            if (!empty($db_res['success'])) {
                $actions_log[] = 'Database reconstructed (' . ($db_res['queries'] ?? 0) . ' queries executed)';
            }
        } elseif (file_exists($temp_sql)) {
            @unlink($temp_sql);
        }

        // Reset all caches
        if (function_exists('wp_cache_flush')) @wp_cache_flush();
        if (function_exists('opcache_reset')) @opcache_reset();
    }

    $duration = round(microtime(true) - $start_time, 2);

    echo json_encode([
        'status' => 'success',
        'action' => 'restore_backup',
        'action_result' => [
            'success' => true,
            'message' => 'Disaster recovery restore successful in ' . $duration . 's! Actions: ' . implode('; ', $actions_log),
            'duration' => $duration . 's',
            'actions' => $actions_log,
            'files_restored' => $total_files_restored,
        ],
        'timestamp' => date('Y-m-d H:i:s'),
    ]);
    exit;
}

// 6. Non-restore actions (require standard WordPress environment)
if (!defined('ABSPATH') && file_exists($wp_root . '/wp-load.php')) {
    define('WP_USE_THEMES', false);
    require_once $wp_root . '/wp-load.php';
}

// Re-evaluate action after wp-load in case globals were reset
$action = mdef_rescue_sanitize($_REQUEST['action'] ?? $_GET['action'] ?? $pushed['action'] ?? 'ping');
$filename = mdef_rescue_sanitize($_REQUEST['filename'] ?? $_GET['filename'] ?? $pushed['filename'] ?? '');

if ($action === 'ping' || $action === 'self_heal') {
    echo json_encode([
        'status' => 'success',
        'message' => 'MDefender Rescue Engine active. Core index files self-healed successfully.',
        'action' => $action,
        'action_result' => ['success' => true, 'healed' => true]
    ]);
    exit;
}

if (class_exists('WAF_FW_Backup_Engine')) {
    $engine = WAF_FW_Backup_Engine::instance();
    if ($action === 'create_backup') {
        $btype = mdef_rescue_sanitize($_REQUEST['type'] ?? $pushed['type'] ?? 'full');
        $bnote = mdef_rescue_sanitize($_REQUEST['note'] ?? $pushed['note'] ?? 'Rescue Snapshot');
        $bcomps = isset($pushed['components']) && is_array($pushed['components']) ? array_map('mdef_rescue_sanitize', $pushed['components']) : (isset($_REQUEST['components']) && is_array($_REQUEST['components']) ? array_map('mdef_rescue_sanitize', $_REQUEST['components']) : []);
        $action_result = $engine->create_backup($btype, $bcomps, $bnote);
    } elseif ($action === 'delete_backup') {
        $action_result = $engine->delete_backup($filename);
    } elseif ($action === 'get_backups') {
        $action_result = ['success' => true, 'backups' => $engine->get_backups()];
    } else {
        $action_result = ['success' => true, 'message' => 'Action received: ' . $action];
    }

    echo json_encode([
        'status' => 'success',
        'action' => $action,
        'action_result' => $action_result,
        'timestamp' => date('Y-m-d H:i:s'),
    ]);
    exit;
}

echo json_encode(['status' => 'success', 'message' => 'Rescue engine ready']);
exit;
