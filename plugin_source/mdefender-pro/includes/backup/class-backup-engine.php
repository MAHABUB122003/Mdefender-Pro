<?php
/**
 * MDefender-Pro Enterprise Backup & Restore Engine
 *
 * Provides high-performance database dumps, full-site file archiving,
 * 1-click disaster recovery restoration, scheduled automated backups,
 * and secure archive management.
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
     * Ensure the backup directory exists and is secured against direct HTTP access.
     */
    public function ensure_backup_dir() {
        if (!is_dir($this->backup_dir)) {
            wp_mkdir_p($this->backup_dir);
        }

        $htaccess = $this->backup_dir . '.htaccess';
        if (!file_exists($htaccess)) {
            @file_put_contents($htaccess, "# MDefender-Pro Backup Protection\nOrder Deny,Allow\nDeny from all\n<Files *>\nRequire all denied\n</Files>\n");
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
        $existing_files = [];

        foreach ($files as $file_path) {
            $filename = basename($file_path);
            if (in_array($filename, ['.htaccess', 'index.php', 'web.config'])) continue;

            $existing_files[] = $filename;
            $file_size = @filesize($file_path);
            $file_mtime = @filemtime($file_path);

            if (isset($stored[$filename])) {
                $item = $stored[$filename];
                $item['size'] = $file_size;
                $item['size_formatted'] = size_format($file_size, 2);
                $catalog[$filename] = $item;
            } else {
                // Auto-detect orphan backup file
                $type = (strpos($filename, 'db_') === 0 || strpos($filename, '.sql') !== false) ? 'database' : ((strpos($filename, 'files_') === 0) ? 'files' : 'full');
                $catalog[$filename] = [
                    'id' => sanitize_key(pathinfo($filename, PATHINFO_FILENAME)),
                    'filename' => $filename,
                    'type' => $type,
                    'created_at' => date('Y-m-d H:i:s', $file_mtime),
                    'size' => $file_size,
                    'size_formatted' => size_format($file_size, 2),
                    'components' => ($type === 'database') ? ['Database'] : (($type === 'files') ? ['Files'] : ['Database', 'Core', 'Plugins', 'Themes', 'Uploads']),
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
     * Create a new backup (Full, Database, Files, or Custom).
     */
    public function create_backup($type = 'full', $components = [], $note = '') {
        @set_time_limit(600);
        @ini_set('memory_limit', '512M');
        $this->ensure_backup_dir();

        $start_time = microtime(true);
        $timestamp = date('Ymd_His');
        $site_name = sanitize_title(get_bloginfo('name')) ?: 'wp_site';
        
        if (empty($components)) {
            if ($type === 'database') {
                $components = ['db'];
            } elseif ($type === 'files') {
                $components = ['core', 'plugins', 'themes', 'uploads'];
            } else {
                $type = 'full';
                $components = ['db', 'core', 'plugins', 'themes', 'uploads', 'wp_config'];
            }
        }

        $backup_id = 'mdf_' . $type . '_' . $site_name . '_' . $timestamp;
        $zip_filename = $backup_id . '.zip';
        $zip_path = $this->backup_dir . $zip_filename;

        $db_exported = false;
        $db_sql_file = '';

        // Step 1: Export Database if requested
        if (in_array('db', $components)) {
            $db_sql_filename = 'database_' . $timestamp . '.sql';
            $db_sql_file = $this->backup_dir . $db_sql_filename;
            $db_result = $this->export_database($db_sql_file);

            if (!$db_result['success']) {
                if (file_exists($db_sql_file)) @unlink($db_sql_file);
                return ['success' => false, 'message' => 'Database export failed: ' . $db_result['message']];
            }
            $db_exported = true;
        }

        // Step 2: Create Zip Archive
        if (!class_exists('ZipArchive')) {
            if ($db_exported && $type === 'database') {
                // If no ZipArchive, keep the plain SQL
                $final_filename = basename($db_sql_file);
                $file_size = filesize($db_sql_file);
                $duration = round(microtime(true) - $start_time, 2);
                
                $this->record_backup($final_filename, [
                    'id' => $backup_id,
                    'filename' => $final_filename,
                    'type' => $type,
                    'created_at' => current_time('mysql'),
                    'size' => $file_size,
                    'size_formatted' => size_format($file_size, 2),
                    'components' => $components,
                    'status' => 'completed',
                    'duration' => $duration . 's',
                    'note' => $note ?: 'Manual Database Backup',
                ]);

                return [
                    'success' => true,
                    'message' => 'Database backup created successfully (' . size_format($file_size, 2) . ') in ' . $duration . 's',
                    'filename' => $final_filename,
                    'size' => size_format($file_size, 2),
                ];
            }
            return ['success' => false, 'message' => 'ZipArchive PHP extension is missing on this server.'];
        }

        $zip = new ZipArchive();
        if ($zip->open($zip_path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            if ($db_sql_file && file_exists($db_sql_file)) @unlink($db_sql_file);
            return ['success' => false, 'message' => 'Unable to create backup zip archive at ' . $zip_path];
        }

        // Add Database SQL to Zip
        if ($db_exported && file_exists($db_sql_file)) {
            $zip->addFile($db_sql_file, 'database.sql');
        }

        // Add Files to Zip
        $file_count = 0;
        if (in_array('core', $components) || in_array('plugins', $components) || in_array('themes', $components) || in_array('uploads', $components) || in_array('wp_config', $components)) {
            $file_count = $this->add_files_to_zip($zip, $components);
        }

        // Add backup manifest metadata
        $manifest = [
            'mdefender_version' => defined('WAF_FW_VERSION') ? WAF_FW_VERSION : '4.2.2',
            'site_url' => home_url(),
            'wp_version' => get_bloginfo('version'),
            'type' => $type,
            'components' => $components,
            'created_at' => current_time('mysql'),
            'db_prefix' => $GLOBALS['wpdb']->prefix,
            'tables_count' => $db_result['tables_count'] ?? 0,
            'files_count' => $file_count,
        ];
        $zip->addFromString('mdefender-manifest.json', json_encode($manifest, JSON_PRETTY_PRINT));

        $zip->close();

        // Clean up temporary database SQL file
        if ($db_sql_file && file_exists($db_sql_file)) {
            @unlink($db_sql_file);
        }

        if (!file_exists($zip_path) || filesize($zip_path) === 0) {
            return ['success' => false, 'message' => 'Backup archive generation resulted in an empty file.'];
        }

        $file_size = filesize($zip_path);
        $duration = round(microtime(true) - $start_time, 2);

        // Record backup in catalog
        $this->record_backup($zip_filename, [
            'id' => $backup_id,
            'filename' => $zip_filename,
            'type' => $type,
            'created_at' => current_time('mysql'),
            'size' => $file_size,
            'size_formatted' => size_format($file_size, 2),
            'components' => array_map(function($c) {
                return ucfirst(str_replace('_', ' ', $c));
            }, $components),
            'status' => 'completed',
            'duration' => $duration . 's',
            'note' => $note ?: 'Manual Site Backup',
            'manifest' => $manifest,
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
     * High-speed, memory-safe database export streamer.
     */
    private function export_database($output_file) {
        global $wpdb;
        $handle = @fopen($output_file, 'w');
        if (!$handle) {
            return ['success' => false, 'message' => 'Cannot write to ' . $output_file];
        }

        $header = "-- ========================================================\n"
                . "-- MDefender-Pro Enterprise Database Backup Dump\n"
                . "-- Host: " . DB_HOST . "\n"
                . "-- Database: " . DB_NAME . "\n"
                . "-- Table Prefix: " . $wpdb->prefix . "\n"
                . "-- Generated: " . current_time('mysql') . "\n"
                . "-- ========================================================\n\n"
                . "SET FOREIGN_KEY_CHECKS=0;\n"
                . "SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";\n"
                . "SET NAMES utf8mb4;\n\n";
        fwrite($handle, $header);

        $tables = $wpdb->get_col("SHOW TABLES");
        if (empty($tables)) {
            fclose($handle);
            return ['success' => false, 'message' => 'No database tables found.'];
        }

        $tables_count = count($tables);

        foreach ($tables as $table) {
            // Write Drop and Create Table
            fwrite($handle, "-- --------------------------------------------------------\n");
            fwrite($handle, "-- Table structure for table `{$table}`\n");
            fwrite($handle, "-- --------------------------------------------------------\n");
            fwrite($handle, "DROP TABLE IF EXISTS `{$table}`;\n");

            $create_query = $wpdb->get_row("SHOW CREATE TABLE `{$table}`", ARRAY_N);
            if ($create_query && isset($create_query[1])) {
                fwrite($handle, $create_query[1] . ";\n\n");
            }

            // Write Table Data in safe streaming chunks
            $count = (int) $wpdb->get_var("SELECT COUNT(*) FROM `{$table}`");
            if ($count === 0) {
                continue;
            }

            fwrite($handle, "-- Dumping data for table `{$table}` (" . $count . " rows)\n");
            $chunk_size = 500;
            $offset = 0;

            while ($offset < $count) {
                $rows = $wpdb->get_results("SELECT * FROM `{$table}` LIMIT {$offset}, {$chunk_size}", ARRAY_A);
                if (!$rows) break;

                $columns = array_keys($rows[0]);
                $col_names = implode('`, `', array_map('esc_sql', $columns));

                $insert_head = "INSERT INTO `{$table}` (`{$col_names}`) VALUES\n";
                $row_strings = [];

                foreach ($rows as $row) {
                    $vals = [];
                    foreach ($row as $val) {
                        if (is_null($val)) {
                            $vals[] = 'NULL';
                        } else {
                            $vals[] = "'" . $wpdb->_real_escape($val) . "'";
                        }
                    }
                    $row_strings[] = '(' . implode(', ', $vals) . ')';
                }

                if (!empty($row_strings)) {
                    fwrite($handle, $insert_head . implode(",\n", $row_strings) . ";\n");
                }

                $offset += $chunk_size;
            }

            fwrite($handle, "\n");
        }

        fwrite($handle, "SET FOREIGN_KEY_CHECKS=1;\n-- Dump completed\n");
        fclose($handle);

        return ['success' => true, 'tables_count' => $tables_count];
    }

    /**
     * Recursively add WordPress files to zip archive with smart exclusion rules.
     */
    private function add_files_to_zip($zip, $components) {
        $abs_path = wp_normalize_path(ABSPATH);
        $wp_content_path = wp_normalize_path(WP_CONTENT_DIR);
        $backup_dir_norm = wp_normalize_path($this->backup_dir);
        $file_count = 0;

        // Add wp-config.php and .htaccess
        if (in_array('wp_config', $components) || in_array('core', $components)) {
            if (file_exists(ABSPATH . 'wp-config.php')) {
                $zip->addFile(ABSPATH . 'wp-config.php', 'wp-config.php');
                $file_count++;
            }
            if (file_exists(ABSPATH . '.htaccess')) {
                $zip->addFile(ABSPATH . '.htaccess', '.htaccess');
                $file_count++;
            }
        }

        // Add Core Directories
        if (in_array('core', $components)) {
            $core_dirs = [ABSPATH . 'wp-admin', ABSPATH . 'wp-includes'];
            foreach ($core_dirs as $cdir) {
                if (is_dir($cdir)) {
                    $file_count += $this->add_folder_to_zip($zip, $cdir, $abs_path, $backup_dir_norm);
                }
            }
            // Root PHP files
            foreach (glob(ABSPATH . '*.php') as $root_file) {
                $rel_name = basename($root_file);
                if (!in_array($rel_name, ['wp-config.php'])) {
                    $zip->addFile($root_file, $rel_name);
                    $file_count++;
                }
            }
        }

        // Add Plugins
        if (in_array('plugins', $components)) {
            $plugins_dir = WP_CONTENT_DIR . '/plugins';
            if (is_dir($plugins_dir)) {
                $file_count += $this->add_folder_to_zip($zip, $plugins_dir, $abs_path, $backup_dir_norm);
            }
        }

        // Add Themes
        if (in_array('themes', $components)) {
            $themes_dir = WP_CONTENT_DIR . '/themes';
            if (is_dir($themes_dir)) {
                $file_count += $this->add_folder_to_zip($zip, $themes_dir, $abs_path, $backup_dir_norm);
            }
        }

        // Add Uploads
        if (in_array('uploads', $components)) {
            $upload_dir = wp_upload_dir();
            $uploads_path = $upload_dir['basedir'];
            if (is_dir($uploads_path)) {
                $file_count += $this->add_folder_to_zip($zip, $uploads_path, $abs_path, $backup_dir_norm);
            }
        }

        return $file_count;
    }

    /**
     * Add a folder recursively to zip ignoring blacklisted paths.
     */
    private function add_folder_to_zip($zip, $folder, $base_path, $backup_dir) {
        $count = 0;
        $folder = wp_normalize_path($folder);
        
        try {
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($folder, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::SELF_FIRST
            );

            foreach ($iterator as $item) {
                $item_path = wp_normalize_path($item->getPathname());

                // Skip backup directory
                if (strpos($item_path, $backup_dir) === 0) continue;

                // Skip cache, git, node_modules
                if (strpos($item_path, '/cache/') !== false) continue;
                if (strpos($item_path, '/.git/') !== false) continue;
                if (strpos($item_path, '/node_modules/') !== false) continue;
                if (substr($item_path, -4) === '.log') continue;

                $rel_path = ltrim(str_replace($base_path, '', $item_path), '/');

                if ($item->isDir()) {
                    $zip->addEmptyDir($rel_path);
                } elseif ($item->isFile()) {
                    $zip->addFile($item_path, $rel_path);
                    $count++;
                }
            }
        } catch (\Throwable $e) {
            // Ignore unreadable items
        }

        return $count;
    }

    /**
     * Restore a backup archive into the active WordPress installation.
     */
    public function restore_backup($filename) {
        @set_time_limit(600);
        @ini_set('memory_limit', '512M');
        $this->ensure_backup_dir();

        $filename = sanitize_file_name($filename);
        $file_path = $this->backup_dir . $filename;

        if (!file_exists($file_path)) {
            return ['success' => false, 'message' => 'Backup archive file not found on server: ' . $filename];
        }

        $start_time = microtime(true);
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

        // Direct SQL Restore
        if ($ext === 'sql') {
            $db_result = $this->import_database_file($file_path);
            if (!$db_result['success']) {
                return $db_result;
            }
            return [
                'success' => true,
                'message' => 'Database successfully restored from ' . $filename . ' (' . ($db_result['queries'] ?? 0) . ' queries executed).',
            ];
        }

        // ZIP Archive Restore
        if (!class_exists('ZipArchive')) {
            return ['success' => false, 'message' => 'ZipArchive PHP class is required for restoration.'];
        }

        $zip = new ZipArchive();
        if ($zip->open($file_path) !== true) {
            return ['success' => false, 'message' => 'Failed to open backup ZIP archive.'];
        }

        $extract_dir = $this->backup_dir . 'restore_temp_' . uniqid() . '/';
        wp_mkdir_p($extract_dir);

        if (!$zip->extractTo($extract_dir)) {
            $zip->close();
            $this->delete_directory($extract_dir);
            return ['success' => false, 'message' => 'Failed to extract backup files.'];
        }
        $zip->close();

        $actions_log = [];

        // 1. Restore Database if present in archive
        $db_sql = $extract_dir . 'database.sql';
        if (file_exists($db_sql)) {
            $db_res = $this->import_database_file($db_sql);
            if ($db_res['success']) {
                $actions_log[] = 'Database restored (' . ($db_res['queries'] ?? 0) . ' SQL queries)';
            } else {
                $actions_log[] = 'Database restore warning: ' . $db_res['message'];
            }
            @unlink($db_sql);
        }

        // 2. Remove manifest file from temp before copying files
        if (file_exists($extract_dir . 'mdefender-manifest.json')) {
            @unlink($extract_dir . 'mdefender-manifest.json');
        }

        // 3. Copy extracted files over to WordPress root
        $restored_files = $this->copy_directory($extract_dir, ABSPATH);
        $actions_log[] = $restored_files . ' files deployed to WordPress';

        // 4. Clean up temporary directory
        $this->delete_directory($extract_dir);

        // 5. Reset Opcache and Object Cache
        if (function_exists('wp_cache_flush')) {
            wp_cache_flush();
        }
        if (function_exists('opcache_reset')) {
            @opcache_reset();
        }

        $duration = round(microtime(true) - $start_time, 2);

        return [
            'success' => true,
            'message' => 'Site restored successfully in ' . $duration . 's! Actions: ' . implode('; ', $actions_log),
            'duration' => $duration . 's',
            'actions' => $actions_log,
        ];
    }

    /**
     * Stream and execute a SQL dump file into the WordPress database.
     */
    private function import_database_file($sql_file) {
        global $wpdb;
        $handle = @fopen($sql_file, 'r');
        if (!$handle) {
            return ['success' => false, 'message' => 'Cannot read SQL dump file.'];
        }

        $query = '';
        $queries_executed = 0;
        $wpdb->query("SET FOREIGN_KEY_CHECKS=0;");

        while (($line = fgets($handle)) !== false) {
            $trimmed = trim($line);
            if (empty($trimmed) || strpos($trimmed, '--') === 0 || strpos($trimmed, '/*') === 0) {
                continue;
            }

            $query .= $line;
            if (substr(rtrim($query), -1) === ';') {
                $wpdb->query($query);
                $query = '';
                $queries_executed++;
            }
        }

        fclose($handle);
        $wpdb->query("SET FOREIGN_KEY_CHECKS=1;");

        return ['success' => true, 'queries' => $queries_executed];
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

        return ['success' => true, 'message' => 'Backup deleted successfully.'];
    }

    /**
     * Enforce max backup retention limit to prevent server disk space overload.
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
     * Cron handler for scheduled automatic backups.
     */
    public function run_scheduled_backup() {
        $type = get_option('waf_fw_backup_sched_type', 'full');
        $this->create_backup($type, [], 'Automated Scheduled Backup');
    }

    /**
     * Save scheduled backup settings and adjust WP-Cron.
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
            'message' => 'Automated backup settings saved successfully.',
        ];
    }

    /**
     * Recursive folder copy utility.
     */
    private function copy_directory($src, $dst) {
        $count = 0;
        $dir = opendir($src);
        @mkdir($dst);

        while (false !== ($file = readdir($dir))) {
            if ($file != '.' && $file != '..') {
                if (is_dir($src . '/' . $file)) {
                    $count += $this->copy_directory($src . '/' . $file, $dst . '/' . $file);
                } else {
                    if (@copy($src . '/' . $file, $dst . '/' . $file)) {
                        $count++;
                    }
                }
            }
        }
        closedir($dir);
        return $count;
    }

    /**
     * Recursive folder delete utility.
     */
    private function delete_directory($dir) {
        if (!file_exists($dir)) return true;
        if (!is_dir($dir)) return unlink($dir);
        foreach (scandir($dir) as $item) {
            if ($item == '.' || $item == '..') continue;
            if (!$this->delete_directory($dir . DIRECTORY_SEPARATOR . $item)) return false;
        }
        return rmdir($dir);
    }
}
