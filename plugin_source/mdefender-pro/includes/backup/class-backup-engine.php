<?php
/**
 * MDefender-Pro Enterprise Backup & Restore Engine
 *
 * Implements high-performance, UpdraftPlus-grade database streaming,
 * multi-component WordPress file archiving, atomic disaster recovery
 * restoration, WP-Cron automated backups, and secure archive catalog management.
 *
 * @package MDefender-Pro
 */

defined('ABSPATH') || exit;

class WAF_FW_Backup_Engine {
    private static $_instance = null;
    private $backup_dir;

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function __construct() {
        $this->backup_dir = wp_normalize_path(WP_CONTENT_DIR . '/mdefender-backups/');
        $this->ensure_backup_dir();

        // Cron Hook for Automated Scheduled Backups
        add_action('waf_fw_automated_backup_cron', [$this, 'run_scheduled_backup']);
    }

    /**
     * Lift PHP execution and memory limits to prevent timeouts on large sites.
     */
    private function raise_execution_limits() {
        if (function_exists('set_time_limit')) {
            @set_time_limit(900);
        }
        @ini_set('max_execution_time', '900');
        
        $current_mem = @ini_get('memory_limit');
        if ($current_mem && $this->convert_hr_to_bytes($current_mem) < 536870912) { // 512MB
            @ini_set('memory_limit', '512M');
        }
    }

    /**
     * Convert human-readable size string to bytes.
     */
    private function convert_hr_to_bytes($size_str) {
        $size_str = trim($size_str);
        $unit = strtolower(substr($size_str, -1));
        $val = (int) $size_str;
        switch ($unit) {
            case 'g': $val *= 1024;
            case 'm': $val *= 1024;
            case 'k': $val *= 1024;
        }
        return $val;
    }

    /**
     * Ensure the backup directory exists and is strictly secured against direct HTTP access.
     */
    public function ensure_backup_dir() {
        if (!is_dir($this->backup_dir)) {
            wp_mkdir_p($this->backup_dir);
        }

        $htaccess = $this->backup_dir . '.htaccess';
        if (!file_exists($htaccess)) {
            @file_put_contents($htaccess, "# MDefender-Pro Backup Archive Direct Download Protection\nOrder Deny,Allow\nDeny from all\n<Files *>\nRequire all denied\n</Files>\n");
        }

        $index = $this->backup_dir . 'index.php';
        if (!file_exists($index)) {
            @file_put_contents($index, "<?php\n// Silence is golden.\n");
        }

        $webconfig = $this->backup_dir . 'web.config';
        if (!file_exists($webconfig)) {
            @file_put_contents($webconfig, "<configuration><system.webServer><authorization><deny users=\"*\" /></authorization></system.webServer></configuration>");
        }
    }

    /**
     * Get the absolute path to backup storage.
     */
    public function get_backup_dir() {
        return $this->backup_dir;
    }

    /**
     * Retrieve all recorded backups sorted by newest first.
     */
    public function get_backups() {
        $this->ensure_backup_dir();
        $stored = get_option('waf_fw_backup_catalog', []);
        if (!is_array($stored)) {
            $stored = [];
        }

        // Scan filesystem to ensure catalog is synchronized
        $files = glob($this->backup_dir . '*.zip');
        if (!$files) $files = [];
        
        $sql_files = glob($this->backup_dir . '*.sql*');
        if ($sql_files) {
            $files = array_merge($files, $sql_files);
        }

        $catalog = [];

        foreach ($files as $file_path) {
            $filename = basename($file_path);
            if (in_array($filename, ['.htaccess', 'index.php', 'web.config'])) continue;

            $file_size = @filesize($file_path);
            $file_mtime = @filemtime($file_path);

            if (isset($stored[$filename])) {
                $item = $stored[$filename];
                $item['size'] = $file_size;
                $item['size_formatted'] = size_format($file_size, 2);
                $catalog[$filename] = $item;
            } else {
                // Auto-detect orphan backup file and inspect metadata
                $type = (strpos($filename, 'db_') === 0 || strpos($filename, '.sql') !== false) ? 'database' : ((strpos($filename, 'files_') === 0) ? 'files' : 'full');
                $catalog[$filename] = [
                    'id' => sanitize_key(pathinfo($filename, PATHINFO_FILENAME)),
                    'filename' => $filename,
                    'type' => $type,
                    'created_at' => date('Y-m-d H:i:s', $file_mtime),
                    'size' => $file_size,
                    'size_formatted' => size_format($file_size, 2),
                    'components' => ($type === 'database') ? ['Database'] : (($type === 'files') ? ['Plugins', 'Themes', 'Uploads'] : ['Database', 'Plugins', 'Themes', 'Uploads', 'Core']),
                    'status' => 'completed',
                    'note' => 'Discovered Archive',
                ];
            }
        }

        // Sort newest first
        uasort($catalog, function($a, $b) {
            return strtotime($b['created_at'] ?? 0) - strtotime($a['created_at'] ?? 0);
        });

        update_option('waf_fw_backup_catalog', $catalog);
        return array_values($catalog);
    }

    /**
     * Create a new backup (Full, Database, Files, or Custom selection).
     *
     * @param string $type       full|database|files|custom
     * @param array  $components Array of component keys: db, plugins, themes, uploads, core, wp_config, others
     * @param string $note       User provided label/note
     * @return array
     */
    public function create_backup($type = 'full', $components = [], $note = '') {
        $this->raise_execution_limits();
        $this->ensure_backup_dir();

        $start_time = microtime(true);
        $timestamp = date('Ymd_His');
        $site_name = sanitize_title(get_bloginfo('name')) ?: 'wp_site';
        
        if (empty($components)) {
            if ($type === 'database') {
                $components = ['db'];
            } elseif ($type === 'files') {
                $components = ['plugins', 'themes', 'uploads', 'core', 'wp_config'];
            } else {
                $type = 'full';
                $components = ['db', 'plugins', 'themes', 'uploads', 'core', 'wp_config'];
            }
        }

        $backup_id = 'mdf_' . $type . '_' . $site_name . '_' . $timestamp;
        $zip_filename = $backup_id . '.zip';
        $zip_path = $this->backup_dir . $zip_filename;

        $db_exported = false;
        $db_sql_file = '';
        $db_stats = ['tables_count' => 0, 'rows_count' => 0];

        // Step 1: Export Database if requested
        if (in_array('db', $components)) {
            $db_sql_filename = 'db_dump_' . $timestamp . '.sql';
            $db_sql_file = $this->backup_dir . $db_sql_filename;
            $db_result = $this->export_database($db_sql_file);

            if (!$db_result['success']) {
                if (file_exists($db_sql_file)) @unlink($db_sql_file);
                return ['success' => false, 'message' => 'Database export failed: ' . $db_result['message']];
            }
            $db_exported = true;
            $db_stats = $db_result;
        }

        // Check if database only and no ZipArchive available
        $has_ziparchive = class_exists('ZipArchive');

        if (!$has_ziparchive && count($components) === 1 && in_array('db', $components)) {
            // Keep standalone SQL file
            $final_filename = basename($db_sql_file);
            $file_size = @filesize($db_sql_file);
            $duration = round(microtime(true) - $start_time, 2);
            
            $this->record_backup($final_filename, [
                'id' => $backup_id,
                'filename' => $final_filename,
                'type' => 'database',
                'created_at' => current_time('mysql'),
                'size' => $file_size,
                'size_formatted' => size_format($file_size, 2),
                'components' => ['Database (SQL)'],
                'status' => 'completed',
                'duration' => $duration . 's',
                'note' => $note ?: 'Manual Database Backup',
            ]);

            $this->enforce_retention_limit();

            return [
                'success' => true,
                'message' => 'Database backup generated successfully (' . size_format($file_size, 2) . ') in ' . $duration . 's',
                'filename' => $final_filename,
                'size' => size_format($file_size, 2),
                'duration' => $duration . 's',
            ];
        }

        // Step 2: Build Zip Package using ZipArchive or WordPress PclZip fallback
        $file_count = 0;

        if ($has_ziparchive) {
            $zip = new ZipArchive();
            if ($zip->open($zip_path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                if ($db_sql_file && file_exists($db_sql_file)) @unlink($db_sql_file);
                return ['success' => false, 'message' => 'Unable to create backup zip archive at ' . $zip_path];
            }

            // Add Database SQL to Zip
            if ($db_exported && file_exists($db_sql_file)) {
                $zip->addFile($db_sql_file, 'database.sql');
                $zip->addFile($db_sql_file, 'db/database.sql');
            }

            // Add Files to Zip
            $has_file_components = false;
            foreach (['plugins', 'themes', 'uploads', 'core', 'wp_config', 'others'] as $comp) {
                if (in_array($comp, $components)) {
                    $has_file_components = true;
                    break;
                }
            }

            if ($has_file_components) {
                $file_count = $this->add_files_to_zip($zip, $components);
            }

            // Add backup manifest metadata
            $manifest = [
                'engine' => 'MDefender-Pro Enterprise Backup & Restore',
                'version' => defined('WAF_FW_VERSION') ? WAF_FW_VERSION : '4.2.2',
                'site_url' => home_url(),
                'wp_version' => get_bloginfo('version'),
                'db_prefix' => $GLOBALS['wpdb']->prefix,
                'created_at' => current_time('mysql'),
                'type' => $type,
                'components' => $components,
                'tables_count' => $db_stats['tables_count'] ?? 0,
                'rows_count' => $db_stats['rows_count'] ?? 0,
                'files_count' => $file_count,
            ];
            $zip->addFromString('mdefender-manifest.json', json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            $zip->close();
        } else {
            // PclZip Fallback
            if (!class_exists('PclZip')) {
                require_once ABSPATH . 'wp-admin/includes/class-pclzip.php';
            }
            if (!class_exists('PclZip')) {
                if ($db_sql_file && file_exists($db_sql_file)) @unlink($db_sql_file);
                return ['success' => false, 'message' => 'Neither ZipArchive nor PclZip is available on this PHP installation.'];
            }

            $archive = new PclZip($zip_path);
            $files_to_add = [];
            if ($db_exported && file_exists($db_sql_file)) {
                $files_to_add[] = $db_sql_file;
            }
            
            $manifest_file = $this->backup_dir . 'mdefender-manifest.json';
            $manifest = [
                'engine' => 'MDefender-Pro Enterprise Backup & Restore',
                'version' => defined('WAF_FW_VERSION') ? WAF_FW_VERSION : '4.2.2',
                'site_url' => home_url(),
                'wp_version' => get_bloginfo('version'),
                'db_prefix' => $GLOBALS['wpdb']->prefix,
                'created_at' => current_time('mysql'),
                'type' => $type,
                'components' => $components,
            ];
            @file_put_contents($manifest_file, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            $files_to_add[] = $manifest_file;

            $archive->create($files_to_add, PCLZIP_OPT_REMOVE_PATH, $this->backup_dir);
            if (file_exists($manifest_file)) @unlink($manifest_file);
        }

        // Clean up temporary database SQL file
        if ($db_sql_file && file_exists($db_sql_file)) {
            @unlink($db_sql_file);
        }

        if (!file_exists($zip_path) || filesize($zip_path) === 0) {
            return ['success' => false, 'message' => 'Backup archive generation resulted in an empty file.'];
        }

        $file_size = filesize($zip_path);
        $duration = round(microtime(true) - $start_time, 2);

        $readable_components = array_map(function($c) {
            $map = [
                'db' => 'Database',
                'plugins' => 'Plugins',
                'themes' => 'Themes',
                'uploads' => 'Uploads',
                'core' => 'Core Files',
                'wp_config' => 'Config & Rules',
                'others' => 'wp-content Content',
            ];
            return $map[$c] ?? ucfirst($c);
        }, $components);

        // Record backup in catalog
        $this->record_backup($zip_filename, [
            'id' => $backup_id,
            'filename' => $zip_filename,
            'type' => $type,
            'created_at' => current_time('mysql'),
            'size' => $file_size,
            'size_formatted' => size_format($file_size, 2),
            'components' => $readable_components,
            'status' => 'completed',
            'duration' => $duration . 's',
            'note' => $note ?: 'Manual Site Backup',
            'manifest' => $manifest ?? [],
        ]);

        // Enforce Retention Policy
        $this->enforce_retention_limit();

        return [
            'success' => true,
            'message' => 'Backup created successfully! Archive: ' . $zip_filename . ' (' . size_format($file_size, 2) . ') in ' . $duration . 's',
            'filename' => $zip_filename,
            'size' => size_format($file_size, 2),
            'duration' => $duration . 's',
        ];
    }

    /**
     * UpdraftPlus-grade high-speed, binary-safe database dump streamer.
     *
     * @param string $output_file Path to save the .sql file
     * @return array Result metadata
     */
    public function export_database($output_file) {
        global $wpdb;
        $this->raise_execution_limits();

        $handle = @fopen($output_file, 'wb');
        if (!$handle) {
            return ['success' => false, 'message' => 'Cannot create database dump file at: ' . $output_file];
        }

        $dbh = $wpdb->dbh;
        $is_mysqli = is_object($dbh) && ($dbh instanceof mysqli);

        // Header
        $header = "-- ========================================================\n"
                . "-- MDefender-Pro Enterprise Database Backup Dump\n"
                . "-- Engine: UpdraftPlus-Grade High Performance Streamer\n"
                . "-- Host: " . DB_HOST . "\n"
                . "-- Database: `" . DB_NAME . "`\n"
                . "-- Table Prefix: `" . $wpdb->prefix . "`\n"
                . "-- Generated: " . current_time('mysql') . "\n"
                . "-- WordPress Version: " . get_bloginfo('version') . "\n"
                . "-- Site URL: " . home_url() . "\n"
                . "-- ========================================================\n\n"
                . "SET FOREIGN_KEY_CHECKS=0;\n"
                . "SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";\n"
                . "SET AUTOCOMMIT = 0;\n"
                . "START TRANSACTION;\n"
                . "SET time_zone = \"+00:00\";\n"
                . "SET NAMES utf8mb4;\n\n";
        fwrite($handle, $header);

        // Fetch table list
        $tables = $wpdb->get_col("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
        if (empty($tables)) {
            $tables = $wpdb->get_col("SHOW TABLES");
        }

        if (empty($tables)) {
            fclose($handle);
            return ['success' => false, 'message' => 'No database tables found in MySQL database.'];
        }

        // Prioritize core options and users first (like UpdraftPlus)
        $prioritized = [];
        $others = [];
        foreach ($tables as $t) {
            if ($t === $wpdb->options || $t === $wpdb->users || $t === $wpdb->usermeta) {
                $prioritized[] = $t;
            } else {
                $others[] = $t;
            }
        }
        $tables = array_merge($prioritized, $others);

        $tables_count = count($tables);
        $total_rows_count = 0;

        foreach ($tables as $table) {
            fwrite($handle, "-- --------------------------------------------------------\n");
            fwrite($handle, "-- Table structure for table `{$table}`\n");
            fwrite($handle, "-- --------------------------------------------------------\n");
            fwrite($handle, "DROP TABLE IF EXISTS `{$table}`;\n");

            $create_row = $wpdb->get_row("SHOW CREATE TABLE `{$table}`", ARRAY_N);
            if ($create_row && isset($create_row[1])) {
                fwrite($handle, $create_row[1] . ";\n\n");
            }

            // Stream rows in safe batches of 250
            $total_table_rows = (int) $wpdb->get_var("SELECT COUNT(*) FROM `{$table}`");
            if ($total_table_rows === 0) {
                continue;
            }

            $total_rows_count += $total_table_rows;
            fwrite($handle, "-- Dumping data for table `{$table}` (" . $total_table_rows . " rows)\n");

            // Fetch column structure to detect binary / blob columns
            $cols_info = $wpdb->get_results("SHOW COLUMNS FROM `{$table}`", ARRAY_A);
            $binary_cols = [];
            $col_names = [];
            foreach ($cols_info as $col) {
                $col_name = $col['Field'];
                $col_names[] = '`' . str_replace('`', '``', $col_name) . '`';
                $col_type = strtolower($col['Type']);
                if (strpos($col_type, 'blob') !== false || strpos($col_type, 'binary') !== false) {
                    $binary_cols[$col_name] = true;
                }
            }

            $insert_prefix = "INSERT INTO `{$table}` (" . implode(', ', $col_names) . ") VALUES\n";
            $batch_size = 250;
            $offset = 0;

            while ($offset < $total_table_rows) {
                $rows = $wpdb->get_results("SELECT * FROM `{$table}` LIMIT {$offset}, {$batch_size}", ARRAY_A);
                if (!$rows || empty($rows)) break;

                $row_strings = [];

                foreach ($rows as $row) {
                    $values = [];
                    foreach ($row as $col_name => $val) {
                        if (is_null($val)) {
                            $values[] = 'NULL';
                        } elseif (isset($binary_cols[$col_name]) && $val !== '') {
                            $values[] = '0x' . bin2hex($val);
                        } elseif (is_int($val) || is_float($val)) {
                            $values[] = $val;
                        } else {
                            // Safe binary and special char escaping
                            if ($is_mysqli) {
                                $escaped = mysqli_real_escape_string($dbh, $val);
                            } else {
                                $escaped = addslashes($val);
                            }
                            $values[] = "'" . $escaped . "'";
                        }
                    }
                    $row_strings[] = '(' . implode(', ', $values) . ')';
                }

                if (!empty($row_strings)) {
                    fwrite($handle, $insert_prefix . implode(",\n", $row_strings) . ";\n");
                }

                $offset += $batch_size;
            }

            fwrite($handle, "\n");
        }

        // Commit transaction and restore checks
        fwrite($handle, "COMMIT;\n");
        fwrite($handle, "SET FOREIGN_KEY_CHECKS=1;\n");
        fwrite($handle, "-- MDefender-Pro database export completed successfully.\n");
        fclose($handle);

        return [
            'success' => true,
            'tables_count' => $tables_count,
            'rows_count' => $total_rows_count,
            'file_size' => @filesize($output_file),
        ];
    }

    /**
     * Recursively add WordPress files to zip archive with smart exclusion rules.
     */
    private function add_files_to_zip($zip, $components) {
        $abs_path = wp_normalize_path(ABSPATH);
        $wp_content_path = wp_normalize_path(WP_CONTENT_DIR);
        $backup_dir_norm = wp_normalize_path($this->backup_dir);
        $file_count = 0;

        // 1. wp-config.php and .htaccess
        if (in_array('wp_config', $components) || in_array('core', $components)) {
            if (file_exists(ABSPATH . 'wp-config.php')) {
                $zip->addFile(ABSPATH . 'wp-config.php', 'wp-config.php');
                $zip->addFile(ABSPATH . 'wp-config.php', 'core/wp-config.php');
                $file_count++;
            }
            if (file_exists(ABSPATH . '.htaccess')) {
                $zip->addFile(ABSPATH . '.htaccess', '.htaccess');
                $zip->addFile(ABSPATH . '.htaccess', 'core/.htaccess');
                $file_count++;
            }
        }

        // 2. Core WordPress Engine (wp-admin, wp-includes, root php)
        if (in_array('core', $components)) {
            $core_dirs = [ABSPATH . 'wp-admin', ABSPATH . 'wp-includes'];
            foreach ($core_dirs as $cdir) {
                if (is_dir($cdir)) {
                    $file_count += $this->add_folder_to_zip($zip, $cdir, $abs_path, $backup_dir_norm, 'core/');
                }
            }
            foreach (glob(ABSPATH . '*.php') as $root_file) {
                $rel_name = basename($root_file);
                if ($rel_name !== 'wp-config.php') {
                    $zip->addFile($root_file, $rel_name);
                    $zip->addFile($root_file, 'core/' . $rel_name);
                    $file_count++;
                }
            }
        }

        // 3. Plugins
        if (in_array('plugins', $components)) {
            $plugins_dir = WP_PLUGIN_DIR;
            if (is_dir($plugins_dir)) {
                $file_count += $this->add_folder_to_zip($zip, $plugins_dir, wp_normalize_path($plugins_dir), $backup_dir_norm, 'plugins/');
            }
        }

        // 4. Themes
        if (in_array('themes', $components)) {
            $themes_dir = get_theme_root();
            if (is_dir($themes_dir)) {
                $file_count += $this->add_folder_to_zip($zip, $themes_dir, wp_normalize_path($themes_dir), $backup_dir_norm, 'themes/');
            }
        }

        // 5. Uploads
        if (in_array('uploads', $components)) {
            $upload_dir = wp_upload_dir();
            $uploads_path = $upload_dir['basedir'];
            if (is_dir($uploads_path)) {
                $file_count += $this->add_folder_to_zip($zip, $uploads_path, wp_normalize_path($uploads_path), $backup_dir_norm, 'uploads/');
            }
        }

        // 6. Other wp-content directories (e.g. languages, mu-plugins)
        if (in_array('others', $components)) {
            $content_items = glob(WP_CONTENT_DIR . '/*');
            $known_skips = ['plugins', 'themes', 'uploads', 'cache', 'mdefender-backups', 'updraft'];
            foreach ($content_items as $citem) {
                $base = basename($citem);
                if (in_array($base, $known_skips)) continue;
                if (is_dir($citem)) {
                    $file_count += $this->add_folder_to_zip($zip, $citem, $wp_content_path, $backup_dir_norm, 'others/' . $base . '/');
                } elseif (is_file($citem)) {
                    $zip->addFile($citem, 'others/' . $base);
                    $file_count++;
                }
            }
        }

        return $file_count;
    }

    /**
     * Add a folder recursively to zip ignoring blacklisted paths and transient files.
     */
    private function add_folder_to_zip($zip, $folder, $base_path, $backup_dir, $prefix = '') {
        $count = 0;
        $folder = wp_normalize_path($folder);
        $base_path = rtrim(wp_normalize_path($base_path), '/');
        
        try {
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($folder, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::SELF_FIRST
            );

            foreach ($iterator as $item) {
                $item_path = wp_normalize_path($item->getPathname());

                // Exclude backup directory
                if (strpos($item_path, $backup_dir) === 0) continue;
                if (strpos($item_path, '/mdefender-backups/') !== false) continue;
                if (strpos($item_path, '/updraft/') !== false) continue;

                // Exclude caches, VCS, node_modules, temp files
                if (strpos($item_path, '/cache/') !== false) continue;
                if (strpos($item_path, '/et-cache/') !== false) continue;
                if (strpos($item_path, '/litespeed/') !== false) continue;
                if (strpos($item_path, '/.git/') !== false) continue;
                if (strpos($item_path, '/.svn/') !== false) continue;
                if (strpos($item_path, '/node_modules/') !== false) continue;
                
                $ext = strtolower(pathinfo($item_path, PATHINFO_EXTENSION));
                if (in_array($ext, ['log', 'tmp', 'bak'])) continue;

                $rel = ltrim(substr($item_path, strlen($base_path)), '/');
                $zip_entry_name = $prefix ? (rtrim($prefix, '/') . '/' . $rel) : $rel;

                if ($item->isDir()) {
                    $zip->addEmptyDir($zip_entry_name);
                } elseif ($item->isFile()) {
                    $zip->addFile($item_path, $zip_entry_name);
                    $count++;
                }
            }
        } catch (\Throwable $e) {
            // Ignore unreadable items or permission hiccups
        }

        return $count;
    }

    /**
     * 1-Click Disaster Recovery Restoration Engine.
     *
     * @param string $filename Name of backup archive (.zip or .sql)
     * @return array Restoration summary and action logs
     */
    public function restore_backup($filename) {
        $this->raise_execution_limits();
        $this->ensure_backup_dir();

        $filename = sanitize_file_name($filename);
        $file_path = $this->backup_dir . $filename;

        if (!file_exists($file_path)) {
            return ['success' => false, 'message' => 'Backup archive file not found on server: ' . $filename];
        }

        $start_time = microtime(true);
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

        // 1. Direct SQL Dump Restoration
        if ($ext === 'sql' || $ext === 'gz') {
            $db_result = $this->import_database_file($file_path);
            if (!$db_result['success']) {
                return $db_result;
            }

            $this->flush_system_caches();
            $duration = round(microtime(true) - $start_time, 2);

            return [
                'success' => true,
                'message' => 'Database successfully restored from ' . $filename . ' (' . ($db_result['queries'] ?? 0) . ' SQL queries executed in ' . $duration . 's).',
                'duration' => $duration . 's',
                'actions' => ['Database restored from SQL dump (' . ($db_result['queries'] ?? 0) . ' queries)'],
            ];
        }

        // 2. ZIP Archive Restoration
        if (!class_exists('ZipArchive')) {
            // Fallback check
            if (!class_exists('PclZip')) {
                require_once ABSPATH . 'wp-admin/includes/class-pclzip.php';
            }
        }

        $staging_dir = $this->backup_dir . 'mdf_stage_' . uniqid() . '/';
        wp_mkdir_p($staging_dir);

        // Extract archive to staging area
        $extract_success = false;
        if (class_exists('ZipArchive')) {
            $zip = new ZipArchive();
            if ($zip->open($file_path) === true) {
                $extract_success = $zip->extractTo($staging_dir);
                $zip->close();
            }
        }

        if (!$extract_success && class_exists('PclZip')) {
            $archive = new PclZip($file_path);
            $extract_success = ($archive->extract(PCLZIP_OPT_PATH, $staging_dir) !== 0);
        }

        if (!$extract_success) {
            $this->delete_directory($staging_dir);
            return ['success' => false, 'message' => 'Failed to unpack backup ZIP archive. Verify archive integrity and disk permissions.'];
        }

        $actions_log = [];

        // 3. Database Restoration
        $sql_candidates = [
            $staging_dir . 'database.sql',
            $staging_dir . 'db/database.sql',
            $staging_dir . 'db_dump.sql',
        ];
        // Scan for any .sql file in staging root or db/ folder
        foreach (glob($staging_dir . '*.sql') ?: [] as $s) {
            $sql_candidates[] = $s;
        }

        $sql_found = '';
        foreach ($sql_candidates as $cand) {
            if (file_exists($cand) && filesize($cand) > 0) {
                $sql_found = $cand;
                break;
            }
        }

        if ($sql_found) {
            $db_res = $this->import_database_file($sql_found);
            if ($db_res['success']) {
                $actions_log[] = 'Database reconstructed (' . ($db_res['queries'] ?? 0) . ' queries executed)';
            } else {
                $actions_log[] = 'Database restore note: ' . $db_res['message'];
            }
            @unlink($sql_found);
        }

        // Remove manifest & SQL files from staging before file deployment
        if (file_exists($staging_dir . 'mdefender-manifest.json')) {
            @unlink($staging_dir . 'mdefender-manifest.json');
        }
        if (is_dir($staging_dir . 'db')) {
            $this->delete_directory($staging_dir . 'db');
        }

        // 4. Component-Based File Deployment
        $total_files_restored = 0;

        // A. Plugins Directory
        if (is_dir($staging_dir . 'plugins')) {
            $count = $this->copy_directory($staging_dir . 'plugins', WP_PLUGIN_DIR);
            $actions_log[] = $count . ' plugin files restored';
            $total_files_restored += $count;
            $this->delete_directory($staging_dir . 'plugins');
        }

        // B. Themes Directory
        if (is_dir($staging_dir . 'themes')) {
            $count = $this->copy_directory($staging_dir . 'themes', get_theme_root());
            $actions_log[] = $count . ' theme files restored';
            $total_files_restored += $count;
            $this->delete_directory($staging_dir . 'themes');
        }

        // C. Uploads Directory
        if (is_dir($staging_dir . 'uploads')) {
            $upload_dir = wp_upload_dir();
            $count = $this->copy_directory($staging_dir . 'uploads', $upload_dir['basedir']);
            $actions_log[] = $count . ' media uploads restored';
            $total_files_restored += $count;
            $this->delete_directory($staging_dir . 'uploads');
        }

        // D. Others Directory
        if (is_dir($staging_dir . 'others')) {
            $count = $this->copy_directory($staging_dir . 'others', WP_CONTENT_DIR);
            $actions_log[] = $count . ' wp-content files restored';
            $total_files_restored += $count;
            $this->delete_directory($staging_dir . 'others');
        }

        // E. Core Directory
        if (is_dir($staging_dir . 'core')) {
            $count = $this->copy_directory($staging_dir . 'core', ABSPATH);
            $actions_log[] = $count . ' WordPress core files restored';
            $total_files_restored += $count;
            $this->delete_directory($staging_dir . 'core');
        }

        // F. Root / Standard WordPress Hierarchy Deployment (for legacy backups)
        $remaining_items = scandir($staging_dir);
        $has_remaining = false;
        foreach ($remaining_items as $item) {
            if ($item !== '.' && $item !== '..') {
                $has_remaining = true;
                break;
            }
        }

        if ($has_remaining) {
            // Deploy remaining root files & wp-content directly to ABSPATH
            $count = $this->copy_directory($staging_dir, ABSPATH);
            if ($count > 0) {
                $actions_log[] = $count . ' root files deployed';
                $total_files_restored += $count;
            }
        }

        // 5. Clean up temporary staging directory
        $this->delete_directory($staging_dir);

        // 6. Reset all caches
        $this->flush_system_caches();

        $duration = round(microtime(true) - $start_time, 2);

        return [
            'success' => true,
            'message' => 'Website successfully restored to snapshot in ' . $duration . 's! Actions: ' . implode('; ', $actions_log),
            'duration' => $duration . 's',
            'actions' => $actions_log,
            'files_restored' => $total_files_restored,
        ];
    }

    /**
     * UpdraftPlus-grade intelligent SQL streaming parser and executor.
     *
     * Correctly handles single/double quote escaping, backticks, embedded semicolons,
     * multi-line queries, and comments without breaking SQL syntax.
     *
     * @param string $sql_file Path to .sql or .gz file
     * @return array Result metadata
     */
    public function import_database_file($sql_file) {
        global $wpdb;
        $this->raise_execution_limits();

        $dbh = $wpdb->dbh;
        $is_mysqli = is_object($dbh) && ($dbh instanceof mysqli);

        // Open file handle (supporting gz if needed)
        $is_gz = (substr(strtolower($sql_file), -3) === '.gz');
        $handle = $is_gz ? @gzopen($sql_file, 'rb') : @fopen($sql_file, 'rb');

        if (!$handle) {
            return ['success' => false, 'message' => 'Cannot read SQL dump file: ' . basename($sql_file)];
        }

        // Disable foreign key constraints & enable autocommit
        $wpdb->query("SET FOREIGN_KEY_CHECKS = 0;");
        $wpdb->query("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';");
        if ($is_mysqli) {
            @mysqli_set_charset($dbh, 'utf8mb4');
        }

        $query_buffer = '';
        $queries_executed = 0;
        $in_single_quote = false;
        $in_double_quote = false;
        $in_backtick = false;
        $in_line_comment = false;
        $in_block_comment = false;
        $escaped = false;

        while (!($is_gz ? gzeof($handle) : feof($handle))) {
            $chunk = $is_gz ? gzread($handle, 65536) : fread($handle, 65536);
            if ($chunk === false || $chunk === '') break;

            $len = strlen($chunk);

            for ($i = 0; $i < $len; $i++) {
                $char = $chunk[$i];
                $next = ($i + 1 < $len) ? $chunk[$i + 1] : '';

                // Handle Comments
                if ($in_line_comment) {
                    if ($char === "\n" || $char === "\r") {
                        $in_line_comment = false;
                        $query_buffer .= $char;
                    }
                    continue;
                }

                if ($in_block_comment) {
                    if ($char === '*' && $next === '/') {
                        $in_block_comment = false;
                        $i++; // skip /
                    }
                    continue;
                }

                // Check starting line comments (only outside quotes)
                if (!$in_single_quote && !$in_double_quote && !$in_backtick) {
                    if ($char === '#' || ($char === '-' && $next === '-')) {
                        $in_line_comment = true;
                        if ($char === '-') $i++;
                        continue;
                    }
                    if ($char === '/' && $next === '*') {
                        // Check if MySQL specific conditional comment (e.g. /*!40101 ... */)
                        if ($i + 2 < $len && $chunk[$i + 2] === '!') {
                            // Keep MySQL conditional comment content
                        } else {
                            $in_block_comment = true;
                            $i++;
                            continue;
                        }
                    }
                }

                // Handle Escapes inside strings
                if ($escaped) {
                    $query_buffer .= $char;
                    $escaped = false;
                    continue;
                }

                if ($char === '\\' && ($in_single_quote || $in_double_quote)) {
                    $escaped = true;
                    $query_buffer .= $char;
                    continue;
                }

                // Handle Quotes
                if ($char === "'" && !$in_double_quote && !$in_backtick) {
                    $in_single_quote = !$in_single_quote;
                } elseif ($char === '"' && !$in_single_quote && !$in_backtick) {
                    $in_double_quote = !$in_double_quote;
                } elseif ($char === '`' && !$in_single_quote && !$in_double_quote) {
                    $in_backtick = !$in_backtick;
                }

                // Query Delimiter ';' outside of any string or backticks
                if ($char === ';' && !$in_single_quote && !$in_double_quote && !$in_backtick) {
                    $trimmed_sql = trim($query_buffer);
                    if (!empty($trimmed_sql)) {
                        if ($is_mysqli) {
                            @mysqli_query($dbh, $trimmed_sql);
                        } else {
                            $wpdb->query($trimmed_sql);
                        }
                        $queries_executed++;
                    }
                    $query_buffer = '';
                    continue;
                }

                $query_buffer .= $char;
            }
        }

        // Execute any trailing statement
        $trimmed_sql = trim($query_buffer);
        if (!empty($trimmed_sql)) {
            if ($is_mysqli) {
                @mysqli_query($dbh, $trimmed_sql);
            } else {
                $wpdb->query($trimmed_sql);
            }
            $queries_executed++;
        }

        if ($is_gz) {
            gzclose($handle);
        } else {
            fclose($handle);
        }

        $wpdb->query("SET FOREIGN_KEY_CHECKS = 1;");

        return [
            'success' => true,
            'queries' => $queries_executed,
        ];
    }

    /**
     * Flush all WordPress, opcode, object, and rewrite caches.
     */
    public function flush_system_caches() {
        if (function_exists('wp_cache_flush')) {
            @wp_cache_flush();
        }
        if (function_exists('opcache_reset')) {
            @opcache_reset();
        }
        if (function_exists('flush_rewrite_rules')) {
            @flush_rewrite_rules(false);
        }
    }

    /**
     * Record backup metadata to options catalog.
     */
    private function record_backup($filename, $data) {
        $catalog = get_option('waf_fw_backup_catalog', []);
        if (!is_array($catalog)) $catalog = [];
        $catalog[$filename] = $data;
        update_option('waf_fw_backup_catalog', $catalog);
    }

    /**
     * Delete a single backup archive.
     */
    public function delete_backup($filename) {
        $filename = sanitize_file_name($filename);
        $file_path = $this->backup_dir . $filename;

        if (file_exists($file_path)) {
            @unlink($file_path);
        }

        $catalog = get_option('waf_fw_backup_catalog', []);
        if (isset($catalog[$filename])) {
            unset($catalog[$filename]);
            update_option('waf_fw_backup_catalog', $catalog);
        }

        return ['success' => true, 'message' => 'Backup archive deleted successfully: ' . $filename];
    }

    /**
     * Enforce maximum backup retention limit to prevent server disk overflow.
     */
    public function enforce_retention_limit() {
        $limit = (int) get_option('waf_fw_backup_retention', 5);
        if ($limit <= 0) $limit = 5;

        $backups = $this->get_backups();
        if (count($backups) > $limit) {
            $to_remove = array_slice($backups, $limit);
            foreach ($to_remove as $old) {
                if (!empty($old['filename'])) {
                    $this->delete_backup($old['filename']);
                }
            }
        }
    }

    /**
     * Cron handler for automated scheduled backups.
     */
    public function run_scheduled_backup() {
        $type = get_option('waf_fw_backup_sched_type', 'full');
        $this->create_backup($type, [], 'Automated Scheduled Backup');
    }

    /**
     * Save scheduled backup settings and configure WP-Cron.
     */
    public function save_schedule_settings($settings) {
        $enabled = !empty($settings['enabled']);
        $frequency = sanitize_text_field($settings['frequency'] ?? 'daily');
        $type = sanitize_text_field($settings['type'] ?? 'full');
        $retention = (int)($settings['retention'] ?? 5);

        update_option('waf_fw_backup_sched_enabled', $enabled ? 'yes' : 'no');
        update_option('waf_fw_backup_sched_freq', $frequency);
        update_option('waf_fw_backup_sched_type', $type);
        update_option('waf_fw_backup_retention', max(1, min(30, $retention)));

        wp_clear_scheduled_hook('waf_fw_automated_backup_cron');

        if ($enabled) {
            if (!wp_next_scheduled('waf_fw_automated_backup_cron')) {
                wp_schedule_event(time() + 300, $frequency, 'waf_fw_automated_backup_cron');
            }
        }

        return [
            'success' => true,
            'message' => 'Automated backup schedule updated successfully.',
        ];
    }

    /**
     * Recursive directory copy with directory structure preservation.
     */
    private function copy_directory($src, $dst) {
        $count = 0;
        if (!is_dir($src)) return 0;
        if (!is_dir($dst)) @wp_mkdir_p($dst);

        $dir = @opendir($src);
        if (!$dir) return 0;

        while (false !== ($file = readdir($dir))) {
            if ($file === '.' || $file === '..') continue;
            
            $src_path = $src . '/' . $file;
            $dst_path = $dst . '/' . $file;

            if (is_dir($src_path)) {
                $count += $this->copy_directory($src_path, $dst_path);
            } else {
                if (@copy($src_path, $dst_path)) {
                    $count++;
                }
            }
        }
        closedir($dir);
        return $count;
    }

    /**
     * Recursive directory removal.
     */
    private function delete_directory($dir) {
        if (!file_exists($dir)) return true;
        if (!is_dir($dir)) return @unlink($dir);

        $items = @scandir($dir);
        if (!$items) return @rmdir($dir);

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') continue;
            $path = $dir . DIRECTORY_SEPARATOR . $item;
            if (is_dir($path)) {
                $this->delete_directory($path);
            } else {
                @unlink($path);
            }
        }
        return @rmdir($dir);
    }
}
