<?php
defined('ABSPATH') || exit;

class WAF_FW_Scanner {
    private static $_instance = null;
    private $db;
    const CELL_SIZE = 50;

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function __construct() {
        $this->db = WAF_FW_DB::instance();
    }

    public static function run_scheduled_scan() {
        $scheduled = get_option('waf_fw_scheduled_scan_enabled', 'no');
        if ($scheduled !== 'yes') return;

        $scanner = self::instance();
        $queue_id = $scanner->create_scan_queue('full');
        if ($queue_id) {
            $scanner->initialize_scan_files_queue($queue_id);
            wp_schedule_single_event(time(), 'waf_fw_run_scan_batch', [$queue_id]);
            spawn_cron();
        }
    }

    public static function run_scan_batch_cron($queue_id) {
        $scanner = self::instance();
        $scanner->process_scan_batch($queue_id);
    }

    public static function run_file_integrity_check() {
        $scanner = self::instance();
        $scanner->update_file_integrity_hashes();
    }

    public function create_scan_queue($scan_type = 'full') {
        global $wpdb;
        $table = $this->db->get_scan_queue_table();
        $wpdb->insert($table, [
            'scan_type' => $scan_type,
            'status' => 'pending',
            'progress' => 0,
            'current_stage' => 'Initializing',
            'started_at' => current_time('mysql'),
        ]);
        return $wpdb->insert_id;
    }

    public function initialize_scan_files_queue($scan_id) {
        global $wpdb;
        $files_table = $this->db->get_scan_files_queue_table();
        
        // Clean up old entries for this scan
        $wpdb->query($wpdb->prepare("DELETE FROM $files_table WHERE scan_id = %d", $scan_id));
        
        $scan_dirs = [
            'plugins' => ABSPATH . 'wp-content/plugins/',
            'themes'  => ABSPATH . 'wp-content/themes/',
            'uploads' => ABSPATH . 'wp-content/uploads/',
            'mu_plugins' => ABSPATH . 'wp-content/mu-plugins/',
            'root'    => ABSPATH,
        ];
        
        $excluded_dirs = ['wp-waf-firewall1/', 'wordfence/'];
        $known_extensions = ['php', 'phtml', 'php4', 'php5', 'php7', 'php8', 'inc', 'htaccess', 'js', 'txt', 'html', 'htm', 'shtml', 'pl', 'py', 'sh', 'bash', 'cgi', 'asp', 'aspx', 'jsp', 'env', 'config', 'yml', 'yaml', 'xml', 'json', 'sql'];
        
        $bulk_inserts = [];
        $total_files = 0;
        
        foreach ($scan_dirs as $cat => $dir) {
            if (!is_dir($dir)) continue;
            
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::SELF_FIRST
            );
            
            foreach ($iterator as $file) {
                if (!$file->isFile()) continue;
                $fp = wp_normalize_path($file->getPathname());
                $rel_path = str_replace(wp_normalize_path(ABSPATH), '', $fp);
                $rel_path = ltrim(str_replace('\\', '/', $rel_path), '/');
                
                if ($cat === 'root') {
                    if (strpos($rel_path, 'wp-content/') === 0 || strpos($rel_path, 'wp-admin/') === 0 || strpos($rel_path, 'wp-includes/') === 0) {
                        continue;
                    }
                }
                
                $skip = false;
                foreach ($excluded_dirs as $ex) {
                    if (strpos($fp, 'wp-content/plugins/' . $ex) !== false) {
                        $skip = true;
                        break;
                    }
                }
                if ($skip) continue;
                
                $ext = strtolower(pathinfo($fp, PATHINFO_EXTENSION));
                if (!in_array($ext, $known_extensions) && basename($fp) !== '.htaccess') continue;
                if ($file->getSize() > 10000000) continue; // Skip files > 10MB
                
                $bulk_inserts[] = $wpdb->prepare("(%d, %s, 'pending', %s)", $scan_id, $rel_path, $cat);
                $total_files++;
                
                if (count($bulk_inserts) >= 300) {
                    $values = implode(',', $bulk_inserts);
                    $wpdb->query("INSERT INTO $files_table (scan_id, file_path, status, file_type) VALUES $values");
                    $bulk_inserts = [];
                }
            }
        }
        
        if (!empty($bulk_inserts)) {
            $values = implode(',', $bulk_inserts);
            $wpdb->query("INSERT INTO $files_table (scan_id, file_path, status, file_type) VALUES $values");
        }
        
        // Also scan and add wp-admin/ and wp-includes/ files to the queue under categories 'admin' and 'includes'
        $core_dirs = [
            'admin' => ABSPATH . 'wp-admin/',
            'includes' => ABSPATH . 'wp-includes/',
        ];
        $bulk_inserts = [];
        foreach ($core_dirs as $cat => $dir) {
            if (!is_dir($dir)) continue;
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::SELF_FIRST
            );
            foreach ($iterator as $file) {
                if (!$file->isFile()) continue;
                $fp = wp_normalize_path($file->getPathname());
                $rel_path = str_replace(wp_normalize_path(ABSPATH), '', $fp);
                $rel_path = ltrim(str_replace('\\', '/', $rel_path), '/');
                
                $ext = strtolower(pathinfo($fp, PATHINFO_EXTENSION));
                if (!in_array($ext, $known_extensions) && basename($fp) !== '.htaccess') continue;
                if ($file->getSize() > 10000000) continue;
                
                $bulk_inserts[] = $wpdb->prepare("(%d, %s, 'pending', %s)", $scan_id, $rel_path, $cat);
                $total_files++;
                
                if (count($bulk_inserts) >= 300) {
                    $values = implode(',', $bulk_inserts);
                    $wpdb->query("INSERT INTO $files_table (scan_id, file_path, status, file_type) VALUES $values");
                    $bulk_inserts = [];
                }
            }
        }
        if (!empty($bulk_inserts)) {
            $values = implode(',', $bulk_inserts);
            $wpdb->query("INSERT INTO $files_table (scan_id, file_path, status, file_type) VALUES $values");
        }
        
        $queue_table = $this->db->get_scan_queue_table();
        $wpdb->update($queue_table, ['total_files' => $total_files], ['id' => $scan_id]);
        return $total_files;
    }

    public function init_file_integrity_database() {
        $this->update_file_integrity_hashes();
    }

    public function update_file_integrity_hashes() {
        global $wpdb;
        $table = $this->db->get_file_integrity_table();
        $known_extensions = ['php', 'phtml', 'php4', 'php5', 'inc', 'js', 'htaccess'];

        $scan_dirs = [
            ABSPATH . 'wp-content/plugins/',
            ABSPATH . 'wp-content/themes/',
            ABSPATH . 'wp-content/uploads/',
            ABSPATH . 'wp-includes/',
            ABSPATH . 'wp-admin/',
            ABSPATH,
        ];

        $count = 0;
        $max_per_run = 200;

        foreach ($scan_dirs as $dir) {
            if (!is_dir($dir)) continue;
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::SELF_FIRST
            );
            foreach ($iterator as $file) {
                if (!$file->isFile()) continue;
                if ($count >= $max_per_run) break 2;
                $ext = strtolower($file->getExtension());
                if (!in_array($ext, $known_extensions) && $file->getFilename() !== '.htaccess') continue;
                if ($file->getSize() > 5000000) continue;

                $path = str_replace(ABSPATH, '', $file->getPathname());
                $hash = hash_file('sha256', $file->getPathname());

                $existing = $wpdb->get_var($wpdb->prepare(
                    "SELECT id FROM $table WHERE file_path = %s",
                    $path
                ));

                if ($existing) {
                    $wpdb->update($table, [
                        'file_hash' => $hash,
                        'file_size' => $file->getSize(),
                        'modified_at' => current_time('mysql'),
                    ], ['id' => $existing]);
                } else {
                    $wpdb->insert($table, [
                        'file_path' => $path,
                        'file_hash' => $hash,
                        'file_size' => $file->getSize(),
                        'first_seen' => current_time('mysql'),
                        'modified_at' => current_time('mysql'),
                        'status' => 'known',
                    ]);
                }
                $count++;
            }
        }
    }

    public function check_file_changes() {
        global $wpdb;
        $table = $this->db->get_file_integrity_table();
        $changes_table = $this->db->get_file_changes_table();
        $known_extensions = ['php', 'phtml', 'php4', 'php5', 'inc', 'js', 'htaccess'];
        $changes = [];
        $max_check = 100;

        $scan_dirs = [
            ABSPATH . 'wp-content/plugins/',
            ABSPATH . 'wp-content/themes/',
            ABSPATH . 'wp-includes/',
            ABSPATH . 'wp-admin/',
            ABSPATH,
        ];

        $checked = 0;
        foreach ($scan_dirs as $dir) {
            if (!is_dir($dir)) continue;
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::SELF_FIRST
            );
            foreach ($iterator as $file) {
                if (!$file->isFile()) continue;
                if ($checked >= $max_check) break 2;
                $ext = strtolower($file->getExtension());
                if (!in_array($ext, $known_extensions) && $file->getFilename() !== '.htaccess') continue;
                if ($file->getSize() > 5000000) continue;
                $checked++;

                $path = str_replace(ABSPATH, '', $file->getPathname());
                $current_hash = hash_file('sha256', $file->getPathname());

                $stored = $wpdb->get_row($wpdb->prepare(
                    "SELECT * FROM $table WHERE file_path = %s",
                    $path
                ));

                if (!$stored) {
                    $wpdb->insert($table, [
                        'file_path' => $path,
                        'file_hash' => $current_hash,
                        'file_size' => $file->getSize(),
                        'first_seen' => current_time('mysql'),
                        'modified_at' => current_time('mysql'),
                        'status' => 'new',
                    ]);
                    $changes[] = [
                        'file' => $path,
                        'type' => 'new',
                        'old_hash' => '',
                        'new_hash' => $current_hash,
                    ];
                } elseif ($stored->file_hash !== $current_hash) {
                    $wpdb->update($table, [
                        'file_hash' => $current_hash,
                        'file_size' => $file->getSize(),
                        'modified_at' => current_time('mysql'),
                        'status' => 'modified',
                    ], ['id' => $stored->id]);

                    $wpdb->insert($changes_table, [
                        'file_path' => $path,
                        'old_hash' => $stored->file_hash,
                        'new_hash' => $current_hash,
                        'change_type' => 'modified',
                        'file_size' => $file->getSize(),
                        'detected_at' => current_time('mysql'),
                        'status' => 'new',
                    ]);

                    $changes[] = [
                        'file' => $path,
                        'type' => 'modified',
                        'old_hash' => $stored->file_hash,
                        'new_hash' => $current_hash,
                    ];
                }
            }
        }

        return $changes;
    }

    public function get_scan_status($queue_id) {
        global $wpdb;
        $table = $this->db->get_scan_queue_table();
        $scan = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table WHERE id = %d", $queue_id
        ));
        if (!$scan) return null;

        return [
            'queue_id' => $scan->id,
            'status' => $scan->status,
            'progress' => (int) $scan->progress,
            'current_stage' => $scan->current_stage,
            'started_at' => $scan->started_at,
            'completed_at' => $scan->completed_at,
            'total_files' => (int) $scan->total_files,
            'scanned_files' => (int) $scan->scanned_files,
            'results' => $scan->results ? json_decode($scan->results, true) : null,
        ];
    }

    private static $scan_metrics = [];

    public function get_modules_for_scan_type($scan_type) {
        $all = [
            'basic', 'headers', 'ssl', 'ssl_deep', 'wp_core', 'waf_test',
            'directories', 'xmlrpc', 'cors', 'cookies', 'file_upload',
            'php_info', 'vulnerabilities', 'file_changes', 'malware',
            'ml_malware', 'db_scan', 'port_scan', 'ml_scan', 'password_audit',
            'blocklist', 'full_path_disclosure', 'db_integrity',
            'dns_check', 'rss_spam', 'deprecated_php', 'file_permissions',
            'server_fingerprint', 'config_exposure', 'known_files',
        ];

        $map = [
            'quick'      => ['basic', 'headers', 'wp_core', 'waf_test', 'known_files'],
            'full'       => $all,
            'malware'    => ['malware', 'ml_malware', 'file_changes', 'db_scan', 'deprecated_php', 'known_files'],
            'integrity'  => ['file_changes', 'known_files'],
            'api'        => ['basic', 'headers', 'wp_core', 'xmlrpc', 'cors'],
            'port'       => ['port_scan', 'server_fingerprint'],
            'owasp'      => ['waf_test', 'db_scan', 'ml_scan'],
            'database'   => ['db_scan', 'db_integrity'],
            'plugins'    => ['wp_core', 'vulnerabilities', 'known_files'],
            'config'     => ['basic', 'headers', 'wp_core', 'config_exposure'],
            'sensitive'  => ['basic', 'directories', 'config_exposure'],
            'users'      => ['basic', 'wp_core', 'password_audit'],
            'cron'       => ['basic', 'wp_core', 'config_exposure'],
            'ssl'        => ['ssl', 'ssl_deep', 'headers'],
            'backup'     => ['basic', 'config_exposure', 'directories'],
            'custom'     => $all,
            'password'   => ['password_audit', 'wp_core'],
            'blocklist'  => ['blocklist', 'rss_spam'],
            'dns'        => ['dns_check', 'ssl_deep'],
        ];

        $modules = $map[$scan_type] ?? $all;
        return array_merge(['init'], $modules, ['complete']);
    }

    public function process_scan_cell($queue_id, $cell_index = 0) {
        global $wpdb;
        $files_table = $this->db->get_scan_files_queue_table();
        $files_count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $files_table WHERE scan_id = %d",
            $queue_id
        ));
        if ($files_count == 0) {
            $this->initialize_scan_files_queue($queue_id);
        }

        // Trigger background cron batch processing
        if (!wp_next_scheduled('waf_fw_run_scan_batch', [$queue_id])) {
            wp_schedule_single_event(time(), 'waf_fw_run_scan_batch', [$queue_id]);
            spawn_cron();
        }

        // Return current status immediately to prevent blocking the request
        $queue_table = $this->db->get_scan_queue_table();
        $scan = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $queue_table WHERE id = %d", $queue_id
        ));
        if (!$scan) {
            return ['success' => false, 'message' => 'Scan not found'];
        }

        return [
            'success' => true,
            'completed' => $scan->status === 'completed' || $scan->status === 'completed_with_issues',
            'queue_id' => $queue_id,
            'cell_index' => 0,
            'progress' => (int) $scan->progress,
            'current_stage' => $scan->current_stage,
            'total_files' => (int) $scan->total_files,
            'scanned_files' => (int) $scan->scanned_files,
            'results' => $scan->results ? json_decode($scan->results, true) : null,
        ];
    }

    public function process_scan_batch($queue_id) {
        global $wpdb;
        $queue_table = $this->db->get_scan_queue_table();
        $files_table = $this->db->get_scan_files_queue_table();

        // 1. Acquire Lock to prevent overlapping processes
        $lock_key = 'waf_fw_scan_lock_' . $queue_id;
        $existing_lock = get_option($lock_key);
        if ($existing_lock) {
            $lock_data = json_decode($existing_lock, true);
            if (is_array($lock_data) && ($lock_data['expires'] > time())) {
                return; // already locked by an active worker
            }
        }
        update_option($lock_key, json_encode([
            'scan_id' => $queue_id,
            'locked_at' => time(),
            'expires' => time() + 300
        ]));

        $scan = $wpdb->get_row($wpdb->prepare("SELECT * FROM $queue_table WHERE id = %d", $queue_id));
        if (!$scan || in_array($scan->status, ['completed', 'completed_with_issues', 'failed', 'cancelled', 'paused'])) {
            delete_option($lock_key);
            return;
        }

        $stages = $this->get_modules_for_scan_type($scan->scan_type);
        $total_stages = count($stages);
        $stage_index = array_search($scan->current_stage ?: 'init', $stages);
        if ($stage_index === false) $stage_index = 0;

        $max_time = 12; // Maximum run time per invocation
        $start_time = microtime(true);
        $target_url = home_url();

        $results = $scan->results ? json_decode($scan->results, true) : [];
        $stage_completed = false;

        while ((microtime(true) - $start_time) < $max_time && $stage_index < $total_stages) {
            $stage = $stages[$stage_index];

            $wpdb->update($queue_table, [
                'current_stage' => $stage,
                'progress' => (int) (($stage_index / ($total_stages - 1)) * 100),
                'status' => 'running',
            ], ['id' => $queue_id]);

            switch ($stage) {
                case 'init':
                    $stage_completed = true;
                    break;
                case 'basic':
                    $results['basic_checks'] = $this->run_basic_security_checks($target_url);
                    $stage_completed = true;
                    break;
                case 'headers':
                    $results['headers_check'] = $this->check_security_headers($target_url);
                    $stage_completed = true;
                    break;
                case 'ssl':
                    $results['ssl_check'] = $this->check_ssl($target_url);
                    $stage_completed = true;
                    break;
                case 'wp_core':
                    $results['wordpress_checks'] = $this->check_wordpress_security();
                    $stage_completed = true;
                    break;
                case 'waf_test':
                    $results['waf_test'] = $this->test_waf_protection();
                    $stage_completed = true;
                    break;
                case 'directories':
                    $results['directory_listing'] = $this->check_directory_listing($target_url);
                    $stage_completed = true;
                    break;
                case 'xmlrpc':
                    $results['xmlrpc_check'] = $this->check_xmlrpc($target_url);
                    $stage_completed = true;
                    break;
                case 'cors':
                    $results['cors_check'] = $this->check_cors($target_url);
                    $stage_completed = true;
                    break;
                case 'cookies':
                    $results['cookie_security'] = $this->check_cookie_security($target_url);
                    $stage_completed = true;
                    break;
                case 'file_upload':
                    $results['file_upload_check'] = $this->check_file_upload_security();
                    $stage_completed = true;
                    break;
                case 'php_info':
                    $results['php_info_exposure'] = $this->check_php_info_exposure($target_url);
                    $stage_completed = true;
                    break;
                case 'vulnerabilities':
                    $results['vulnerability_scan'] = $this->run_vulnerability_scan();
                    $stage_completed = true;
                    break;
                case 'file_changes':
                    $results['file_changes'] = $this->check_file_changes();
                    $stage_completed = true;
                    break;
                case 'malware':
                    // Fetch next pending files batch
                    $pending_files = $wpdb->get_results($wpdb->prepare(
                        "SELECT id, file_path, file_type FROM $files_table WHERE scan_id = %d AND status = 'pending' LIMIT 200",
                        $queue_id
                    ));
                    if (empty($pending_files)) {
                        $stage_completed = true;
                        break;
                    }

                    if (!isset($results['malware_scan'])) {
                        $results['malware_scan'] = [
                            'suspicious_files' => [],
                            'infected_core_files' => [],
                            'secrets_found' => [],
                            'scanned_categories' => [],
                            'total_scanned' => 0,
                            'suspicious_found' => 0,
                            'infected_core' => 0,
                            'total_issues' => 0,
                            'heuristic_scores' => [],
                        ];
                    }

                    foreach ($pending_files as $f_row) {
                        $full_path = ABSPATH . $f_row->file_path;
                        if (!file_exists($full_path)) {
                            $wpdb->update($files_table, ['status' => 'completed'], ['id' => $f_row->id]);
                            continue;
                        }

                        $result = $this->scan_file_multi_signal($full_path, $f_row->file_type);
                        $results['malware_scan']['total_scanned']++;
                        
                        if ($result !== null) {
                            $results['malware_scan']['heuristic_scores'][] = $result['score'];
                            
                            if ($result['classification'] === 'CONFIRMED_MALWARE' || $result['classification'] === 'HIGH_RISK') {
                                $results['malware_scan']['suspicious_files'][] = $result;
                                $results['malware_scan']['suspicious_found']++;
                                $results['malware_scan']['total_issues']++;
                                if (!in_array($f_row->file_type, $results['malware_scan']['scanned_categories'])) {
                                    $results['malware_scan']['scanned_categories'][] = $f_row->file_type;
                                }
                            } elseif ($result['classification'] === 'MODIFIED' && ($f_row->file_type === 'admin' || $f_row->file_type === 'includes')) {
                                $results['malware_scan']['infected_core_files'][] = $result;
                                $results['malware_scan']['infected_core']++;
                                $results['malware_scan']['total_issues']++;
                            } elseif ($result['classification'] === 'SUSPICIOUS') {
                                if (strpos($result['findings'][0] ?? '', 'secret:') === 0) {
                                    $results['malware_scan']['secrets_found'][] = $result;
                                } else {
                                    $results['malware_scan']['suspicious_files'][] = $result;
                                    $results['malware_scan']['suspicious_found']++;
                                }
                                $results['malware_scan']['total_issues']++;
                            }
                        }

                        $wpdb->update($files_table, ['status' => 'completed'], ['id' => $f_row->id]);
                    }

                    $scanned_count = $wpdb->get_var($wpdb->prepare(
                        "SELECT COUNT(*) FROM $files_table WHERE scan_id = %d AND status = 'completed'",
                        $queue_id
                    ));
                    $wpdb->update($queue_table, [
                        'results' => json_encode($results),
                        'scanned_files' => (int) $scanned_count,
                    ], ['id' => $queue_id]);

                    $remains = $wpdb->get_var($wpdb->prepare(
                        "SELECT COUNT(*) FROM $files_table WHERE scan_id = %d AND status = 'pending'",
                        $queue_id
                    ));
                    if ($remains > 0) {
                        delete_option($lock_key);
                        wp_schedule_single_event(time(), 'waf_fw_run_scan_batch', [$queue_id]);
                        spawn_cron();
                        return;
                    }

                    $stage_completed = true;
                    break;

                case 'db_scan':
                    $results['db_scan'] = $this->scan_database_for_malware();
                    $stage_completed = true;
                    break;

                case 'ml_malware':
                    $ml_client = WAF_FW_ML_Api_Client::instance();
                    if (!$ml_client->is_available()) {
                        $results['ml_malware_scan'] = [
                            'status' => 'unavailable',
                            'message' => 'MDefender-Pro ML API not configured.'
                        ];
                        $stage_completed = true;
                        break;
                    }

                    $has_ml_init = $wpdb->get_var($wpdb->prepare(
                        "SELECT COUNT(*) FROM $files_table WHERE scan_id = %d AND status = 'pending_ml'",
                        $queue_id
                    ));
                    $has_ml_skipped = $wpdb->get_var($wpdb->prepare(
                        "SELECT COUNT(*) FROM $files_table WHERE scan_id = %d AND status = 'skipped_ml'",
                        $queue_id
                    ));

                    if ($has_ml_init == 0 && $has_ml_skipped == 0) {
                        $wp_checksums = $this->scan_for_wordpress_checksums();
                        $modified_core = [];
                        if (!empty($wp_checksums['modified_files'])) {
                            foreach ($wp_checksums['modified_files'] as $mc) {
                                $modified_core[] = $mc['file'];
                            }
                        }

                        $integrity_table = WAF_FW_DB::instance()->get_file_integrity_table();
                        $non_known = $wpdb->get_col("SELECT file_path FROM $integrity_table WHERE status != 'known'");
                        $non_known_set = array_flip($non_known ? $non_known : []);

                        $all_queued = $wpdb->get_results($wpdb->prepare(
                            "SELECT id, file_path, file_type FROM $files_table WHERE scan_id = %d",
                            $queue_id
                        ));

                        foreach ($all_queued as $f_row) {
                            $is_candidate = false;
                            $rel_path = $f_row->file_path;
                            $cat = $f_row->file_type;

                            if ($cat === 'uploads') {
                                $is_candidate = true;
                            } elseif ($cat === 'admin' || $cat === 'includes' || $cat === 'root') {
                                if (in_array($rel_path, $modified_core)) {
                                    $is_candidate = true;
                                }
                            } else {
                                if (isset($non_known_set[$rel_path])) {
                                    $is_candidate = true;
                                } else {
                                    $full_path = ABSPATH . $rel_path;
                                    if (file_exists($full_path)) {
                                        $local = $this->scan_file_multi_signal($full_path, $cat);
                                        if ($local && $local['score'] >= 25) {
                                            $is_candidate = true;
                                        }
                                    }
                                }
                            }

                            $new_status = $is_candidate ? 'pending_ml' : 'skipped_ml';
                            $wpdb->update($files_table, ['status' => $new_status], ['id' => $f_row->id]);
                        }
                    }

                    $ml_batch = $wpdb->get_results($wpdb->prepare(
                        "SELECT id, file_path, file_type FROM $files_table WHERE scan_id = %d AND status = 'pending_ml' LIMIT 50",
                        $queue_id
                    ));

                    if (empty($ml_batch)) {
                        $stage_completed = true;
                        break;
                    }

                    if (!isset($results['ml_malware_scan'])) {
                        $results['ml_malware_scan'] = [
                            'status' => 'connected',
                            'backend_online' => true,
                            'model' => 'mdefender-malware',
                            'model_loaded' => true,
                            'total_scanned' => 0,
                            'malicious_count' => 0,
                            'suspicious_count' => 0,
                            'clean_count' => 0,
                            'error_count' => 0,
                            'total_issues' => 0,
                            'malicious_files' => [],
                            'suspicious_files' => [],
                            'clean_files' => [],
                            'scanned_categories' => [],
                        ];
                    }

                    foreach ($ml_batch as $f_row) {
                        $full_path = ABSPATH . $f_row->file_path;
                        if (!file_exists($full_path)) {
                            $wpdb->update($files_table, ['status' => 'completed_ml'], ['id' => $f_row->id]);
                            continue;
                        }

                        $content = @file_get_contents($full_path);
                        if ($content === false || $content === '') {
                            $results['ml_malware_scan']['error_count']++;
                            $wpdb->update($files_table, ['status' => 'completed_ml'], ['id' => $f_row->id]);
                            continue;
                        }

                        $ml_client->refresh_config();
                        $prediction = $ml_client->scan_file(basename($f_row->file_path), $content);
                        unset($content);
                        $results['ml_malware_scan']['total_scanned']++;

                        if ($prediction && is_array($prediction)) {
                            $label = isset($prediction['verdict']) ? $prediction['verdict'] : 'clean';
                            $conf = (float) ($prediction['confidence'] ?? 0);
                            $risk = (float) ($prediction['risk_score'] ?? 0);
                            $family = isset($prediction['family']) && $prediction['family'] !== null ? $prediction['family'] : '';
                            $reasons = isset($prediction['reasons']) && is_array($prediction['reasons']) ? $prediction['reasons'] : [];

                            $reason_text = 'AI Detection: ' . $label . ' (confidence ' . number_format($conf, 2) . ')';
                            if (!empty($family)) {
                                $reason_text .= ' [' . $family . ']';
                            }
                            if ($label === 'malicious' || $label === 'suspicious') {
                                foreach ($reasons as $r) {
                                    if (is_string($r) && $r !== '') {
                                        $reason_text .= ' | ' . $r;
                                    }
                                }
                            }

                            $finding = [
                                'file' => $f_row->file_path,
                                'score' => $risk > 0 ? (int) round($risk) : (int) round($conf * 100),
                                'severity' => $label === 'malicious' ? 'critical' : ($label === 'suspicious' ? 'warning' : 'clean'),
                                'findings' => [$reason_text],
                                'size' => filesize($full_path)
                            ];

                            if ($label === 'malicious') {
                                $results['ml_malware_scan']['malicious_files'][] = $finding;
                                $results['ml_malware_scan']['malicious_count']++;
                                $results['ml_malware_scan']['total_issues']++;
                            } elseif ($label === 'suspicious') {
                                $results['ml_malware_scan']['suspicious_files'][] = $finding;
                                $results['ml_malware_scan']['suspicious_count']++;
                                $results['ml_malware_scan']['total_issues']++;
                            } else {
                                $results['ml_malware_scan']['clean_files'][] = $f_row->file_path;
                                $results['ml_malware_scan']['clean_count']++;
                            }
                        } else {
                            $results['ml_malware_scan']['error_count']++;
                        }

                        $wpdb->update($files_table, ['status' => 'completed_ml'], ['id' => $f_row->id]);
                    }

                    $wpdb->update($queue_table, ['results' => json_encode($results)], ['id' => $queue_id]);

                    $remains_ml = $wpdb->get_var($wpdb->prepare(
                        "SELECT COUNT(*) FROM $files_table WHERE scan_id = %d AND status = 'pending_ml'",
                        $queue_id
                    ));
                    if ($remains_ml > 0) {
                        delete_option($lock_key);
                        wp_schedule_single_event(time(), 'waf_fw_run_scan_batch', [$queue_id]);
                        spawn_cron();
                        return;
                    }

                    $stage_completed = true;
                    break;

                case 'port_scan':
                    $results['port_scan'] = $this->quick_port_check($target_url);
                    $stage_completed = true;
                    break;
                case 'ml_scan':
                    $results['ml_analysis'] = $this->run_ml_scan($target_url);
                    $stage_completed = true;
                    break;
                case 'ssl_deep':
                    $results['ssl_deep_analysis'] = $this->run_ssl_deep_analysis($target_url);
                    $stage_completed = true;
                    break;
                case 'password_audit':
                    $results['password_audit'] = $this->run_password_audit();
                    $stage_completed = true;
                    break;
                case 'blocklist':
                    $results['blocklist_check'] = $this->run_blocklist_check($target_url);
                    $stage_completed = true;
                    break;
                case 'full_path_disclosure':
                    $results['fpd_check'] = $this->run_full_path_disclosure_check($target_url);
                    $stage_completed = true;
                    break;
                case 'db_integrity':
                    $results['db_integrity'] = $this->run_db_integrity_check();
                    $stage_completed = true;
                    break;
                case 'dns_check':
                    $results['dns_security'] = $this->run_dns_security_check($target_url);
                    $stage_completed = true;
                    break;
                case 'rss_spam':
                    $results['rss_spam_check'] = $this->run_rss_spam_check($target_url);
                    $stage_completed = true;
                    break;
                case 'deprecated_php':
                    $results['deprecated_php'] = $this->run_deprecated_php_check();
                    $stage_completed = true;
                    break;
                case 'file_permissions':
                    $results['file_permissions'] = $this->run_file_permission_audit();
                    $stage_completed = true;
                    break;
                case 'server_fingerprint':
                    $results['server_fingerprint'] = $this->run_server_fingerprint($target_url);
                    $stage_completed = true;
                    break;
                case 'config_exposure':
                    $results['config_exposure'] = $this->run_config_exposure_check($target_url);
                    $stage_completed = true;
                    break;
                case 'known_files':
                    $results['known_files_check'] = $this->run_known_files_check();
                    $stage_completed = true;
                    break;

                case 'complete':
                    $issues_found = $this->count_issues($results);
                    $score = $this->calculate_score($results);
                    $duration = (int) (microtime(true) - strtotime($scan->started_at));
                    $security_status = $this->determine_security_status($score, $issues_found, $results);

                    $summary = [
                        'score' => $score,
                        'issues_found' => $issues_found,
                        'checks_performed' => count($results, COUNT_RECURSIVE) - count($results),
                        'scan_type' => $scan->scan_type,
                        'target_url' => $target_url,
                        'security_status' => $security_status,
                    ];

                    $this->save_scan_result($scan->scan_type, $target_url, $results, $summary, $score, $issues_found, $duration);

                    $wpdb->update($queue_table, [
                        'status' => 'completed',
                        'progress' => 100,
                        'current_stage' => 'Scan complete',
                        'completed_at' => current_time('mysql'),
                        'results' => json_encode($results),
                    ], ['id' => $queue_id]);

                    $wpdb->query($wpdb->prepare("DELETE FROM $files_table WHERE scan_id = %d", $queue_id));
                    delete_option($lock_key);
                    return;
            }

            if ($stage_completed) {
                $stage_index++;
                $next_stage = $stages[$stage_index] ?? 'complete';
                $wpdb->update($queue_table, [
                    'current_stage' => $next_stage,
                    'progress' => (int) (($stage_index / ($total_stages - 1)) * 100),
                    'results' => json_encode($results),
                ], ['id' => $queue_id]);
                $stage_completed = false;
            }
        }

        // Reschedule next execution block
        delete_option($lock_key);
        wp_schedule_single_event(time(), 'waf_fw_run_scan_batch', [$queue_id]);
        spawn_cron();
    }

    private function get_malware_patterns() {
        return [
            'backdoor' => [
                'weight' => 30,
                'patterns' => [
                    '/\beval\s*\(\s*\$_/i',
                    '/\bsystem\s*\(\s*\$_/i',
                    '/\bexec\s*\(\s*\$_/i',
                    '/\bshell_exec\s*\(\s*\$_/i',
                    '/\bpassthru\s*\(\s*\$_/i',
                    '/\bassert\s*\(\s*\$_/i',
                    '/call_user_func\s*\(\s*\$_/i',
                    '/array_map\s*\(\s*\'(?:exec|system|shell_exec|passthru|eval|assert)\'/i',
                    '/preg_replace\s*\(\s*[\'"]\/[^\/]*e[\'"]\s*,/i',
                    '/\/\*.*GLOBALS.*\*\//i',
                    '/\$GLOBALS\[[\'"]\w+[\'"]\]\s*=\s*\$_/i',
                    '/\$_[\(\[]/i',
                ],
            ],
            'execution' => [
                'weight' => 20,
                'patterns' => [
                    '/\bcreate_function\s*\(/i',
                    '/\bpopen\s*\(/i',
                    '/\bproc_open\s*\(/i',
                    '/\bpcntl_exec\s*\(/i',
                    '/\bexec\s*\(\s*[\'"]/i',
                    '/\bsystem\s*\(\s*[\'"]/i',
                    '/\bshell_exec\s*\(/i',
                    '/\bpassthru\s*\(\s*[\'"]/i',
                    '/`[^`]{20,}`/',
                    '/\$(?:\(|{)\(.*\)\s*;/',
                    '/\beval\s*\(\s*\$[a-z]/i',
                    '/\bassert\s*\(\s*\$[a-z]/i',
                ],
            ],
            'filesystem' => [
                'weight' => 15,
                'patterns' => [
                    '/file_put_contents\s*\(\s*\$_/i',
                    '/fwrite\s*\(\s*\$_/i',
                    '/fputs\s*\(\s*\$_/i',
                    '/move_uploaded_file\s*\(/i',
                    '/chmod\s*\(\s*\$_[^)]+\),\s*0/i',
                    '/file_get_contents\s*\(\s*\$_(GET|POST|REQUEST)/i',
                    '/unlink\s*\(\s*\$_(GET|POST|REQUEST)/i',
                    '/rename\s*\(\s*\$_(GET|POST|REQUEST)/i',
                    '/copy\s*\(\s*\$_(GET|POST|REQUEST)/i',
                    '/fopen\s*\(\s*\$_(GET|POST|REQUEST)/i',
                ],
            ],
            'network' => [
                'weight' => 15,
                'patterns' => [
                    '/fsockopen\s*\(\s*\$_(GET|POST|REQUEST)/i',
                    '/curl_exec\s*\(\s*\$[a-z]/i',
                    '/curl_setopt\s*\(.*CURLOPT_RETURNTRANSFER/i',
                    '/wp_remote_(get|post|request)\s*\(\s*\$_[^)]/i',
                    '/stream_socket_client\s*\(\s*\$_[^)]/i',
                    '/socket_create\s*\(/i',
                    '/dns_get_record\s*\(/i',
                ],
            ],
            'obfuscation' => [
                'weight' => 10,
                'patterns' => [
                    '/base64_decode\s*\(\s*[\'\"][A-Za-z0-9+\/=]{50,}[\'\"]\s*\)/i',
                    '/gzinflate\s*\(\s*base64_decode/i',
                    '/str_rot13\s*\(\s*[\'\"][^\'\"]{20,}[\'\"]\s*\)/i',
                    '/\\\x[0-9a-f]{2}(?:\\\x[0-9a-f]{2}){4,}/i',
                    '/chr\s*\(\s*\d+\s*\)\s*\.\s*chr\s*\(/i',
                    '/\$\w+\s*=\s*[\'\"][\^][^\'\"]+[\'\"]\s*;/',
                    '/pack\s*\(\s*[\'\"]H\*[\'\"]\s*,\s*[\'\"][A-F0-9]{20,}[\'\"]\s*\)/i',
                    '/hex2bin\s*\(\s*[\'\"][A-F0-9]{20,}[\'\"]\s*\)/i',
                    '/convert_uudecode\s*\(/i',
                    '/str_replace\s*\(\s*array\s*\([^)]+\)\s*,\s*array\s*\([^)]+\)\s*,\s*\$[a-z]/i',
                ],
            ],
            'evasion' => [
                'weight' => 15,
                'patterns' => [
                    '/ini_set\s*\(\s*[\'\"](display_errors|memory_limit|max_execution_time)[\'\"]/i',
                    '/error_reporting\s*\(\s*0\s*\)/i',
                    '/@\s*(eval|system|exec|shell_exec|passthru|assert)/i',
                    '/header\s*\(\s*[\'\"]Content-Type/i',
                    '/set_time_limit\s*\(\s*0\s*\)/i',
                    '/ignore_user_abort\s*\(\s*true\s*\)/i',
                    '/ob_start\s*\(\s*[\'\"][\w]+[\'\"]/i',
                    '/preg_replace\s*\(\s*array\s*\(/i',
                    '/array_map\s*\(\s*[\'\"]\w+[\'\"]\s*,\s*\$_(GET|POST|REQUEST)/i',
                ],
            ],
            'crypto' => [
                'weight' => 20,
                'patterns' => [
                    '/network\s*\(\s*[\'\"]pool/i',
                    '/stratum\s*:\/\//i',
                    '/mine\.\w+\.\w+/i',
                    '/Monero|xmr\b/i',
                    '/cryptonight/i',
                    '/hashimoto/i',
                    '/ethash/i',
                    '/scrypt\s*\(/i',
                    '/wallet\s*=\s*[\'\"][13][a-km-zA-HJ-NP-Z0-9]{26,33}[\'\"]/i',
                ],
            ],
        ];
    }

    private function get_secret_patterns() {
        return [
            '/-----BEGIN\s+(RSA|DSA|EC|OPENSSH|PGP)\s+PRIVATE\s+KEY-----/',
            '/SK-[a-zA-Z0-9]{8,40}/',
            '/AKIA[0-9A-Z]{16}/',
            '/AIza[0-9A-Za-z\-_]{35}/',
            '/EAAC[a-zA-Z0-9]{60,}/',
            '/ghp_[a-zA-Z0-9]{36}/',
            '/gho_[a-zA-Z0-9]{36}/',
            '/github_token\s*[=:]\s*[\'\"][a-zA-Z0-9]{40}[\'\"]/i',
            '/xox[baprs]-[0-9a-zA-Z\-]{10,}/',
            '/sk_live_[0-9a-zA-Z]{10,}/',
            '/pk_live_[0-9a-zA-Z]{10,}/',
            '/SG\.[a-zA-Z0-9\-_]{20,}\.[a-zA-Z0-9\-_]{20,}/',
            '/access_token\s*[=:]\s*[\'\"][a-zA-Z0-9]{50,}[\'\"]/i',
            '/api[_-]?key\s*[=:]\s*[\'\"][a-zA-Z0-9]{16,64}[\'\"]/i',
            '/password\s*[=:]\s*[\'\"][^\'\"]{6,}[\'\"]/i',
            '/DB_PASSWORD|DB_HOST|DB_USER.*[\'\"][^\'\"]+[\'\"]/i',
            '/mysql:\/\/[^:\s]+:[^@\s]+@/i',
            '/postgres:\/\/[^:\s]+:[^@\s]+@/i',
            '/redis:\/\/:[^@\s]+@/i',
            '/mongodb:\/\/[^:\s]+:[^@\s]+@/i',
            '/JWT_SECRET|jwt_secret|jwt-key/i',
            '/-----BEGIN CERTIFICATE-----/',
        ];
    }

    private function scan_file_heuristic($path) {
        return $this->scan_file_multi_signal($path);
    }

    private $core_checksums = null;
    private $core_checksums_source = null;

    /**
     * Known-good SHA-256 checksum engine.
     *
     * Reference data for pristine WordPress core files. Resolution order:
     *   1. shipped default seed (known-good-default.txt, GPL core distro,
     *      provenance-tracked in-header)
     *   2. durable online-synced cache (known-good-cache-<version>.txt) written
     *      when api.wordpress.org is reachable
     *   3. (during a scan) live api.wordpress.org pull, persisted to the cache.
     */
    private static $known_good_default = null;

    /**
     * Load the bundled default known-good seed: map rel_path => md5 (and sha256).
     * Sets self::$known_good_default['md5'|'sha256'|'version'] or returns null.
     */
    private static function load_known_good_default() {
        if (self::$known_good_default !== null) {
            return self::$known_good_default;
        }
        $file = WAF_FW_PLUGIN_DIR . 'includes/data/known-good-default.txt';
        if (!is_readable($file)) {
            self::$known_good_default = [];
            return self::$known_good_default;
        }
        $md5 = [];
        $sha = [];
        $version = '';
        $handle = @fopen($file, 'r');
        if ($handle) {
            while (($line = fgets($handle)) !== false) {
                $line = trim($line);
                if ($line === '') continue;
                if ($line[0] === '#') {
                    if (preg_match('/DB \(version ([0-9a-zA-Z._-]+)\)/', $line, $m)) {
                        $version = $m[1];
                    }
                    continue;
                }
                $parts = explode("\t", $line);
                if (count($parts) < 2) continue;
                $rel = $parts[0];
                if (strlen($parts[1]) === 32) $md5[$rel] = $parts[1];
                if (isset($parts[2]) && strlen($parts[2]) === 64) $sha[$rel] = $parts[2];
            }
            fclose($handle);
        }
        self::$known_good_default = ['md5' => $md5, 'sha256' => $sha, 'version' => $version];
        return self::$known_good_default;
    }

    /**
     * Durable online-synced cache path for a given WP version.
     */
    private function known_good_cache_file($version) {
        $safe = preg_replace('/[^0-9A-Za-z._-]/', '', $version);
        return WAF_FW_PLUGIN_DIR . 'includes/data/known-good-cache-' . $safe . '.txt';
    }

    /**
     * Read the durable online-synced cache into an md5 map. Returns [] when absent.
     */
    private function load_known_good_cache($version) {
        $file = $this->known_good_cache_file($version);
        if (!is_readable($file)) return [];
        $md5 = [];
        $handle = @fopen($file, 'r');
        if ($handle) {
            while (($line = fgets($handle)) !== false) {
                $line = trim($line);
                if ($line === '' || $line[0] === '#') continue;
                $parts = explode("\t", $line);
                if (count($parts) < 2) continue;
                if (strlen($parts[1]) === 32) $md5[$parts[0]] = $parts[1];
            }
            fclose($handle);
        }
        return $md5;
    }

    /**
     * Persist an md5 checksum map from api.wordpress.org to the durable cache.
     */
    private function sync_known_good_cache($version, array $checksums) {
        if (empty($checksums)) return;
        $file = $this->known_good_cache_file($version);
        $dir = dirname($file);
        if (!is_writable($dir)) return;
        $header = "# MDefender-Pro known-good WP core checksums (version {$version})\n"
            . "# Source: https://api.wordpress.org/core/checksums/1.0/?version={$version}&locale=en_US (license-safe, GPL core)\n"
            . "# Format: rel_path\\tmd5\n"
            . "# Durable offline cache auto-synced by MDefender-Pro; safe to delete (re-synced on next scan).\n";
        $handle = @fopen($file, 'w');
        if (!$handle) return;
        @flock($handle, LOCK_EX);
        fwrite($handle, $header);
        foreach ($checksums as $rel => $md5) {
            if (is_string($md5) && strlen($md5) === 32) {
                fwrite($handle, $rel . "\t" . $md5 . "\n");
            }
        }
        @flock($handle, LOCK_UN);
        fclose($handle);
    }

    /**
     * Resolve the best known-good md5 map for the given WP version, preferring
     * the durable online cache, then the shipped default seed.
     */
    private function resolve_known_good($version) {
        $cache = $this->load_known_good_cache($version);
        if (!empty($cache)) {
            return ['md5' => $cache, 'source' => 'online-synced'];
        }
        $seed = self::load_known_good_default();
        if (!empty($seed['md5'])) {
            return ['md5' => $seed['md5'], 'source' => 'local-seed-' . $seed['version']];
        }
        return ['md5' => [], 'source' => 'none'];
    }

    private function get_core_checksums() {
        if ($this->core_checksums !== null) {
            return $this->core_checksums;
        }
        global $wp_version;
        $transient_key = 'mdefender_core_checksums_' . $wp_version;
        $cached = get_transient($transient_key);
        if ($cached !== false && is_array($cached)) {
            $this->core_checksums = $cached;
            $this->core_checksums_source = 'transient';
            return $cached;
        }

        $local = $this->resolve_known_good($wp_version);
        if (!empty($local['md5'])) {
            $this->core_checksums = $local['md5'];
            $this->core_checksums_source = $local['source'];
            return $this->core_checksums;
        }

        $response = wp_remote_get('https://api.wordpress.org/core/checksums/1.0/?version=' . $wp_version . '&locale=en_US', ['timeout' => 10]);
        if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
            $this->core_checksums = [];
            $this->core_checksums_source = 'unreachable';
            return [];
        }
        $body = json_decode(wp_remote_retrieve_body($response), true);
        $checksums = $body['checksums'] ?? [];
        if (!empty($checksums)) {
            set_transient($transient_key, $checksums, DAY_IN_SECONDS);
            $this->sync_known_good_cache($wp_version, $checksums);
            $this->core_checksums_source = 'online-synced';
        } else {
            $this->core_checksums_source = 'no_data';
        }
        $this->core_checksums = $checksums;
        return $checksums;
    }

    public function scan_file_multi_signal($path, $category = 'unknown') {
        if (!file_exists($path) || !is_readable($path)) return null;
        $size = filesize($path);
        if ($size > 10000000 || $size === 0) return null;

        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $scanable = ['php', 'phtml', 'php4', 'php5', 'php7', 'php8', 'inc', 'htaccess', 'js', 'txt', 'html', 'htm', 'shtml', 'pl', 'py', 'sh', 'bash', 'cgi', 'asp', 'aspx', 'jsp', 'env', 'config', 'yml', 'yaml', 'xml', 'json', 'sql'];
        if (!in_array($ext, $scanable)) return null;

        $content = @file_get_contents($path);
        if (!$content) return null;

        $name = basename($path);
        $rel_path = str_replace(wp_normalize_path(ABSPATH), '', wp_normalize_path($path));
        $rel_path = ltrim(str_replace('\\', '/', $rel_path), '/');

        // 1. File Classification
        $file_class = 'UNKNOWN';
        if (strpos($rel_path, 'wp-content/plugins/') === 0) {
            $file_class = 'PLUGIN';
        } elseif (strpos($rel_path, 'wp-content/themes/') === 0) {
            $file_class = 'THEME';
        } elseif (strpos($rel_path, 'wp-content/uploads/') === 0) {
            $file_class = 'UPLOAD';
        } elseif (strpos($rel_path, 'wp-admin/') === 0 || strpos($rel_path, 'wp-includes/') === 0 || in_array($name, ['index.php', 'wp-login.php', 'wp-config.php', 'wp-cron.php', 'wp-settings.php', 'wp-load.php'])) {
            $file_class = 'WORDPRESS_CORE';
        }

        $findings = [];
        $total_score = 0;
        $confidence = 'LOW';

        // 2. Wordpress Core Verification
        if ($file_class === 'WORDPRESS_CORE' && $name !== 'wp-config.php') {
            $core_hashes = $this->get_core_checksums();
            if (!empty($core_hashes) && isset($core_hashes[$rel_path])) {
                $expected_md5 = $core_hashes[$rel_path];
                $actual_md5 = hash_file('md5', $path);
                if ($expected_md5 !== $actual_md5) {
                    $total_score += 30;
                    $findings[] = 'Core Checksum Mismatch: modified core file detected';
                    $confidence = 'HIGH';
                } else {
                    return null; // clean core file
                }
            }
        }

        // 2b. Known-Bad Hash Match (definitive signal)
        $known_bad = self::lookup_known_bad_hash($path);
        if (!empty($known_bad)) {
            return [
                'file'     => $rel_path,
                'score'    => 100,
                'severity' => 'critical',
                'classification' => 'CONFIRMED_MALWARE',
                'findings' => ['Known-bad hash match: CONFIRMED_MALWARE (family: ' . $known_bad['family'] . ')'],
                'size'     => $size,
                'hash'     => $known_bad['hash'],
            ];
        }

        $is_php = in_array($ext, ['php', 'phtml', 'php4', 'php5', 'php7', 'php8', 'inc']);
        
        // Strip strings/comments for code analysis if PHP
        if ($is_php) {
            $stripped = preg_replace('/\'(?:[^\'\\\\]|\\\\.)*\'/s', '', $content);
            $stripped = preg_replace('/"(?:[^"\\\\]|\\\\.)*"/s', '', $stripped);
            $stripped = preg_replace('/\/\/.*$/m', '', $stripped);
            $stripped = preg_replace('#/\*.*?\*/#s', '', $stripped);
        } else {
            $stripped = $content;
        }

        // 3. Obfuscation & Entropy Analysis
        $entropy = $this->calculate_entropy($content);
        $line_count = substr_count($content, "\n") + 1;
        $long_line = false;
        foreach (explode("\n", $content) as $line) {
            if (strlen(trim($line)) > 3000) { $long_line = true; break; }
        }

        $is_minified_or_bundled = false;
        if ($ext === 'js' && ($long_line || $entropy > 6.5)) {
            if (strpos($rel_path, 'elementor/') !== false || strpos($rel_path, 'blocksy/') !== false || strpos($content, 'wp-bootstrap') !== false || strpos($content, 'jQuery') !== false || strpos($content, 'webpackJsonp') !== false || strpos($content, 'use strict') !== false) {
                $is_minified_or_bundled = true;
            }
        }

        if ($entropy > 6.5 && strlen($content) > 500) {
            $points = $is_minified_or_bundled ? 2 : 10;
            $total_score += $points;
            $findings[] = 'obfuscation: High entropy content (' . number_format($entropy, 2) . ')';
        }

        if ($long_line && $line_count < 15) {
            $points = $is_minified_or_bundled ? 1 : 8;
            $total_score += $points;
            $findings[] = 'obfuscation: Minified/encoded file format';
        }

        // 4. Filename checks
        $webshell_names = ['cmd.php', 'backdoor.php', 'webshell.php', 'wso.php', 'c99.php', 'c100.php', 'r57.php', 'b374k.php', 'shell.php', 'eval.php', 'upload.php', 'conn.php', 'config.php.bak', 'db.php.bak', 'adminer.php', 'phpmyadmin.php', 'tinyeditor.php', 'elfinder.php', 'webshells.php', 'safe.php', 'hack.php', 'shells.php', 'c99shell.php', 'r57shell.php', 'knull.php', 'bypass.php', 'wso2.php', 'wso3.php', 'up.php', 'upld.php', 'files.php', 'filemanager.php'];
        if (in_array($name, $webshell_names)) {
            if ($name === 'upload.php' && $file_class === 'WORDPRESS_CORE') {
                // legitimate core file
            } else {
                $total_score += 25;
                $findings[] = 'Suspicious filename: ' . $name . ' in unexpected directory';
            }
        }

        // 5. Signature Checks
        $patterns = $this->get_malware_patterns();
        foreach ($patterns as $category => $data) {
            if ($category !== 'crypto' && !$is_php) {
                continue;
            }

            $matches = $this->check_malware_patterns($stripped, $data['patterns']);
            if (!empty($matches)) {
                $weight = $data['weight'];
                
                if ($category === 'crypto') {
                    $has_pool = preg_match('/stratum|pool|mine\./i', $content);
                    $has_coin = preg_match('/Monero|xmr/i', $content);
                    if ($has_pool && $has_coin) {
                        $total_score += 60;
                        $findings[] = 'crypto: Miner signatures detected';
                        $confidence = 'HIGH';
                    } else {
                        $total_score += 5;
                        $findings[] = 'crypto: Reference to Monero/XMR or mining';
                    }
                } else {
                    $total_score += $weight * min(count($matches), 2);
                    foreach ($matches as $m) {
                        $findings[] = $category . ': ' . substr(trim($m), 0, 80);
                    }
                    if ($weight >= 30) {
                        $confidence = 'HIGH';
                    }
                }
            }
        }

        // 6. Secrets/Credentials Detection
        $secrets = $this->get_secret_patterns();
        $secret_matches = $this->check_malware_patterns($stripped, $secrets);
        if (!empty($secret_matches)) {
            foreach ($secret_matches as $m) {
                if (preg_match('/password\s*[=:]\s*[\'\"]([^\'\"]{6,})[\'\"]/i', $m, $sub_match)) {
                    $val = $sub_match[1];
                    if (in_array(strtolower($val), ['password', '123456', 'root', 'admin', 'pass', 'db_pass', 'db_password', 'secret', 'undefined', 'null'])) {
                        continue;
                    }
                    $total_score += 25;
                    $findings[] = 'Exposed Credentials: password pattern with value';
                } else {
                    $total_score += 40;
                    $findings[] = 'Exposed Secret: ' . substr(trim($m), 0, 60) . '...';
                    $confidence = 'HIGH';
                }
            }
        }

        if ($total_score > 0) {
            $classification = 'SAFE';
            $severity = 'info';

            if ($total_score >= 75 && $confidence === 'HIGH') {
                $classification = 'CONFIRMED_MALWARE';
                $severity = 'critical';
            } elseif ($total_score >= 50) {
                $classification = 'HIGH_RISK';
                $severity = 'critical';
            } elseif ($total_score >= 25) {
                $classification = 'SUSPICIOUS';
                $severity = 'warning';
            } elseif ($total_score > 10) {
                $classification = 'MODIFIED';
                $severity = 'info';
            }

            if ($is_minified_or_bundled && $total_score < 25) {
                return null;
            }

            return [
                'file' => $rel_path,
                'score' => min(100, $total_score),
                'severity' => $severity,
                'classification' => $classification,
                'findings' => array_slice(array_unique($findings), 0, 15),
                'size' => $size,
            ];
        }

        return null;
    }

    /**
     * Lazy-load the known-bad SHA-256 database (shipped as a plain-text data
     * file to keep the plugin small and avoid giant PHP source arrays) and
     * look up a file's hash. Returns ['hash'=>..,'family'=>..] or null.
     */
    private static $known_bad_hashes = null;
    public static function lookup_known_bad_hash($path) {
        if (!is_file($path) || !is_readable($path)) {
            return null;
        }
        if (self::$known_bad_hashes === null) {
            self::$known_bad_hashes = [];
            $data_file = WAF_FW_PLUGIN_DIR . 'includes/data/malware-hashes.txt';
            if (is_readable($data_file)) {
                $handle = @fopen($data_file, 'r');
                if ($handle) {
                    while (($line = fgets($handle)) !== false) {
                        $line = trim($line);
                        if ($line === '' || $line[0] === '#') {
                            continue;
                        }
                        $pos = strpos($line, "\t");
                        $hash = $pos === false ? $line : substr($line, 0, $pos);
                        $family = $pos === false ? 'malware' : substr($line, $pos + 1);
                        if (strlen($hash) === 64) {
                            self::$known_bad_hashes[$hash] = $family;
                        }
                    }
                    fclose($handle);
                }
            }
        }
        if (empty(self::$known_bad_hashes)) {
            return null;
        }
        $sha256 = @hash_file('sha256', $path);
        if ($sha256 === false || !isset(self::$known_bad_hashes[$sha256])) {
            return null;
        }
        return ['hash' => $sha256, 'family' => self::$known_bad_hashes[$sha256]];
    }

    private function calculate_entropy($data) {
        if (strlen($data) === 0) return 0;
        $freq = [];
        $len = strlen($data);
        for ($i = 0; $i < $len; $i++) {
            $byte = $data[$i];
            if (!isset($freq[$byte])) $freq[$byte] = 0;
            $freq[$byte]++;
        }
        $entropy = 0;
        foreach ($freq as $count) {
            $p = $count / $len;
            if ($p > 0) $entropy -= $p * log($p, 2);
        }
        return $entropy;
    }

    private function scan_for_wordpress_checksums() {
        global $wp_version;
        $results = [
            'core_files_checked' => 0,
            'core_files_modified' => 0,
            'modified_files' => [],
            'checksums_api' => 'unreachable',
            'known_good_source' => 'none',
        ];

        $checksums = $this->get_core_checksums();
        if (empty($checksums)) {
            $results['checksums_api'] = $this->core_checksums_source ?: 'unreachable';
            return $results;
        }

        $results['checksums_api'] = ($this->core_checksums_source === 'online-synced' || $this->core_checksums_source === 'transient') ? 'ok' : $this->core_checksums_source;
        $results['known_good_source'] = $this->core_checksums_source ?: 'online-synced';
        $checked = 0;
        $modified = [];

        $core_dirs = [ABSPATH . 'wp-admin/', ABSPATH . 'wp-includes/'];
        foreach ($core_dirs as $dir) {
            if (!is_dir($dir)) continue;
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::SELF_FIRST
            );
            foreach ($iterator as $file) {
                if (!$file->isFile()) continue;
                $rel_path = str_replace(ABSPATH, '', $file->getPathname());
                $rel_path = ltrim(str_replace('\\', '/', $rel_path), '/');
                if (!isset($checksums[$rel_path])) continue;
                $checked++;
                $expected = $checksums[$rel_path];
                $actual = hash_file('md5', $file->getPathname());
                if ($expected !== $actual) {
                    $modified[] = [
                        'file' => $rel_path,
                        'expected_md5' => $expected,
                        'actual_md5' => $actual,
                        'size' => $file->getSize(),
                    ];
                }
                if ($checked >= 300) break 2;
            }
        }

        $results['core_files_checked'] = $checked;
        $results['core_files_modified'] = count($modified);
        $results['modified_files'] = $modified;
        return $results;
    }

    private function run_malware_scan_cell($cell_index = 0) {
        $wp_checksums = $this->scan_for_wordpress_checksums();

        $results = [
            'suspicious_files' => [],
            'infected_core_files' => [],
            'secrets_found' => [],
            'scanned_categories' => [],
            'total_scanned' => 0,
            'suspicious_found' => 0,
            'infected_core' => 0,
            'total_issues' => 0,
            'wp_checksums' => $wp_checksums,
            'heuristic_scores' => [],
            'avg_entropy' => 0,
            'entropy_samples' => 0,
        ];

        $scan_dirs = [
            'plugins' => ABSPATH . 'wp-content/plugins/',
            'themes'  => ABSPATH . 'wp-content/themes/',
            'uploads' => ABSPATH . 'wp-content/uploads/',
            'mu_plugins' => ABSPATH . 'wp-content/mu-plugins/',
            'root'    => ABSPATH,
        ];

        $all_files = [];
        $total_entropy = 0;
        $entropy_count = 0;
        $excluded_dirs = ['wp-waf-firewall1/', 'wordfence/'];

        $ignored_issues = get_option('waf_fw_ignored_issues', []);

        foreach ($scan_dirs as $cat => $dir) {
            if (!is_dir($dir)) continue;
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::SELF_FIRST
            );
            foreach ($iterator as $file) {
                if (!$file->isFile()) continue;
                $fp = wp_normalize_path($file->getPathname());
                $rel_path = str_replace(wp_normalize_path(ABSPATH), '', $fp);
                if (in_array($rel_path, $ignored_issues)) {
                    continue;
                }
                $skip = false;
                foreach ($excluded_dirs as $ex) {
                    if (strpos($fp, 'wp-content/plugins/' . $ex) !== false) {
                        $skip = true;
                        break;
                    }
                }
                if ($skip) continue;
                $all_files[] = ['file' => $file, 'cat' => $cat];
            }
        }

        $start = $cell_index * self::CELL_SIZE;
        $cell = array_slice($all_files, $start, self::CELL_SIZE);
        $total_cells = max(1, ceil(count($all_files) / self::CELL_SIZE));

        foreach ($cell as $entry) {
            $file = $entry['file'];
            $cat = $entry['cat'];
            $path = $file->getPathname();

            $result = $this->scan_file_heuristic($path);
            if ($result === null) {
                $results['total_scanned']++;
                continue;
            }
            $results['total_scanned']++;
            $results['heuristic_scores'][] = $result['score'];

            if ($result['score'] >= 50) {
                $results['suspicious_files'][] = $result;
                $results['suspicious_found']++;
                if (!in_array($cat, $results['scanned_categories'])) {
                    $results['scanned_categories'][] = $cat;
                }
            } elseif ($result['score'] >= 25) {
                if (strpos($result['findings'][0] ?? '', 'secret:') === 0) {
                    $results['secrets_found'][] = $result;
                } else {
                    $results['suspicious_files'][] = $result;
                    $results['suspicious_found']++;
                }
            }

            if ($file->getSize() > 100 && $file->getSize() < 500000) {
                $content = @file_get_contents($path);
                if ($content) {
                    $total_entropy += $this->calculate_entropy($content);
                    $entropy_count++;
                }
            }
        }

        $htaccess_paths = [
            ABSPATH . '.htaccess',
            ABSPATH . 'wp-content/.htaccess',
            ABSPATH . 'wp-content/uploads/.htaccess',
        ];
        if ($cell_index === 0) {
            foreach ($htaccess_paths as $ht) {
                if (!file_exists($ht)) continue;
                $result = $this->scan_file_heuristic($ht);
                if ($result && $result['score'] >= 25) {
                    $results['suspicious_files'][] = $result;
                    $results['suspicious_found']++;
                }
            }

            $env_paths = [ABSPATH . '.env', ABSPATH . '.env.example', dirname(ABSPATH) . '/.env'];
            foreach ($env_paths as $env) {
                if (file_exists($env)) {
                    $results['secrets_found'][] = [
                        'file' => str_replace(ABSPATH, '', $env),
                        'score' => 30,
                        'severity' => 'warning',
                        'findings' => ['secret: Environment file exposed (' . basename($env) . ')'],
                        'size' => filesize($env),
                    ];
                }
            }
        }

        $results['avg_entropy'] = $entropy_count > 0 ? round($total_entropy / $entropy_count, 2) : 0;
        $results['entropy_samples'] = $entropy_count;
        $results['total_issues'] = $results['suspicious_found'] + $results['infected_core'] + count($results['secrets_found']);
        $results['cell_scanned'] = count($cell);

        $completed = ($cell_index + 1) >= $total_cells;

        return [
            'data' => $results,
            'completed' => $completed,
            'total_files' => count($all_files),
            'scanned_files' => min(($cell_index + 1) * self::CELL_SIZE, count($all_files)),
            'total_cells' => $total_cells,
        ];
    }

    private function scan_database_for_malware() {
        global $wpdb;
        $results = [
            'tables_scanned' => 0,
            'rows_checked' => 0,
            'suspicious_content' => [],
            'suspicious_users' => [],
            'malware_in_options' => [],
        ];

        $suspicious_patterns = [
            '/<script[^>]*>/i',
            '/eval\s*\(/i',
            '/base64_decode\s*\(/i',
            '/gzinflate\s*\(/i',
            '/<\?php/i',
            '/system\s*\(/i',
            '/exec\s*\(/i',
            '/passthru\s*\(/i',
            '/shell_exec\s*\(/i',
            '/assert\s*\(/i',
            '/preg_replace\s*\(\s*[\'"].*e[\'"]/i',
            '/create_function\s*\(/i',
            '/document\.write\s*\(/i',
            '/String\.fromCharCode/i',
            '/atob\s*\(/i',
            '/\\\x[0-9a-f]{2}\\\x[0-9a-f]/i',
            '/file_put_contents\s*\(/i',
            '/popen\s*\(/i',
            '/proc_open\s*\(/i',
            '/curl_exec\s*\(/i',
            '/wp_remote_(get|post|request)\s*\(/i',
            '/ob_start\s*\(/i',
        ];

        $tables_to_scan = [
            $wpdb->posts,
            $wpdb->postmeta,
            $wpdb->options,
            $wpdb->comments,
            $wpdb->commentmeta,
            $wpdb->usermeta,
            $wpdb->termmeta,
            $wpdb->postmeta . ' pm2',
        ];

        $text_columns = ['post_content', 'post_excerpt', 'post_title', 'option_value', 'meta_value', 'comment_content', 'user_url', 'display_name', 'description'];

        foreach ($tables_to_scan as $table) {
            $clean_table = explode(' ', $table)[0];
            if (!$wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $clean_table))) continue;
            $results['tables_scanned']++;

            $columns = $wpdb->get_results("SHOW COLUMNS FROM $clean_table");
            if (!$columns) continue;

            foreach ($columns as $col) {
                if (!in_array($col->Field, $text_columns)) continue;

                $rows = $wpdb->get_results($wpdb->prepare(
                    "SELECT `{$col->Field}` FROM $clean_table WHERE LENGTH(`{$col->Field}`) > 100 AND (`{$col->Field}` REGEXP '<[^>]*script|<\\?php|eval|base64_decode') LIMIT %d",
                    50
                ));

                if ($rows) {
                    foreach ($rows as $row) {
                        $content = $row->{$col->Field};
                        $matches = $this->check_malware_patterns($content, $suspicious_patterns);
                        if (!empty($matches)) {
                            $results['suspicious_content'][] = [
                                'table' => $clean_table,
                                'column' => $col->Field,
                                'patterns' => array_slice($matches, 0, 3),
                                'content_preview' => substr($content, 0, 200),
                            ];
                            $results['rows_checked']++;
                        }
                    }
                }
            }
        }

        $suspicious_roles = ['administrator', 'editor', 'author', 'subscriber'];
        foreach ($suspicious_roles as $role) {
            $users = get_users(['role' => $role, 'fields' => ['ID', 'user_login', 'user_email', 'user_registered']]);
            foreach ($users as $user) {
                $user_data = get_userdata($user->ID);
                $email_domain = substr(strrchr($user->user_email, '@'), 1);
                $suspicious_domains = ['mail.ru', 'yandex.com', 'protonmail.com', 'tempmail', 'guerrillamail', '10minute', 'throwaway', 'mailinator', 'yopmail'];
                foreach ($suspicious_domains as $sd) {
                    if (stripos($email_domain, $sd) !== false && $role === 'administrator') {
                        $results['suspicious_users'][] = [
                            'user_login' => $user->user_login,
                            'user_email' => $user->user_email,
                            'role' => $role,
                            'reason' => "Administrator with $sd email domain",
                        ];
                        break;
                    }
                }
                if ($user->user_email && !email_exists($user->user_email) && $role === 'administrator') {
                    $results['suspicious_users'][] = [
                        'user_login' => $user->user_login,
                        'user_email' => $user->user_email,
                        'role' => $role,
                        'reason' => 'Administrator with potentially invalid email',
                    ];
                }
            }
        }

        $suspicious_option_keys = [
            'registration' => '/registration|user_roles|admin_email|siteurl|home|blogname|admin_/i',
            'widget' => '/^widget_|^recently_|^wp_.*block|elementor|wpb_/i',
            'theme_mod' => '/^theme_mod|^nav_menu|^category_|^cron/i',
            'plugin_option' => '/^waf_|^wordfence|^aiowps|^bulletproof|^sucuri|^itsec|_settings$|_options$|_config$/i',
        ];

        $option_rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT option_name, option_value FROM {$wpdb->options} WHERE LENGTH(option_value) > 500 AND option_value REGEXP '<[^>]*script|<\\?php|eval|base64_decode' LIMIT %d",
                30
            )
        );

        foreach ($option_rows as $opt) {
            $matches = $this->check_malware_patterns($opt->option_value, $suspicious_patterns);
            if (!empty($matches)) {
                $results['malware_in_options'][] = [
                    'option_name' => $opt->option_name,
                    'patterns' => array_slice($matches, 0, 3),
                    'preview' => substr($opt->option_value, 0, 150),
                ];
            }
        }

        $results['total_suspicious'] = count($results['suspicious_content']) + count($results['malware_in_options']) + count($results['suspicious_users']);
        return $results;
    }

    public function resume_scan($queue_id) {
        return $this->process_scan_cell($queue_id, 0);
    }

    public function scan_website($scan_type = 'full') {
        $start_time = microtime(true);
        $target_url = home_url();
        $results = [];

        $modules = $this->get_modules_for_scan_type($scan_type);
        foreach ($modules as $stage) {
            switch ($stage) {
                case 'init':
                case 'complete':
                    break;
                case 'basic':
                    $results['basic_checks'] = $this->run_basic_security_checks($target_url);
                    break;
                case 'headers':
                    $results['headers_check'] = $this->check_security_headers($target_url);
                    break;
                case 'ssl':
                    $results['ssl_check'] = $this->check_ssl($target_url);
                    break;
                case 'wp_core':
                    $results['wordpress_checks'] = $this->check_wordpress_security();
                    break;
                case 'waf_test':
                    $results['waf_test'] = $this->test_waf_protection();
                    break;
                case 'directories':
                    $results['directory_listing'] = $this->check_directory_listing($target_url);
                    break;
                case 'xmlrpc':
                    $results['xmlrpc_check'] = $this->check_xmlrpc($target_url);
                    break;
                case 'cors':
                    $results['cors_check'] = $this->check_cors($target_url);
                    break;
                case 'cookies':
                    $results['cookie_security'] = $this->check_cookie_security($target_url);
                    break;
                case 'file_upload':
                    $results['file_upload_check'] = $this->check_file_upload_security();
                    break;
                case 'php_info':
                    $results['php_info_exposure'] = $this->check_php_info_exposure($target_url);
                    break;
                case 'vulnerabilities':
                    $results['vulnerability_scan'] = $this->run_vulnerability_scan();
                    break;
                case 'file_changes':
                    $results['file_changes'] = $this->check_file_changes();
                    break;
                case 'malware':
                    $results['malware_scan'] = $this->run_malware_scan();
                    break;
                case 'ml_malware':
                    $results['ml_malware_scan'] = $this->run_ml_malware_scan();
                    break;
                case 'db_scan':
                    $results['db_scan'] = $this->scan_database_for_malware();
                    break;
                case 'port_scan':
                    $results['port_scan'] = $this->quick_port_check($target_url);
                    break;
                case 'ml_scan':
                    $results['ml_analysis'] = $this->run_ml_scan($target_url);
                    break;
            }
        }

        $issues_found = $this->count_issues($results);
        $score = $this->calculate_score($results);
        $duration = (int) (microtime(true) - $start_time);
        $security_status = $this->determine_security_status($score, $issues_found, $results);

        $summary = [
            'score' => $score,
            'issues_found' => $issues_found,
            'checks_performed' => count($results, COUNT_RECURSIVE) - count($results),
            'scan_type' => $scan_type,
            'target_url' => $target_url,
            'security_status' => $security_status,
        ];

        $this->save_scan_result($scan_type, $target_url, $results, $summary, $score, $issues_found, $duration);

        return [
            'success' => true,
            'score' => $score,
            'issues_found' => $issues_found,
            'duration' => $duration,
            'summary' => $summary,
            'results' => $results,
        ];
    }

    private function run_basic_security_checks($url) {
        $checks = [];
        $checks['admin_url_exposed'] = $this->check_url_exists($url . '/wp-admin');
        $checks['wp_json_exposed'] = $this->check_url_exists($url . '/wp-json/wp/v2/users');
        $checks['readme_exists'] = $this->check_url_exists($url . '/readme.html');
        $checks['wp_config_backup'] = $this->check_url_exists($url . '/wp-config.php.bak');
        $checks['install_php_exists'] = $this->check_url_exists($url . '/wp-admin/install.php');
        $checks['upgrade_php_exists'] = $this->check_url_exists($url . '/wp-admin/upgrade.php');
        return $checks;
    }

    private function check_security_headers($url) {
        $headers = @get_headers($url, 1);
        if (!$headers) return ['error' => 'Could not fetch headers'];

        $header_keys = array_change_key_case($headers, CASE_LOWER);
        return [
            'x_frame_options' => isset($header_keys['x-frame-options']) ? $header_keys['x-frame-options'] : 'Missing',
            'x_xss_protection' => isset($header_keys['x-xss-protection']) ? $header_keys['x-xss-protection'] : 'Missing',
            'x_content_type_options' => isset($header_keys['x-content-type-options']) ? $header_keys['x-content-type-options'] : 'Missing',
            'strict_transport_security' => isset($header_keys['strict-transport-security']) ? $header_keys['strict-transport-security'] : 'Missing',
            'content_security_policy' => isset($header_keys['content-security-policy']) ? $header_keys['content-security-policy'] : 'Missing',
            'referrer_policy' => isset($header_keys['referrer-policy']) ? $header_keys['referrer-policy'] : 'Missing',
            'permissions_policy' => isset($header_keys['permissions-policy']) ? $header_keys['permissions-policy'] : 'Missing',
        ];
    }

    private function check_ssl($url) {
        if (strpos($url, 'https://') !== 0) {
            return ['status' => 'no_ssl', 'message' => 'SSL not detected'];
        }

        $host = parse_url($url, PHP_URL_HOST);
        $ctx = stream_context_create(['ssl' => ['capture_peer_cert' => true]]);
        $socket = @stream_socket_client("ssl://$host:443", $errno, $errstr, 10, STREAM_CLIENT_CONNECT, $ctx);

        if ($socket) {
            $params = stream_context_get_params($socket);
            $cert = $params['options']['ssl']['peer_certificate'] ?? null;
            if ($cert) {
                $info = openssl_x509_parse($cert);
                $valid_to = $info['validTo_time_t'] ?? time();
                $days_remaining = floor(($valid_to - time()) / 86400);
                return [
                    'status' => 'valid',
                    'issuer' => $info['issuer']['O'] ?? 'Unknown',
                    'valid_from' => date('Y-m-d', $info['validFrom_time_t'] ?? time()),
                    'valid_to' => date('Y-m-d', $valid_to),
                    'days_remaining' => $days_remaining,
                    'expiring_soon' => $days_remaining < 30,
                ];
            }
        }
        return ['status' => 'error', 'message' => 'Could not verify SSL certificate'];
    }

    private function check_wordpress_security() {
        global $wp_version;
        $checks = [];
        $checks['wp_version'] = $wp_version;
        $checks['wp_version_uptodate'] = $this->check_wp_version($wp_version);
        $checks['user_enumeration'] = $this->check_user_enumeration();
        $checks['debug_enabled'] = defined('WP_DEBUG') && WP_DEBUG;
        $checks['file_editing'] = defined('DISALLOW_FILE_EDIT') && DISALLOW_FILE_EDIT;
        $checks['auto_core_updates'] = defined('WP_AUTO_UPDATE_CORE') && WP_AUTO_UPDATE_CORE;
        $checks['disallow_unfiltered_html'] = defined('DISALLOW_UNFILTERED_HTML') && DISALLOW_UNFILTERED_HTML;
        $active_plugins = get_option('active_plugins', []);
        $checks['active_plugins_count'] = count($active_plugins);
        $checks['has_admin_user'] = $this->check_username_exists('admin');
        return $checks;
    }

    private function test_waf_protection() {
        $tests = [];

        $sqli_payloads = ["' OR '1'='1", "1; DROP TABLE users--", "' UNION SELECT * FROM users--", "' OR 1=1--", "\" OR 1=1--", "admin'--", "' OR SLEEP(5)--", "' OR BENCHMARK(1000000,MD5(1))--"];
        $xss_payloads = ["<script>alert(1)</script>", "<img src=x onerror=alert(1)>", "javascript:alert(document.cookie)", "<svg onload=alert(1)>", "<body onload=alert(1)>", "<details open ontoggle=alert(1)>", "<input autofocus onfocus=alert(1)>"];
        $lfi_payloads = ["../../../etc/passwd", "....//....//....//etc/passwd", "../../../../windows/win.ini", "php://filter/read=convert.base64-encode/resource=index.php", "php://filter/convert.base64-encode/resource=wp-config.php"];
        $rce_payloads = ["; cat /etc/passwd", "| dir", "`ls -la`", "$(cat /etc/hostname)", "system('id')"];
        $ssti_payloads = ["{{7*7}}", "#{7*7}", "${7*7}", "<%= 7*7 %>", "{{config}}", "{{self.__class__}}"];
        $cmd_injection_payloads = ["127.0.0.1; ls", "192.168.1.1 | whoami", "1.1.1.1 && dir", "8.8.8.8 || echo vulnerable"];
        $path_traversal_payloads = ["../../../../../etc/passwd", "..%252f..%252f..%252fetc/passwd", "/etc/passwd%00", "....//....//....//etc/shadow", "..\\..\\..\\..\\..\\boot.ini"];

        $tests['sqli_detection'] = $this->test_payload_detection($sqli_payloads, 'SQL Injection');
        $tests['xss_detection'] = $this->test_payload_detection($xss_payloads, 'XSS');
        $tests['lfi_detection'] = $this->test_payload_detection($lfi_payloads, 'LFI');
        $tests['rce_detection'] = $this->test_payload_detection($rce_payloads, 'RCE');
        $tests['ssti_detection'] = $this->test_payload_detection($ssti_payloads, 'SSTI');
        $tests['cmd_injection_detection'] = $this->test_payload_detection($cmd_injection_payloads, 'Command Injection');
        $tests['path_traversal_detection'] = $this->test_payload_detection($path_traversal_payloads, 'Path Traversal');

        $ml_client = WAF_FW_ML_Api_Client::instance();
        $tests['ml_available'] = $ml_client->is_available();

        return $tests;
    }

    private function run_ml_scan($url) {
        $ml_client = WAF_FW_ML_Api_Client::instance();
        if (!$ml_client->is_available()) {
            return ['status' => 'unavailable', 'message' => 'ML API not configured'];
        }

        $ml_client->refresh_config();
        $test_connection = $ml_client->test_connection();
        if (!$test_connection['success']) {
            return ['status' => 'unreachable', 'message' => $test_connection['message']];
        }

        $test_payloads = [
            ['type' => 'SQL Injection', 'payload' => "' OR '1'='1' -- "],
            ['type' => 'SQL Injection Union', 'payload' => "1 UNION SELECT * FROM users"],
            ['type' => 'XSS Script', 'payload' => '<script>alert("xss")</script>'],
            ['type' => 'XSS OnError', 'payload' => '<img src=x onerror=alert(1)>'],
            ['type' => 'LFI', 'payload' => '../../../etc/passwd'],
            ['type' => 'RCE', 'payload' => '; cat /etc/passwd'],
            ['type' => 'SSTI', 'payload' => '{{7*7}}'],
            ['type' => 'SSRF Internal', 'payload' => 'http://169.254.169.254/latest/meta-data/'],
            ['type' => 'XSS SVG', 'payload' => '<svg/onload=alert(1)>'],
            ['type' => 'SQL Injection Sleep', 'payload' => "' OR SLEEP(5)--"],
            ['type' => 'LFI PHP Filter', 'payload' => 'php://filter/convert.base64-encode/resource=wp-config.php'],
            ['type' => 'Command Injection', 'payload' => '127.0.0.1; cat /etc/passwd'],
        ];

        $results = [
            'connection' => 'connected',
            'backend_online' => true,
            'total_tests' => count($test_payloads),
            'detected_count' => 0,
            'tests' => [],
        ];

        foreach ($test_payloads as $test) {
            $result = $ml_client->analyze([
                'url' => '/test?q=' . urlencode($test['payload']),
                'method' => 'GET',
                'body' => '',
                'query_string' => 'q=' . urlencode($test['payload']),
                'query_params' => ['q' => $test['payload']],
                'headers' => [
                    'User-Agent' => 'WAF-Scanner/1.0',
                    'Accept' => 'text/html,application/json',
                ],
                'ip' => '127.0.0.1',
            ]);

            if (is_array($result)) {
                $decision = strtoupper((string) ($result['decision'] ?? ''));
                $action = strtolower((string) ($result['action'] ?? ''));
                $detected = $decision === 'BLOCK' || in_array($action, ['block', 'rate_limit'], true);
                if ($detected) $results['detected_count']++;

                $results['tests'][$test['type']] = [
                    'status' => $detected ? 'blocked' : 'allowed',
                    'confidence' => $result['confidence'] ?? 0,
                    'attack_type' => $result['attack_type'] ?? '',
                ];
            } else {
                $results['tests'][$test['type']] = [
                    'status' => 'error',
                    'message' => 'No response from ML backend',
                ];
            }
        }

        $results['detection_rate'] = $results['total_tests'] > 0
            ? round(($results['detected_count'] / $results['total_tests']) * 100)
            : 0;

        return $results;
    }

    private function quick_port_check($url) {
        $host = parse_url($url, PHP_URL_HOST);
        $ports = [
            21  => 'FTP', 22  => 'SSH', 23  => 'Telnet', 25  => 'SMTP',
            53  => 'DNS', 80  => 'HTTP', 110 => 'POP3', 143 => 'IMAP',
            443 => 'HTTPS', 445 => 'SMB', 993 => 'IMAPS', 995 => 'POP3S',
            1433 => 'MSSQL', 1521 => 'Oracle', 3306 => 'MySQL', 3389 => 'RDP',
            5432 => 'PostgreSQL', 5900 => 'VNC', 6379 => 'Redis',
            8080 => 'HTTP-Proxy', 8443 => 'HTTPS-Alt', 27017 => 'MongoDB',
        ];
        $open = [];
        $services = [];

        foreach ($ports as $port => $service) {
            $socket = @fsockopen($host, $port, $errno, $errstr, 0.5);
            if ($socket) {
                $open[] = $port;
                $services[] = $service;
                fclose($socket);
            }
        }

        $high_risk = [21, 22, 23, 445, 1433, 3306, 3389, 5432, 5900, 6379, 27017];
        return [
            'open_ports' => $open,
            'services' => $services,
            'total_scanned' => count($ports),
            'exposed_services' => !empty(array_intersect($open, $high_risk)),
            'high_risk_open' => array_values(array_intersect($open, $high_risk)),
            'risk_level' => count(array_intersect($open, $high_risk)) > 2 ? 'critical' : (count(array_intersect($open, $high_risk)) > 0 ? 'warning' : 'safe'),
        ];
    }

    private function check_url_exists($url) {
        $response = wp_remote_head($url, ['timeout' => 5]);
        return !is_wp_error($response) && in_array(wp_remote_retrieve_response_code($response), [200, 301, 302]);
    }

    private function check_wp_version($current_version) {
        $response = wp_remote_get('https://api.wordpress.org/core/version-check/1.7/', ['timeout' => 5]);
        if (is_wp_error($response)) return true;
        $data = json_decode(wp_remote_retrieve_body($response));
        if ($data && isset($data->offers[0]->current)) {
            $latest = $data->offers[0]->current;
            return version_compare($current_version, $latest, '>=');
        }
        return true;
    }

    private function check_user_enumeration() {
        $response = wp_remote_get(home_url() . '/wp-json/wp/v2/users', ['timeout' => 5]);
        return !is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200;
    }

    private function check_username_exists($username) {
        return username_exists($username) !== false;
    }

    private function test_payload_detection($payloads, $type) {
        $detected = 0;
        $rule_engine = WAF_FW_Rule_Engine::instance();

        foreach ($payloads as $payload) {
            $result = $rule_engine->check_request([
                'url' => '/test',
                'method' => 'POST',
                'body' => $payload,
                'query_params' => ['q' => $payload],
            ]);
            if (!empty($result)) {
                $detected++;
            }
        }

        return [
            'tested' => count($payloads),
            'detected' => $detected,
            'rate' => count($payloads) > 0 ? round(($detected / count($payloads)) * 100) : 0,
        ];
    }

    private function count_issues($results) {
        $issues = 0;

        if (isset($results['basic_checks'])) {
            foreach ($results['basic_checks'] as $check) {
                if ($check) $issues++;
            }
        }

        if (isset($results['headers_check'])) {
            foreach ($results['headers_check'] as $value) {
                if ($value === 'Missing') $issues++;
            }
        }

        if (isset($results['wordpress_checks'])) {
            if (isset($results['wordpress_checks']['wp_version_uptodate']) && !$results['wordpress_checks']['wp_version_uptodate']) $issues++;
            if (isset($results['wordpress_checks']['debug_enabled']) && $results['wordpress_checks']['debug_enabled']) $issues++;
            if (isset($results['wordpress_checks']['user_enumeration'])) $issues++;
            if (isset($results['wordpress_checks']['has_admin_user'])) $issues++;
        }

        if (isset($results['directory_listing']['directory_listing_enabled']) && $results['directory_listing']['directory_listing_enabled']) {
            $issues += count($results['directory_listing']['vulnerable_directories']);
        }

        if (isset($results['xmlrpc_check']['xmlrpc_accessible']) && $results['xmlrpc_check']['xmlrpc_accessible']) $issues++;
        if (isset($results['xmlrpc_check']['methods_exposed']) && $results['xmlrpc_check']['methods_exposed']) $issues++;

        if (isset($results['cors_check']['cors_misconfigured']) && $results['cors_check']['cors_misconfigured']) $issues++;

        if (isset($results['cookie_security'])) {
            if (isset($results['cookie_security']['missing_secure_flag'])) $issues += $results['cookie_security']['missing_secure_flag'];
            if (isset($results['cookie_security']['missing_httponly_flag'])) $issues += $results['cookie_security']['missing_httponly_flag'];
        }

        if (isset($results['php_info_exposure']['php_info_exposed']) && $results['php_info_exposure']['php_info_exposed']) $issues += count($results['php_info_exposure']['exposed_files']);

        if (isset($results['malware_scan']['total_issues'])) {
            $issues += $results['malware_scan']['total_issues'];
        }

        if (isset($results['ml_malware_scan']['total_issues'])) {
            $issues += $results['ml_malware_scan']['total_issues'];
        }

        if (isset($results['db_scan']['total_suspicious'])) {
            $issues += $results['db_scan']['total_suspicious'];
        }

        if (isset($results['vulnerability_scan']['total_vulnerabilities'])) {
            $issues += $results['vulnerability_scan']['total_vulnerabilities'];
        }

        if (isset($results['port_scan']['high_risk_open'])) {
            $issues += count($results['port_scan']['high_risk_open']);
        }

        if (isset($results['file_changes']) && is_array($results['file_changes'])) {
            $issues += count($results['file_changes']);
        }

        if (isset($results['ssl_deep_analysis']['issues'])) {
            $issues += count($results['ssl_deep_analysis']['issues']);
        }

        if (isset($results['password_audit'])) {
            $issues += count($results['password_audit']['admin_with_weak'] ?? []);
            $issues += count($results['password_audit']['old_passwords'] ?? []);
        }

        if (isset($results['blocklist_check']['listed']) && $results['blocklist_check']['listed']) {
            $issues += count($results['blocklist_check']['lists_found_on'] ?? []);
        }

        if (isset($results['fpd_check']['fpd_detected']) && $results['fpd_check']['fpd_detected']) {
            $issues += count($results['fpd_check']['exposed_paths'] ?? []);
        }

        if (isset($results['db_integrity'])) {
            $issues += count($results['db_integrity']['tables_with_issues'] ?? []);
            $issues += count($results['db_integrity']['duplicate_user_emails'] ?? []);
        }

        if (isset($results['dns_security']['issues'])) {
            $issues += count($results['dns_security']['issues']);
        }

        if (isset($results['rss_spam_check']['spam_detected']) && $results['rss_spam_check']['spam_detected']) {
            $issues += count($results['rss_spam_check']['issues'] ?? []);
        }

        if (isset($results['deprecated_php']['total_deprecated_found'])) {
            $issues += min(20, $results['deprecated_php']['total_deprecated_found']);
        }

        if (isset($results['file_permissions']['issues'])) {
            $issues += count($results['file_permissions']['issues']);
        }

        if (isset($results['server_fingerprint']['issues'])) {
            $issues += count($results['server_fingerprint']['issues']);
        }

        if (isset($results['config_exposure']['total_exposed'])) {
            $issues += $results['config_exposure']['total_exposed'];
        }

        if (isset($results['known_files_check'])) {
            $issues += count($results['known_files_check']['modified_core_files'] ?? []);
            $issues += count($results['known_files_check']['unknown_files'] ?? []);
        }

        return $issues;
    }

    private function calculate_score($results) {
        $score = 100;

        if (isset($results['basic_checks'])) {
            foreach ($results['basic_checks'] as $check) {
                if ($check) $score -= 5;
            }
        }

        if (isset($results['headers_check'])) {
            foreach ($results['headers_check'] as $value) {
                if ($value === 'Missing') $score -= 5;
            }
        }

        if (isset($results['wordpress_checks'])) {
            if (isset($results['wordpress_checks']['wp_version_uptodate']) && !$results['wordpress_checks']['wp_version_uptodate']) $score -= 10;
            if (isset($results['wordpress_checks']['debug_enabled']) && $results['wordpress_checks']['debug_enabled']) $score -= 10;
            if (isset($results['wordpress_checks']['user_enumeration'])) $score -= 5;
            if (isset($results['wordpress_checks']['has_admin_user'])) $score -= 10;
        }

        if (isset($results['waf_test']['sqli_detection']['rate']) && $results['waf_test']['sqli_detection']['rate'] < 100) $score -= 10;
        if (isset($results['waf_test']['xss_detection']['rate']) && $results['waf_test']['xss_detection']['rate'] < 100) $score -= 10;
        if (isset($results['waf_test']['lfi_detection']['rate']) && $results['waf_test']['lfi_detection']['rate'] < 100) $score -= 5;
        if (isset($results['waf_test']['rce_detection']['rate']) && $results['waf_test']['rce_detection']['rate'] < 100) $score -= 5;
        if (isset($results['waf_test']['ssti_detection']['rate']) && $results['waf_test']['ssti_detection']['rate'] < 100) $score -= 5;
        if (isset($results['waf_test']['cmd_injection_detection']['rate']) && $results['waf_test']['cmd_injection_detection']['rate'] < 100) $score -= 5;
        if (isset($results['waf_test']['path_traversal_detection']['rate']) && $results['waf_test']['path_traversal_detection']['rate'] < 100) $score -= 5;

        if (isset($results['directory_listing']['directory_listing_enabled']) && $results['directory_listing']['directory_listing_enabled']) $score -= 10;
        if (isset($results['xmlrpc_check']['xmlrpc_accessible']) && $results['xmlrpc_check']['xmlrpc_accessible']) $score -= 5;
        if (isset($results['cors_check']['cors_misconfigured']) && $results['cors_check']['cors_misconfigured']) $score -= 5;
        if (isset($results['cookie_security']['missing_secure_flag']) && $results['cookie_security']['missing_secure_flag'] > 0) $score -= 5;
        if (isset($results['cookie_security']['missing_httponly_flag']) && $results['cookie_security']['missing_httponly_flag'] > 0) $score -= 5;
        if (isset($results['php_info_exposure']['php_info_exposed']) && $results['php_info_exposure']['php_info_exposed']) $score -= 10;

        if (isset($results['malware_scan'])) {
            if (($results['malware_scan']['infected_core'] ?? 0) > 0) $score -= 30;
            if (($results['malware_scan']['suspicious_found'] ?? 0) > 0) $score -= 15;
            if (isset($results['malware_scan']['secrets_found']) && count($results['malware_scan']['secrets_found']) > 0) $score -= 20;
            if (isset($results['malware_scan']['wp_checksums']['core_files_modified']) && $results['malware_scan']['wp_checksums']['core_files_modified'] > 0) $score -= 25;
        }

        if (isset($results['ml_malware_scan'])) {
            if (($results['ml_malware_scan']['malicious_count'] ?? 0) > 0) $score -= 30;
            if (($results['ml_malware_scan']['suspicious_count'] ?? 0) > 0) $score -= 10;
        }

        if (isset($results['db_scan']['total_suspicious']) && $results['db_scan']['total_suspicious'] > 0) {
            $score -= min(20, $results['db_scan']['total_suspicious'] * 5);
        }

        if (isset($results['db_scan']['suspicious_users']) && count($results['db_scan']['suspicious_users']) > 0) {
            $score -= min(15, count($results['db_scan']['suspicious_users']) * 5);
        }

        if (isset($results['vulnerability_scan']['total_vulnerabilities'])) {
            $score -= min(30, $results['vulnerability_scan']['total_vulnerabilities'] * 10);
        }

        if (isset($results['port_scan']['risk_level'])) {
            if ($results['port_scan']['risk_level'] === 'critical') $score -= 20;
            else if ($results['port_scan']['risk_level'] === 'warning') $score -= 10;
        }

        if (isset($results['file_changes']) && is_array($results['file_changes'])) {
            $score -= min(20, count($results['file_changes']) * 3);
        }

        if (isset($results['ssl_deep_analysis'])) {
            $grade = $results['ssl_deep_analysis']['grade'] ?? 'A';
            if ($grade === 'F') $score -= 15;
            elseif ($grade === 'D') $score -= 10;
            elseif ($grade === 'C') $score -= 5;
            $score -= min(10, count($results['ssl_deep_analysis']['issues'] ?? []) * 2);
        }

        if (isset($results['password_audit'])) {
            $weak_admins = count($results['password_audit']['admin_with_weak'] ?? []);
            $score -= min(20, $weak_admins * 10);
            $old_pass = count($results['password_audit']['old_passwords'] ?? []);
            $score -= min(10, $old_pass * 2);
        }

        if (isset($results['blocklist_check']['listed']) && $results['blocklist_check']['listed']) {
            $score -= min(25, count($results['blocklist_check']['lists_found_on'] ?? []) * 5);
        }

        if (isset($results['fpd_check']['fpd_detected']) && $results['fpd_check']['fpd_detected']) {
            $score -= min(15, count($results['fpd_check']['exposed_paths'] ?? []) * 5);
        }

        if (isset($results['db_integrity'])) {
            $score -= min(10, count($results['db_integrity']['tables_with_issues'] ?? []) * 3);
            $score -= min(5, count($results['db_integrity']['duplicate_user_emails'] ?? []) * 2);
        }

        if (isset($results['dns_security']['issues'])) {
            $score -= min(10, count($results['dns_security']['issues']) * 3);
        }

        if (isset($results['rss_spam_check']['spam_detected']) && $results['rss_spam_check']['spam_detected']) {
            $score -= 15;
        }

        if (isset($results['deprecated_php']['total_deprecated_found'])) {
            $score -= min(10, $results['deprecated_php']['total_deprecated_found']);
        }

        if (isset($results['file_permissions']['issues'])) {
            foreach ($results['file_permissions']['issues'] as $perm_issue) {
                $score -= ($perm_issue['severity'] === 'critical') ? 8 : 3;
            }
        }

        if (isset($results['server_fingerprint']['total_disclosures'])) {
            $score -= min(10, $results['server_fingerprint']['total_disclosures'] * 2);
        }

        if (isset($results['config_exposure'])) {
            $score -= min(25, ($results['config_exposure']['severity_breakdown']['critical'] ?? 0) * 5);
            $score -= min(10, ($results['config_exposure']['severity_breakdown']['warning'] ?? 0) * 2);
        }

        if (isset($results['known_files_check'])) {
            $score -= min(25, count($results['known_files_check']['modified_core_files'] ?? []) * 10);
            $score -= min(10, count($results['known_files_check']['unknown_files'] ?? []) * 2);
        }

        return max(0, min(100, $score));
    }

    public function get_scan_history($limit = 10) {
        global $wpdb;
        $table = $this->db->get_scan_results_table();
        return $wpdb->get_results("SELECT * FROM $table ORDER BY created_at DESC LIMIT $limit");
    }

    public function clear_scan_history() {
        global $wpdb;
        $results_table = $this->db->get_scan_results_table();
        $queue_table = $this->db->get_scan_queue_table();
        $wpdb->query("TRUNCATE TABLE $results_table");
        $wpdb->query("TRUNCATE TABLE $queue_table");
    }

    public function get_latest_scan() {
        global $wpdb;
        $table = $this->db->get_scan_results_table();
        return $wpdb->get_row("SELECT * FROM $table ORDER BY created_at DESC LIMIT 1");
    }

    private function check_directory_listing($url) {
        $dirs = ['/wp-content/uploads/', '/wp-includes/', '/wp-admin/css/', '/wp-content/plugins/', '/wp-content/themes/'];
        $enabled = [];

        foreach ($dirs as $dir) {
            $response = wp_remote_get($url . $dir, ['timeout' => 5]);
            if (!is_wp_error($response)) {
                $body = wp_remote_retrieve_body($response);
                if (strpos($body, '<title>Index of') !== false || strpos($body, 'Parent Directory</a>') !== false) {
                    $enabled[] = $dir;
                }
            }
        }

        return [
            'directory_listing_enabled' => !empty($enabled),
            'vulnerable_directories' => $enabled,
        ];
    }

    private function check_xmlrpc($url) {
        $response = wp_remote_post($url . '/xmlrpc.php', [
            'timeout' => 5,
            'headers' => ['Content-Type' => 'text/xml'],
            'body' => '<?xml version="1.0"?><methodCall><methodName>system.listMethods</methodName></methodCall>',
        ]);

        $available = !is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200;
        $body = $response ? wp_remote_retrieve_body($response) : '';

        return [
            'xmlrpc_accessible' => $available,
            'methods_exposed' => $available && strpos($body, 'system.listMethods') !== false,
        ];
    }

    private function check_cors($url) {
        $response = wp_remote_get($url, [
            'timeout' => 5,
            'headers' => ['Origin' => 'https://evil.com'],
        ]);

        if (is_wp_error($response)) {
            return ['cors_misconfigured' => false, 'error' => 'Could not check CORS'];
        }

        $origin_header = wp_remote_retrieve_header($response, 'Access-Control-Allow-Origin');
        return [
            'cors_misconfigured' => $origin_header === '*' || $origin_header === 'https://evil.com',
            'access_control_origin' => $origin_header ?: 'Not set',
        ];
    }

    private function check_cookie_security($url) {
        $response = wp_remote_get($url, ['timeout' => 5]);
        if (is_wp_error($response)) {
            return ['error' => 'Could not check cookies'];
        }

        $cookies = wp_remote_retrieve_header($response, 'Set-Cookie');
        if (empty($cookies)) {
            return ['secure_cookies' => true, 'http_only_cookies' => true];
        }

        $cookies = is_array($cookies) ? $cookies : [$cookies];
        $insecure = 0;
        $no_httponly = 0;

        foreach ($cookies as $cookie) {
            if (stripos($cookie, 'secure') === false) $insecure++;
            if (stripos($cookie, 'httponly') === false) $no_httponly++;
        }

        return [
            'secure_cookies' => $insecure === 0,
            'http_only_cookies' => $no_httponly === 0,
            'total_cookies' => count($cookies),
            'missing_secure_flag' => $insecure,
            'missing_httponly_flag' => $no_httponly,
        ];
    }

    private function check_file_upload_security() {
        $checks = [];
        $checks['uploads_dir_permissions'] = (int) fileperms(ABSPATH . 'wp-content/uploads') !== 0755;
        $checks['php_execution_in_uploads'] = !defined('DISALLOW_FILE_EDIT') || !DISALLOW_FILE_EDIT;
        $htaccess_path = ABSPATH . 'wp-content/uploads/.htaccess';
        $checks['uploads_htaccess_exists'] = file_exists($htaccess_path);
        return $checks;
    }

    private function check_php_info_exposure($url) {
        $files = ['/phpinfo.php', '/info.php', '/test.php', '/p.php', '/php_info.php', '/info.php.bak'];
        $exposed = [];

        foreach ($files as $file) {
            $response = wp_remote_get($url . $file, ['timeout' => 5]);
            if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200) {
                $body = wp_remote_retrieve_body($response);
                if (stripos($body, 'phpinfo') !== false || stripos($body, 'PHP Version') !== false) {
                    $exposed[] = $file;
                }
            }
        }

        return [
            'php_info_exposed' => !empty($exposed),
            'exposed_files' => $exposed,
        ];
    }

    private function run_malware_scan() {
        $results = [
            'suspicious_files' => [],
            'infected_core_files' => [],
            'secrets_found' => [],
            'scanned_categories' => [],
            'total_scanned' => 0,
            'suspicious_found' => 0,
            'infected_core' => 0,
            'total_issues' => 0,
            'wp_checksums' => $this->scan_for_wordpress_checksums(),
            'heuristic_scores' => [],
        ];

        $scan_dirs = [
            'plugins' => ABSPATH . 'wp-content/plugins/',
            'themes'  => ABSPATH . 'wp-content/themes/',
            'uploads' => ABSPATH . 'wp-content/uploads/',
            'mu_plugins' => ABSPATH . 'wp-content/mu-plugins/',
            'root'    => ABSPATH,
        ];

        $excluded_dirs = ['wp-waf-firewall1/', 'wordfence/'];

        foreach ($scan_dirs as $cat => $dir) {
            if (!is_dir($dir)) continue;
            $count = 0;
            $file_list = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::SELF_FIRST
            );
            foreach ($file_list as $file) {
                if (!$file->isFile()) continue;
                $fp = wp_normalize_path($file->getPathname());
                $skip = false;
                foreach ($excluded_dirs as $ex) {
                    if (strpos($fp, 'wp-content/plugins/' . $ex) !== false) {
                        $skip = true;
                        break;
                    }
                }
                if ($skip) continue;

                $result = $this->scan_file_heuristic($file->getPathname());
                if ($result === null) { $count++; continue; }
                $count++;
                $results['total_scanned']++;
                $results['heuristic_scores'][] = $result['score'];
                if (!in_array($cat, $results['scanned_categories'])) {
                    $results['scanned_categories'][] = $cat;
                }

                if ($result['score'] >= 50) {
                    $results['suspicious_files'][] = $result;
                    $results['suspicious_found']++;
                } elseif (strpos($result['findings'][0] ?? '', 'secret:') === 0) {
                    $results['secrets_found'][] = $result;
                } elseif ($result['score'] >= 25) {
                    $results['suspicious_files'][] = $result;
                    $results['suspicious_found']++;
                }
            }
        }

        $htaccess_paths = [
            ABSPATH . '.htaccess',
            ABSPATH . 'wp-content/.htaccess',
            ABSPATH . 'wp-content/uploads/.htaccess',
        ];
        foreach ($htaccess_paths as $ht) {
            if (!file_exists($ht)) continue;
            $result = $this->scan_file_heuristic($ht);
            if ($result && $result['score'] >= 25) {
                $results['suspicious_files'][] = $result;
                $results['suspicious_found']++;
            }
        }

        $env_paths = [ABSPATH . '.env', ABSPATH . '.env.example', dirname(ABSPATH) . '/.env'];
        foreach ($env_paths as $env) {
            if (file_exists($env)) {
                $results['secrets_found'][] = [
                    'file' => str_replace(ABSPATH, '', $env),
                    'score' => 30,
                    'severity' => 'warning',
                    'findings' => ['secret: Environment file exposed (' . basename($env) . ')'],
                    'size' => filesize($env),
                ];
            }
        }

        $results['total_issues'] = $results['suspicious_found'] + $results['infected_core'] + count($results['secrets_found']);
        return $results;
    }

    private function run_ml_malware_scan_cell($cell_index = 0) {
        $ml_client = WAF_FW_ML_Api_Client::instance();
        if (!$ml_client->is_available()) {
            return [
                'data' => [
                    'status' => 'unavailable',
                    'message' => 'MDefender-Pro ML API not configured. Add your API URL and key in Settings.'
                ],
                'completed' => true,
                'total_files' => 0,
                'scanned_files' => 0,
            ];
        }

        $ml_client->refresh_config();

        $results = [
            'status' => 'connected',
            'backend_online' => true,
            'model' => 'mdefender-malware',
            'model_version' => '',
            'model_loaded' => true,
            'total_scanned' => 0,
            'total_files' => 0,
            'malicious_count' => 0,
            'suspicious_count' => 0,
            'clean_count' => 0,
            'error_count' => 0,
            'total_issues' => 0,
            'malicious_files' => [],
            'suspicious_files' => [],
            'clean_files' => [],
            'scanned_categories' => [],
        ];

        $scan_dirs = [
            'plugins' => ABSPATH . 'wp-content/plugins/',
            'themes'  => ABSPATH . 'wp-content/themes/',
            'uploads' => ABSPATH . 'wp-content/uploads/',
            'mu_plugins' => ABSPATH . 'wp-content/mu-plugins/',
            'root'    => ABSPATH,
        ];
        $excluded_dirs = ['wp-waf-firewall1/', 'wordfence/'];
        $max_size = 10 * 1024 * 1024;

        $candidates = [];
        $ignored_issues = get_option('waf_fw_ignored_issues', []);

        $wp_checksums = $this->scan_for_wordpress_checksums();
        $modified_core = [];
        if (!empty($wp_checksums['modified_files'])) {
            foreach ($wp_checksums['modified_files'] as $mc) {
                $modified_core[] = wp_normalize_path(ABSPATH . $mc['file']);
            }
        }

        global $wpdb;
        $integrity_table = WAF_FW_DB::instance()->get_file_integrity_table();
        $non_known = $wpdb->get_col("SELECT file_path FROM $integrity_table WHERE status != 'known'");
        $non_known_set = array_flip($non_known ? $non_known : []);

        foreach ($scan_dirs as $cat => $dir) {
            if (!is_dir($dir)) continue;
            $file_list = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::SELF_FIRST
            );
            foreach ($file_list as $file) {
                if (!$file->isFile()) continue;
                $fp = wp_normalize_path($file->getPathname());
                $rel_path = str_replace(wp_normalize_path(ABSPATH), '', $fp);
                if (in_array($rel_path, $ignored_issues)) {
                    continue;
                }
                $skip = false;
                foreach ($excluded_dirs as $ex) {
                    if (strpos($fp, 'wp-content/plugins/' . $ex) !== false) {
                        $skip = true;
                        break;
                    }
                }
                if ($skip) continue;
                if ($file->getSize() > $max_size) continue;
                $ext = strtolower(pathinfo($fp, PATHINFO_EXTENSION));
                if (!in_array($ext, ['php', 'phtml', 'php3', 'php4', 'php5', 'phar', 'htaccess'], true)) continue;

                $is_candidate = false;

                // 1. Always scan files in uploads
                if ($cat === 'uploads') {
                    $is_candidate = true;
                }
                // 2. Scan core files ONLY if they are modified
                elseif ($cat === 'root' || strpos($rel_path, 'wp-admin/') === 0 || strpos($rel_path, 'wp-includes/') === 0) {
                    if (in_array($fp, $modified_core)) {
                        $is_candidate = true;
                    }
                }
                // 3. Scan plugins/themes if they are new/modified in integrity DB, OR if they fail local heuristic checks
                else {
                    if (isset($non_known_set[$rel_path])) {
                        $is_candidate = true;
                    } else {
                        $local = $this->scan_file_heuristic($fp);
                        if ($local && $local['score'] >= 20) {
                            $is_candidate = true;
                        }
                    }
                }

                if ($is_candidate) {
                    $candidates[] = ['file' => $file, 'cat' => $cat];
                }
            }
        }

        $total_files = count($candidates);
        $start = $cell_index * self::CELL_SIZE;
        $cell = array_slice($candidates, $start, self::CELL_SIZE);
        $total_cells = max(1, ceil($total_files / self::CELL_SIZE));

        foreach ($cell as $entry) {
            $file = $entry['file'];
            $cat = $entry['cat'];
            $path = $file->getPathname();
            $content = @file_get_contents($path);
            if ($content === false || empty($content)) continue;

            $verdict = $ml_client->scan_file(basename($path), $content);
            unset($content);
            if (!$verdict) {
                $results['error_count']++;
                continue;
            }

            $results['total_scanned']++;
            if (!in_array($cat, $results['scanned_categories'])) {
                $results['scanned_categories'][] = $cat;
            }

            $record = [
                'file' => str_replace(ABSPATH, '', $path),
                'category' => $cat,
                'verdict' => $verdict['verdict'] ?? 'error',
                'risk_score' => round((float) ($verdict['risk_score'] ?? 0), 2),
                'confidence' => round((float) ($verdict['confidence'] ?? 0), 2),
                'probability' => round((float) ($verdict['probability'] ?? 0), 2),
                'family' => $verdict['family'] ?? '',
                'reasons' => $verdict['reasons'] ?? [],
                'size' => $file->getSize(),
            ];

            $v = $record['verdict'];
            if ($v === 'malicious') {
                $results['malicious_count']++;
                $results['malicious_files'][] = $record;
            } elseif ($v === 'suspicious') {
                $results['suspicious_count']++;
                $results['suspicious_files'][] = $record;
            } elseif ($v === 'clean') {
                $results['clean_count']++;
                $results['clean_files'][] = $record;
            }
        }

        $results['total_issues'] = $results['malicious_count'] + $results['suspicious_count'];
        $completed = ($cell_index + 1) >= $total_cells;

        return [
            'data' => $results,
            'completed' => $completed,
            'total_files' => $total_files,
            'scanned_files' => min(($cell_index + 1) * self::CELL_SIZE, $total_files),
            'total_cells' => $total_cells,
        ];
    }

    private function run_ml_malware_scan() {
        $cell_index = 0;
        $results = [
            'status' => 'connected',
            'backend_online' => true,
            'model' => 'mdefender-malware',
            'model_version' => '',
            'model_loaded' => true,
            'total_scanned' => 0,
            'total_files' => 0,
            'malicious_count' => 0,
            'suspicious_count' => 0,
            'clean_count' => 0,
            'error_count' => 0,
            'total_issues' => 0,
            'malicious_files' => [],
            'suspicious_files' => [],
            'clean_files' => [],
            'scanned_categories' => [],
        ];

        do {
            $cell_result = $this->run_ml_malware_scan_cell($cell_index);
            if (isset($cell_result['data']['status']) && $cell_result['data']['status'] === 'unavailable') {
                return $cell_result['data'];
            }

            $data = $cell_result['data'];
            $results['malicious_files'] = array_merge($results['malicious_files'], $data['malicious_files'] ?? []);
            $results['suspicious_files'] = array_merge($results['suspicious_files'], $data['suspicious_files'] ?? []);
            $results['clean_files'] = array_merge($results['clean_files'], $data['clean_files'] ?? []);
            $results['scanned_categories'] = array_unique(array_merge($results['scanned_categories'], $data['scanned_categories'] ?? []));
            $results['total_scanned'] += $data['total_scanned'] ?? 0;
            $results['total_files'] = $cell_result['total_files'] ?? 0;
            $results['malicious_count'] += $data['malicious_count'] ?? 0;
            $results['suspicious_count'] += $data['suspicious_count'] ?? 0;
            $results['clean_count'] += $data['clean_count'] ?? 0;
            $results['error_count'] += $data['error_count'] ?? 0;

            $completed = $cell_result['completed'];
            $cell_index++;
        } while (!$completed);

        $results['total_issues'] = $results['malicious_count'] + $results['suspicious_count'];
        return $results;
    }

    private function check_malware_patterns($content, $patterns) {
        $found = [];
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $content, $m)) {
                $found[] = $m[0];
            }
        }
        return $found;
    }

    private function determine_security_status($score, $issues, $results) {
        $critical = false;
        $warnings = false;

        if (isset($results['malware_scan']['infected_core']) && $results['malware_scan']['infected_core'] > 0) $critical = true;
        if (isset($results['malware_scan']['suspicious_found']) && $results['malware_scan']['suspicious_found'] > 0) $critical = true;
        if (isset($results['malware_scan']['secrets_found']) && count($results['malware_scan']['secrets_found']) > 0) $critical = true;
        if (isset($results['ml_malware_scan']['malicious_count']) && $results['ml_malware_scan']['malicious_count'] > 0) $critical = true;
        if (isset($results['ml_malware_scan']['suspicious_count']) && $results['ml_malware_scan']['suspicious_count'] > 0) $critical = true;
        if (isset($results['malware_scan']['wp_checksums']['core_files_modified']) && $results['malware_scan']['wp_checksums']['core_files_modified'] > 0) $critical = true;
        if (isset($results['db_scan']['total_suspicious']) && $results['db_scan']['total_suspicious'] > 0) $critical = true;
        if (isset($results['db_scan']['suspicious_users']) && count($results['db_scan']['suspicious_users']) > 0) $critical = true;
        if (isset($results['vulnerability_scan']['total_vulnerabilities']) && $results['vulnerability_scan']['total_vulnerabilities'] > 0) $critical = true;
        if (isset($results['port_scan']['risk_level']) && $results['port_scan']['risk_level'] === 'critical') $critical = true;
        if (isset($results['php_info_exposure']['php_info_exposed']) && $results['php_info_exposure']['php_info_exposed']) $critical = true;
        if (isset($results['blocklist_check']['listed']) && $results['blocklist_check']['listed']) $critical = true;
        if (isset($results['config_exposure']['severity_breakdown']['critical']) && $results['config_exposure']['severity_breakdown']['critical'] > 0) $critical = true;
        if (isset($results['fpd_check']['fpd_detected']) && $results['fpd_check']['fpd_detected']) $critical = true;
        if (isset($results['password_audit']['admin_with_weak']) && count($results['password_audit']['admin_with_weak']) > 0) $critical = true;
        if (isset($results['known_files_check']['modified_core_files']) && count($results['known_files_check']['modified_core_files']) > 0) $critical = true;
        if (isset($results['rss_spam_check']['spam_detected']) && $results['rss_spam_check']['spam_detected']) $critical = true;

        if ($issues > 0 && !$critical) $warnings = true;

        if ($critical) {
            return [
                'label' => 'Critical Issues Found',
                'status' => 'critical',
                'icon' => 'dashicons-warning',
                'color' => '#ef4444',
                'bg' => '#fef2f2',
                'border' => '#fecaca',
                'message' => "Your website has $issues critical security issue(s). Immediate action required.",
            ];
        } elseif ($warnings) {
            return [
                'label' => 'Security Warnings',
                'status' => 'warning',
                'icon' => 'dashicons-flag',
                'color' => '#f59e0b',
                'bg' => '#fffbeb',
                'border' => '#fde68a',
                'message' => "Your website has $issues security warning(s). Review and fix them soon.",
            ];
        } else {
            return [
                'label' => 'Website is Secure',
                'status' => 'secure',
                'icon' => 'dashicons-shield',
                'color' => '#10b981',
                'bg' => '#f0fdf4',
                'border' => '#bbf7d0',
                'message' => 'Your website passed all security checks. No issues found.',
            ];
        }
    }

    private function run_vulnerability_scan() {
        global $wp_version;
        $results = [
            'known_vulnerabilities' => [],
            'plugin_vulnerabilities' => [],
            'theme_vulnerabilities' => [],
        ];

        $major_cve = [
            '4.0' => ['CVE-2014-9031', 'WordPress < 4.0.1 XSS + RCE chain'],
            '4.1' => ['CVE-2015-2213', 'WordPress < 4.1.1 SQL injection in comments'],
            '4.2' => ['CVE-2015-5623', 'WordPress < 4.2.3 stored XSS'],
            '4.3' => ['CVE-2015-7989', 'WordPress < 4.3.1 XSS in user agent'],
            '4.4' => ['CVE-2015-8386', 'WordPress < 4.4.1 regex DoS in comments'],
            '4.5' => ['CVE-2016-5834', 'WordPress < 4.5.3 privilege escalation'],
            '4.6' => ['CVE-2016-7168', 'WordPress < 4.6.1 path traversal'],
            '4.7' => ['CVE-2017-1001000', 'WordPress < 4.7.1 REST API content injection'],
            '4.8' => ['CVE-2017-17094', 'WordPress < 4.8.3 stored XSS in $HTTP_RAW_POST_DATA'],
            '4.9' => ['CVE-2017-17095', 'WordPress < 4.9.1 file delete via customizer'],
            '5.0' => ['CVE-2019-8942', 'WordPress < 5.0.1 RCE via crop-image'],
            '5.1' => ['CVE-2019-9787', 'WordPress < 5.1.1 XSS in comments'],
            '5.2' => ['CVE-2019-16222', 'WordPress < 5.2.3 stored XSS via URL shortener'],
            '5.3' => ['CVE-2019-20043', 'WordPress < 5.3.1 privilege escalation via REST API'],
            '5.4' => ['CVE-2020-11027', 'WordPress < 5.4.2 XSS via custom fields'],
            '5.5' => ['CVE-2020-28034', 'WordPress < 5.5.2 stored XSS via plugin install screen'],
            '5.6' => ['CVE-2021-29447', 'WordPress < 5.6.2 XXE via media library'],
            '5.7' => ['CVE-2021-34641', 'WordPress < 5.7.2 stored XSS in user display names'],
            '5.8' => ['CVE-2021-39200', 'WordPress < 5.8.1 information disclosure via REST API'],
            '5.9' => ['CVE-2022-21661', 'WordPress < 5.8.3 SQL injection via WP_Query'],
            '6.0' => ['CVE-2022-3590', 'WordPress < 6.0.3 stored XSS via navigation block'],
            '6.1' => ['CVE-2023-2500', 'WordPress < 6.1.2 stored XSS via shortcode'],
            '6.2' => ['CVE-2023-3464', 'WordPress < 6.2.1 XSS via block editor'],
        ];

        foreach ($major_cve as $ver => $cve) {
            if (version_compare($wp_version, $ver, '=')) {
                $results['known_vulnerabilities'][] = [
                    'type' => 'WordPress ' . $cve[1],
                    'severity' => 'critical',
                    'description' => "WordPress $wp_version has known vulnerability: {$cve[1]}.",
                    'cve' => $cve[0],
                ];
            }
        }

        if (version_compare($wp_version, '4.7', '<')) {
            $results['known_vulnerabilities'][] = [
                'type' => 'WordPress Severely Outdated',
                'severity' => 'critical',
                'description' => "WordPress $wp_version is severely outdated. Multiple critical CVEs unpatched.",
                'cve' => 'Multiple',
            ];
        }

        if (defined('WP_DEBUG') && WP_DEBUG && defined('WP_DEBUG_DISPLAY') && WP_DEBUG_DISPLAY) {
            $results['known_vulnerabilities'][] = [
                'type' => 'Debug Mode Enabled',
                'severity' => 'warning',
                'description' => 'WP_DEBUG and WP_DEBUG_DISPLAY are enabled in production. This may expose sensitive information.',
                'cve' => '',
            ];
        }

        if (!defined('DISALLOW_FILE_EDIT') || !DISALLOW_FILE_EDIT) {
            $results['known_vulnerabilities'][] = [
                'type' => 'File Editing Enabled',
                'severity' => 'warning',
                'description' => 'Plugin/theme file editing is enabled. Disable with define("DISALLOW_FILE_EDIT", true) in wp-config.php.',
                'cve' => '',
            ];
        }

        if (!defined('WP_AUTO_UPDATE_CORE') || WP_AUTO_UPDATE_CORE !== true) {
            $results['known_vulnerabilities'][] = [
                'type' => 'Auto Updates Disabled',
                'severity' => 'info',
                'description' => 'WordPress automatic core updates are not enabled. Enable with define("WP_AUTO_UPDATE_CORE", true).',
                'cve' => '',
            ];
        }

        $upload_perms = fileperms(ABSPATH . 'wp-content/uploads') & 0777;
        if ($upload_perms === 0777 || $upload_perms === 0755) {
            $results['known_vulnerabilities'][] = [
                'type' => 'Uploads Directory Permissions',
                'severity' => 'warning',
                'description' => 'wp-content/uploads has overly permissive permissions (' . sprintf('%o', $upload_perms) . '). Consider 755.',
                'cve' => '',
            ];
        }

        // Query MDefender Centralized Vulnerability Check API
        $installed_plugins = [];
        if (!function_exists('get_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }
        $plugins = get_plugins();
        foreach ($plugins as $file => $info) {
            $slug = dirname($file);
            if ($slug === '.') {
                $slug = str_replace('.php', '', $file);
            }
            $installed_plugins[] = [
                'slug' => $slug,
                'version' => $info['Version'] ?? '0.0.0',
                'name' => $info['Name'] ?? $slug
            ];
        }

        $installed_themes = [];
        $themes = wp_get_themes();
        foreach ($themes as $slug => $theme_obj) {
            $installed_themes[] = [
                'slug' => $slug,
                'version' => $theme_obj->get('Version') ?? '0.0.0',
                'name' => $theme_obj->get('Name') ?? $slug
            ];
        }

        $api_client = WAF_FW_ML_Api_Client::instance();
        if ($api_client->is_available()) {
            $findings = $api_client->check_vulnerabilities($installed_plugins, $installed_themes);

            if (is_array($findings) && !empty($findings)) {
                foreach ($findings as $f) {
                    if ($f['type'] === 'plugin') {
                        $results['plugin_vulnerabilities'][] = [
                            'plugin' => $f['slug'],
                            'slug' => $f['slug'],
                            'severity' => (float)$f['cvss_score'] >= 8.0 ? 'critical' : ((float)$f['cvss_score'] >= 6.0 ? 'high' : 'medium'),
                            'cve' => $f['cve'] ?: $f['vuln_id'],
                            'description' => $f['description'],
                        ];
                    } else if ($f['type'] === 'theme') {
                        $results['theme_vulnerabilities'][] = [
                            'theme' => $f['slug'],
                            'version' => $f['version'],
                            'severity' => (float)$f['cvss_score'] >= 8.0 ? 'critical' : ((float)$f['cvss_score'] >= 6.0 ? 'high' : 'medium'),
                            'cve' => $f['cve'] ?: $f['vuln_id'],
                            'description' => $f['description'],
                        ];
                    }
                }
            }
        }

        $total = count($results['known_vulnerabilities']) + count($results['plugin_vulnerabilities']) + count($results['theme_vulnerabilities']);
        $results['total_vulnerabilities'] = $total;
        return $results;
    }

    private function check_plugins_against_wpscan() {
        $dangerous = [];

        $response = wp_remote_get('https://www.wordfence.com/api/intelligence/vulnerabilities/', [
            'timeout' => 10,
            'headers' => ['User-Agent' => 'WAF-Firewall-Scanner/3.0'],
        ]);

        if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200) {
            $data = json_decode(wp_remote_retrieve_body($response), true);
            if (is_array($data)) {
                foreach ($data as $vuln) {
                    if (isset($vuln['software']['slug']) && isset($vuln['cve'])) {
                        $slug = $vuln['software']['slug'];
                        $dangerous[$slug . '/' . $slug . '.php'] = [
                            'name' => $vuln['software']['name'] ?? $slug,
                            'cve' => $vuln['cve'],
                            'severity' => $vuln['severity'] ?? 'high',
                            'description' => substr($vuln['description'] ?? 'No description', 0, 200),
                        ];
                    }
                }
            }
        }

        $dangerous['wp-file-manager/wp-file-manager.php'] = [
            'name' => 'WP File Manager',
            'cve' => 'CVE-2020-25213',
            'severity' => 'critical',
            'description' => 'Known RCE vulnerability in WP File Manager plugin.',
        ];

        $dangerous['revslider/revslider.php'] = [
            'name' => 'Revolution Slider',
            'cve' => 'CVE-2014-9734',
            'severity' => 'critical',
            'description' => 'Known arbitrary file upload vulnerability.',
        ];

        $dangerous['essential-grid/essential-grid.php'] = [
            'name' => 'Essential Grid',
            'cve' => 'CVE-2015-4102',
            'severity' => 'critical',
            'description' => 'Known SQL injection vulnerability.',
        ];

        $dangerous['showbiz/showbiz.php'] = [
            'name' => 'Showbiz Pro',
            'cve' => 'CVE-2015-4103',
            'severity' => 'critical',
            'description' => 'Known arbitrary file upload vulnerability.',
        ];

        $dangerous['gravityforms/gravityforms.php'] = [
            'name' => 'Gravity Forms',
            'cve' => 'CVE-2020-27883',
            'severity' => 'high',
            'description' => 'Known privilege escalation vulnerability.',
        ];

        $dangerous['woocommerce/woocommerce.php'] = [
            'name' => 'WooCommerce',
            'cve' => 'Multiple',
            'severity' => 'high',
            'description' => 'Various known vulnerabilities in older versions.',
        ];

        $dangerous['contact-form-7/wp-contact-form-7.php'] = [
            'name' => 'Contact Form 7',
            'cve' => 'CVE-2020-35489',
            'severity' => 'high',
            'description' => 'Known unrestricted file upload vulnerability.',
        ];

        $dangerous['elementor/elementor.php'] = [
            'name' => 'Elementor',
            'cve' => 'CVE-2021-29167',
            'severity' => 'high',
            'description' => 'Known stored XSS vulnerability.',
        ];

        $dangerous['js_composer/js_composer.php'] = [
            'name' => 'WPBakery Page Builder',
            'cve' => 'CVE-2020-7016',
            'severity' => 'high',
            'description' => 'Known RCE vulnerability.',
        ];

        return $dangerous;
    }

    private function save_scan_result($scan_type, $target_url, $results, $summary, $score, $issues, $duration) {
        global $wpdb;
        $table = $this->db->get_scan_results_table();
        $pages_scanned = isset($results['port_scan']['total_scanned']) ? $results['port_scan']['total_scanned'] + 10 : 10;

        $wpdb->insert($table, [
            'scan_type' => $scan_type,
            'target_url' => $target_url,
            'vulnerabilities' => json_encode($results),
            'summary' => json_encode($summary),
            'score' => $score,
            'pages_scanned' => $pages_scanned,
            'issues_found' => $issues,
            'duration_seconds' => $duration,
            'status' => 'completed',
        ]);

        $this->record_scan_metric($scan_type, $score, $issues, $duration, $results);
        $this->send_scan_email_report($scan_type, $score, $issues, $results, $summary);
    }

    private function record_scan_metric($scan_type, $score, $issues, $duration, $results) {
        self::$scan_metrics['last_scan'] = [
            'type' => $scan_type,
            'score' => $score,
            'issues' => $issues,
            'duration' => $duration,
            'timestamp' => current_time('mysql'),
        ];
        self::$scan_metrics['checks_performed'] = count($results, COUNT_RECURSIVE) - count($results);
        self::$scan_metrics['peak_memory'] = memory_get_peak_usage(true);

        update_option('waf_fw_scan_metrics', self::$scan_metrics);
    }

    private function send_scan_email_report($scan_type, $score, $issues, $results, $summary) {
        if (get_option('waf_fw_email_alerts', 'no') !== 'yes') return;
        if ($score >= 80 && $issues === 0) return;

        $admin_email = get_option('admin_email');
        $site_name = get_bloginfo('name');
        $status_label = $summary['security_status']['label'] ?? 'Unknown';
        $status_color = $summary['security_status']['color'] ?? '#333';

        $subject = sprintf('[%s] Security Scan Alert - %s (Score: %d/100)', $site_name, $status_label, $score);

        $body = "Security Scan Report for {$site_name}\n";
        $body .= str_repeat('=', 50) . "\n\n";
        $body .= "Scan Type: {$scan_type}\n";
        $body .= "Security Score: {$score}/100\n";
        $body .= "Issues Found: {$issues}\n";
        $body .= "Status: {$status_label}\n";
        $duration_text = $summary['duration'] ?? 'N/A';
        $body .= "Duration: {$duration_text}\n\n";

        if (isset($results['malware_scan']['suspicious_files']) && count($results['malware_scan']['suspicious_files']) > 0) {
            $body .= "CRITICAL - Suspicious Files:\n";
            foreach ($results['malware_scan']['suspicious_files'] as $sf) {
                $body .= "  - {$sf['file']} (Score: {$sf['score']})\n";
            }
            $body .= "\n";
        }

        if (isset($results['malware_scan']['secrets_found']) && count($results['malware_scan']['secrets_found']) > 0) {
            $body .= "CRITICAL - Exposed Secrets:\n";
            foreach ($results['malware_scan']['secrets_found'] as $s) {
                $body .= "  - {$s['file']}\n";
            }
            $body .= "\n";
        }

        if (isset($results['db_scan']['suspicious_users']) && count($results['db_scan']['suspicious_users']) > 0) {
            $body .= "WARNING - Suspicious User Accounts:\n";
            foreach ($results['db_scan']['suspicious_users'] as $u) {
                $body .= "  - {$u['user_login']} ({$u['user_email']}) - {$u['reason']}\n";
            }
            $body .= "\n";
        }

        if (isset($results['vulnerability_scan']['total_vulnerabilities']) && $results['vulnerability_scan']['total_vulnerabilities'] > 0) {
            $body .= "Vulnerabilities Detected: {$results['vulnerability_scan']['total_vulnerabilities']}\n\n";
        }

        $body .= "\nReview: " . admin_url('admin.php?page=waf-firewall-scan') . "\n";

        wp_mail($admin_email, $subject, $body);
    }

    private function run_ssl_deep_analysis($url) {
        if (strpos($url, 'https://') !== 0) {
            return ['status' => 'not_https', 'message' => 'Site is not using HTTPS', 'grade' => 'F', 'issues' => ['HTTPS not enabled']];
        }

        $host = parse_url($url, PHP_URL_HOST);
        $issues = [];
        $grade = 'A';
        $details = [];

        $ctx = stream_context_create(['ssl' => [
            'capture_peer_cert' => true,
            'verify_peer' => false,
            'verify_peer_name' => false,
        ]]);
        $socket = @stream_socket_client("ssl://$host:443", $errno, $errstr, 10, STREAM_CLIENT_CONNECT, $ctx);

        if (!$socket) {
            return ['status' => 'error', 'message' => 'Could not establish SSL connection', 'grade' => 'F', 'issues' => ['SSL connection failed: ' . $errstr]];
        }

        $params = stream_context_get_params($socket);
        $cert = $params['options']['ssl']['peer_certificate'] ?? null;

        if ($cert) {
            $info = openssl_x509_parse($cert);
            $valid_to = $info['validTo_time_t'] ?? time();
            $days_remaining = floor(($valid_to - time()) / 86400);
            $valid_from = $info['validFrom_time_t'] ?? time();
            $cert_age_days = floor((time() - $valid_from) / 86400);

            $details['issuer'] = $info['issuer']['O'] ?? 'Unknown';
            $details['subject'] = $info['subject']['CN'] ?? 'Unknown';
            $details['valid_from'] = date('Y-m-d', $valid_from);
            $details['valid_to'] = date('Y-m-d', $valid_to);
            $details['days_remaining'] = $days_remaining;
            $details['serial_number'] = $info['serialNumberHex'] ?? '';
            $details['signature_algorithm'] = $info['signatureTypeSN'] ?? 'Unknown';
            $details['cert_age_days'] = $cert_age_days;

            $san = $info['extensions']['subjectAltName'] ?? '';
            $details['san'] = $san;
            $details['wildcard'] = strpos($details['subject'], '*') !== false;

            if ($days_remaining < 7) {
                $issues[] = 'SSL certificate expires in ' . $days_remaining . ' days - CRITICAL';
                $grade = 'F';
            } elseif ($days_remaining < 30) {
                $issues[] = 'SSL certificate expires in ' . $days_remaining . ' days';
                if ($grade === 'A') $grade = 'B';
            }

            $weak_algos = ['md5', 'sha1', 'dsa', 'RSA-SHA1'];
            $sig_algo = strtolower($details['signature_algorithm']);
            foreach ($weak_algos as $wa) {
                if (strpos($sig_algo, $wa) !== false) {
                    $issues[] = 'Weak signature algorithm: ' . $details['signature_algorithm'];
                    if (ord($grade) < ord('D')) $grade = 'D';
                    break;
                }
            }

            $key_size = $info['key']['size'] ?? 0;
            $details['key_size'] = $key_size;
            if ($key_size > 0 && $key_size < 2048) {
                $issues[] = 'Weak key size: ' . $key_size . ' bits (minimum 2048 recommended)';
                if (ord($grade) < ord('D')) $grade = 'D';
            } elseif ($key_size >= 4096) {
                $details['key_strength'] = 'Excellent';
            } elseif ($key_size >= 2048) {
                $details['key_strength'] = 'Good';
            }

            if ($cert_age_days > 365) {
                $issues[] = 'Certificate is over 1 year old (' . $cert_age_days . ' days)';
            }

            $proto_list = stream_context_get_options($socket);
        }

        fclose($socket);

        $proto_check = @stream_socket_client("ssl://$host:443", $e, $m, 5, STREAM_CLIENT_CONNECT, stream_context_create(['ssl' => ['crypto_method' => STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT]]));
        $details['tls_1_3'] = $proto_check !== false;
        if ($proto_check) fclose($proto_check);

        $proto_check12 = @stream_socket_client("ssl://$host:443", $e, $m, 5, STREAM_CLIENT_CONNECT, stream_context_create(['ssl' => ['crypto_method' => STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT]]));
        $details['tls_1_2'] = $proto_check12 !== false;
        if ($proto_check12) fclose($proto_check12);

        $proto_check11 = @stream_socket_client("ssl://$host:443", $e, $m, 5, STREAM_CLIENT_CONNECT, stream_context_create(['ssl' => ['crypto_method' => STREAM_CRYPTO_METHOD_TLSv1_1_CLIENT]]));
        $details['tls_1_1'] = $proto_check11 !== false;
        if ($proto_check11) { fclose($proto_check11); $issues[] = 'TLS 1.1 is enabled (deprecated)'; if ($grade === 'A') $grade = 'B'; }

        $proto_check10 = @stream_socket_client("ssl://$host:443", $e, $m, 5, STREAM_CLIENT_CONNECT, stream_context_create(['ssl' => ['crypto_method' => STREAM_CRYPTO_METHOD_SSLv3_CLIENT]]));
        $details['ssl_3_0'] = $proto_check10 !== false;
        if ($proto_check10) { fclose($proto_check10); $issues[] = 'SSL 3.0 is enabled (insecure)'; $grade = 'F'; }

        $headers = @get_headers($url, 1);
        if ($headers) {
            $h = array_change_key_case($headers, CASE_LOWER);
            if (!isset($h['strict-transport-security'])) {
                $issues[] = 'HSTS header not set';
                if ($grade === 'A') $grade = 'B';
            } else {
                $details['hsts'] = $h['strict-transport-security'];
            }
        }

        return [
            'status' => empty($issues) ? 'secure' : 'issues_found',
            'grade' => $grade,
            'details' => $details,
            'issues' => $issues,
        ];
    }

    private function run_password_audit() {
        global $wpdb;
        $results = [
            'users_checked' => 0,
            'weak_passwords' => [],
            'common_passwords' => [],
            'admin_with_weak' => [],
            'old_passwords' => [],
            'password_recommendations' => [],
        ];

        $common_passwords = [
            'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', 'master',
            'dragon', '111111', 'baseball', 'iloveyou', 'trustno1', 'sunshine',
            'letmein', 'welcome', 'shadow', 'superman', 'michael', 'football',
            'password1', 'password123', 'admin', 'admin123', 'root', 'toor',
            'pass', 'test', 'guest', 'changeme', 'default', 'secret',
            '1234567', '123456789', '1234567890', 'login', 'master123',
        ];

        $users = get_users(['fields' => ['ID', 'user_login', 'user_email', 'user_pass', 'user_registered', 'user_nicename']]);
        $results['users_checked'] = count($users);

        foreach ($users as $user) {
            $user_data = get_userdata($user->ID);
            $roles = $user_data->roles ?? [];

            $pass_hash = $user->user_pass;

            if (strpos($pass_hash, '$P$') === 0 || strpos($pass_hash, '$2y$') === 0) {
                $hash_parts = explode('$', $pass_hash);
                if (count($hash_parts) >= 4) {
                    $cost = intval($hash_parts[3] ?? 0);
                    if ($cost < 12) {
                        $results['old_passwords'][] = [
                            'user_login' => $user->user_login,
                            'hash_type' => strpos($pass_hash, '$P$') === 0 ? 'phpass' : 'bcrypt',
                            'cost' => $cost,
                            'recommendation' => 'Password hash uses weak cost parameter (' . $cost . '). Minimum 12 recommended.',
                        ];
                    }
                }
            }

            $registration_date = strtotime($user->user_registered);
            $account_age_days = (time() - $registration_date) / 86400;
            if ($account_age_days > 365 && empty($user_data->last_login)) {
                $results['old_passwords'][] = [
                    'user_login' => $user->user_login,
                    'reason' => 'Account inactive for over 1 year',
                    'role' => implode(', ', $roles),
                    'registered' => $user->user_registered,
                ];
            }

            if (in_array('administrator', $roles)) {
                $admin_passwords = ['admin', 'password', 'admin123', 'administrator', 'root', '123456', 'password1'];
                foreach ($admin_passwords as $weak) {
                    if (wp_check_password($weak, $pass_hash)) {
                        $results['admin_with_weak'][] = [
                            'user_login' => $user->user_login,
                            'user_email' => $user->user_email,
                            'password' => $weak,
                        ];
                        break;
                    }
                }
            }
        }

        $results['password_recommendations'] = [
            'Use passwords with 12+ characters',
            'Include uppercase, lowercase, numbers, and symbols',
            'Enable two-factor authentication',
            'Use a password manager',
            'Set up login attempt limiting',
            'Regularly rotate application passwords',
            'Disable XML-RPC to prevent brute force',
        ];

        return $results;
    }

    private function run_blocklist_check($url) {
        $host = parse_url($url, PHP_URL_HOST);
        $results = [
            'host' => $host,
            'checked_lists' => [],
            'listed' => false,
            'lists_found_on' => [],
            'safe' => true,
        ];

        $dnsbl_lists = [
            'zen.spamhaus.org' => 'Spamhaus ZEN',
            'bl.spamcop.net' => 'SpamCop',
            'b.barracudacentral.org' => 'Barracuda',
            'dnsbl.sorbs.net' => 'SORBS',
            'spam.dnsbl.sorbs.net' => 'SORBS Spam',
            'dul.dnsbl.sorbs.net' => 'SORBS Dul',
            'dnsbl-1.uceprotect.net' => 'UCEPROTECT L1',
            'dnsbl-2.uceprotect.net' => 'UCEPROTECT L2',
            'dnsbl-3.uceprotect.net' => 'uceprotect L3',
            'cbl.abuseat.org' => 'AbuseAt CBL',
            'dyna.spamrats.com' => 'SpamRats Dyna',
            'noptr.spamrats.com' => 'SpamRats NOPTR',
            'spam.spamrats.com' => 'SpamRats Spam',
            'all.s5h.net' => 'S5H',
            'rbl.interserver.net' => 'InterServer',
            'dynip.rothen.com' => 'Rothen',
            'ips.backscatterer.org' => 'Backscatterer',
            'ix.dnsbl.manitu.net' => 'Manitu',
        ];

        $ip = gethostbyname($host);
        $reversed = implode('.', array_reverse(explode('.', $ip)));

        foreach ($dnsbl_lists as $dnsbl => $name) {
            $lookup = $reversed . '.' . $dnsbl;
            $result = @dns_get_record($lookup, DNS_A);
            $listed = !empty($result);

            $results['checked_lists'][] = [
                'name' => $name,
                'dnsbl' => $dnsbl,
                'listed' => $listed,
            ];

            if ($listed) {
                $results['listed'] = true;
                $results['safe'] = false;
                $results['lists_found_on'][] = $name;
            }
        }

        $malware_domain_lists = [
            'malwaredomainlist.com' => 'Malware Domain List',
            'www.malwaredomains.com' => 'Malware Domains',
        ];

        foreach ($malware_domain_lists as $list => $name) {
            $response = wp_remote_get("https://{$list}/lookups/?host={$host}", ['timeout' => 5]);
            if (!is_wp_error($response)) {
                $body = wp_remote_retrieve_body($response);
                $listed = stripos($body, 'listed') !== false || stripos($body, 'found') !== false;
                $results['checked_lists'][] = [
                    'name' => $name,
                    'dnsbl' => $list,
                    'listed' => $listed,
                ];
                if ($listed) {
                    $results['listed'] = true;
                    $results['safe'] = false;
                    $results['lists_found_on'][] = $name;
                }
            }
        }

        $ip_parts = explode('.', $ip);
        $local_ranges = ['127.', '10.', '192.168.', '172.'];
        $is_local = false;
        foreach ($local_ranges as $range) {
            if (strpos($ip, $range) === 0) { $is_local = true; break; }
        }
        if ($is_local) {
            $results['note'] = 'IP appears to be local/localhost - external blocklist checks may not be meaningful';
        }

        return $results;
    }

    private function run_full_path_disclosure_check($url) {
        $results = [
            'fpd_detected' => false,
            'exposed_paths' => [],
            'tests_performed' => 0,
        ];

        $test_files = [
            '/wp-includes/rss-functions.php',
            '/wp-load.php',
            '/wp-blog-header.php',
            '/wp-settings.php',
            '/wp-config.php',
        ];

        foreach ($test_files as $file) {
            $test_url = $url . $file;
            $response = wp_remote_get($test_url, ['timeout' => 2]);
            if (is_wp_error($response)) continue;

            $results['tests_performed']++;
            $body = wp_remote_retrieve_body($response);

            $fpd_patterns = [
                '/\/home[\w\/]*\/public_html/i',
                '/\/var\/www[\w\/]*/i',
                '/\/usr\/local[\w\/]*/i',
                '/\/var\/html[\w\/]*/i',
                '/\/srv\/www[\w\/]*/i',
                '/Document Root/i',
                '/Fatal error.*in <b>([^<]+)<\/b>/i',
                '/Warning.*in <b>([^<]+)<\/b>/i',
                '/Stack trace/i',
                '/\bABSPATH\b.*=.*[\'"\/]/i',
            ];

            foreach ($fpd_patterns as $pattern) {
                if (preg_match($pattern, $body)) {
                    $results['fpd_detected'] = true;
                    $results['exposed_paths'][] = [
                        'url' => $test_url,
                        'pattern_matched' => $pattern,
                        'preview' => substr($body, 0, 300),
                    ];
                    break;
                }
            }
        }

        $error_trigger_urls = [
            $url . '/wp-content/plugins/nonexistent-plugin-test/file.php',
            $url . '/wp-content/themes/nonexistent-theme-test/functions.php',
        ];

        foreach ($error_trigger_urls as $test_url) {
            $response = wp_remote_get($test_url, ['timeout' => 5]);
            if (is_wp_error($response)) continue;
            $results['tests_performed']++;
            $body = wp_remote_retrieve_body($response);

            if (preg_match('/Document Root.*?:([\w\/]+)/i', $body) || preg_match('/absolute path.*?:([\w\/]+)/i', $body)) {
                $results['fpd_detected'] = true;
                $results['exposed_paths'][] = [
                    'url' => $test_url,
                    'pattern_matched' => 'Full path in error message',
                    'preview' => substr($body, 0, 300),
                ];
            }
        }

        return $results;
    }

    private function run_db_integrity_check() {
        global $wpdb;
        $results = [
            'tables_checked' => 0,
            'tables_with_issues' => [],
            'orphaned_postmeta' => 0,
            'orphaned_comments' => 0,
            'spam_comments' => 0,
            'trash_posts' => 0,
            'duplicate_user_emails' => [],
            'auto_increment_issues' => [],
            'recommendations' => [],
        ];

        $tables = $wpdb->get_results("SHOW TABLES LIKE '{$wpdb->prefix}%'", ARRAY_N);
        foreach ($tables as $table_row) {
            $table_name = $table_row[0];
            $results['tables_checked']++;

            $check = $wpdb->get_row("CHECK TABLE `$table_name` FAST");
            if ($check && isset($check->Msg_text) && $check->Msg_text !== 'OK') {
                $results['tables_with_issues'][] = [
                    'table' => $table_name,
                    'status' => $check->Msg_text,
                ];
            }

            $status = $wpdb->get_row("SHOW TABLE STATUS LIKE '$table_name'");
            if ($status) {
                if ($status->Auto_increment > 1000000) {
                    $results['auto_increment_issues'][] = [
                        'table' => $table_name,
                        'auto_increment' => $status->Auto_increment,
                        'recommendation' => 'Consider optimizing table auto_increment value',
                    ];
                }

                if (isset($status->Data_free) && $status->Data_free > 10485760) {
                    $results['recommendations'][] = "Table {$table_name} has " . round($status->Data_free / 1048576, 1) . "MB of fragmented space. Consider OPTIMIZE TABLE.";
                }
            }
        }

        $results['orphaned_postmeta'] = $wpdb->get_var(
            "SELECT COUNT(*) FROM {$wpdb->postmeta} pm LEFT JOIN {$wpdb->posts} p ON pm.post_id = p.ID WHERE p.ID IS NULL"
        );

        $results['orphaned_comments'] = $wpdb->get_var(
            "SELECT COUNT(*) FROM {$wpdb->comments} c LEFT JOIN {$wpdb->posts} p ON c.comment_post_ID = p.ID WHERE p.ID IS NULL"
        );

        $results['spam_comments'] = $wpdb->get_var(
            "SELECT COUNT(*) FROM {$wpdb->comments} WHERE comment_approved = 'spam'"
        );

        $results['trash_posts'] = $wpdb->get_var(
            "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_status = 'trash'"
        );

        $duplicate_emails = $wpdb->get_results(
            "SELECT user_email, COUNT(*) as cnt FROM {$wpdb->users} GROUP BY user_email HAVING cnt > 1"
        );
        foreach ($duplicate_emails as $dup) {
            $results['duplicate_user_emails'][] = [
                'email' => $dup->user_email,
                'count' => $dup->cnt,
            ];
        }

        if ($results['orphaned_postmeta'] > 0) {
            $results['recommendations'][] = "{$results['orphaned_postmeta']} orphaned postmeta entries found. Run cleanup to improve performance.";
        }
        if ($results['orphaned_comments'] > 0) {
            $results['recommendations'][] = "{$results['orphaned_comments']} orphaned comment entries found.";
        }
        if ($results['spam_comments'] > 100) {
            $results['recommendations'][] = "{$results['spam_comments']} spam comments pending deletion.";
        }

        return $results;
    }

    private function run_dns_security_check($url) {
        $host = parse_url($url, PHP_URL_HOST);
        $results = [
            'host' => $host,
            'dnssec' => false,
            'mx_records' => [],
            'txt_records' => [],
            'spf_found' => false,
            'dmarc_found' => false,
            'dkim_found' => false,
            'caa_found' => false,
            'issues' => [],
        ];

        $dns_records = @dns_get_record($host, DNS_A + DNS_AAAA + DNS_MX + DNS_TXT + DNS_CAA + DNS_NS);
        if (!$dns_records) {
            $dns_records = @dns_get_record($host, DNS_A);
        }

        $txt_records = @dns_get_record($host, DNS_TXT);
        foreach ($txt_records as $rec) {
            $results['txt_records'][] = $rec['txt'] ?? '';
            $txt = strtolower($rec['txt'] ?? '');
            if (strpos($txt, 'v=spf1') === 0) {
                $results['spf_found'] = true;
            }
            if (strpos($txt, 'v=dkim1') === 0 || strpos($txt, 'v=dkim') === 0) {
                $results['dkim_found'] = true;
            }
        }

        $dmarc_records = @dns_get_record('_dmarc.' . $host, DNS_TXT);
        if (!empty($dmarc_records)) {
            $results['dmarc_found'] = true;
        }

        $caa_records = @dns_get_record($host, DNS_CAA);
        if (!empty($caa_records)) {
            $results['caa_found'] = true;
        }

        $mx_records = @dns_get_record($host, DNS_MX);
        foreach ($mx_records as $mx) {
            $results['mx_records'][] = [
                'host' => $mx['target'] ?? '',
                'priority' => $mx['pri'] ?? 0,
            ];
        }

        $ns_records = @dns_get_record($host, DNS_NS);
        $results['nameservers'] = array_map(function($ns) { return $ns['target'] ?? ''; }, $ns_records);

        if (!$results['spf_found']) {
            $results['issues'][] = 'SPF record not found - email spoofing risk';
        }
        if (!$results['dmarc_found']) {
            $results['issues'][] = 'DMARC record not found - email impersonation risk';
        }
        if (!$results['caa_found']) {
            $results['issues'][] = 'CAA record not found - any Certificate Authority can issue certificates';
        }

        return $results;
    }

    private function run_rss_spam_check($url) {
        $results = [
            'feeds_checked' => [],
            'spam_detected' => false,
            'issues' => [],
        ];

        $feed_urls = [
            $url . '/feed/',
            $url . '/comments/feed/',
            $url . '/wp-json/wp/v2/posts',
        ];

        $spam_patterns = [
            '/<a[^>]+href=["\'][^"\']*viagra/i',
            '/<a[^>]+href=["\'][^"\']*casino/i',
            '/<a[^>]+href=["\'][^"\']*pharmacy/i',
            '/<a[^>]+href=["\'][^"\']*loan/i',
            '/<a[^>]+href=["\'][^"\']*payday/i',
            '/<a[^>]+href=["\'][^"\']*crypto.*invest/i',
            '/<script[^>]*>.*<\/script>/is',
            '/<iframe[^>]*src=["\'][^"\']*click/i',
            '/ viagra /i',
            '/ cialis /i',
            '/ pharmacy /i',
            '/ casino online /i',
            '/ bitcoin profit /i',
            '/ earn money fast /i',
            '/ weight loss pill /i',
        ];

        foreach ($feed_urls as $feed_url) {
            $response = wp_remote_get($feed_url, ['timeout' => 10]);
            if (is_wp_error($response)) continue;

            $body = wp_remote_retrieve_body($response);
            $feed_result = [
                'url' => $feed_url,
                'accessible' => true,
                'spam_found' => false,
                'suspicious_patterns' => [],
                'item_count' => 0,
            ];

            if (preg_match_all('/<item|<entry/i', $body, $matches)) {
                $feed_result['item_count'] = count($matches[0]);
            }

            foreach ($spam_patterns as $pattern) {
                if (preg_match($pattern, $body, $m)) {
                    $feed_result['spam_found'] = true;
                    $results['spam_detected'] = true;
                    $feed_result['suspicious_patterns'][] = substr($m[0], 0, 80);
                }
            }

            $results['feeds_checked'][] = $feed_result;

            if ($feed_result['spam_found']) {
                $results['issues'][] = "Spam content detected in feed: {$feed_url}";
            }
        }

        return $results;
    }

    private function run_deprecated_php_check() {
        $results = [
            'files_scanned' => 0,
            'deprecated_usages' => [],
            'total_deprecated_found' => 0,
            'categories' => [
                'removed_functions' => [],
                'deprecated_functions' => [],
                'security_risks' => [],
            ],
        ];

        $deprecated_patterns = [
            'removed_functions' => [
                'weight' => 20,
                'patterns' => [
                    '/\bmysql_connect\s*\(/i' => 'mysql_connect() - Removed in PHP 7.0, use mysqli',
                    '/\bmysql_query\s*\(/i' => 'mysql_query() - Removed in PHP 7.0, use mysqli',
                    '/\bmysql_fetch_array\s*\(/i' => 'mysql_fetch_array() - Removed in PHP 7.0',
                    '/\bmysql_real_escape_string\s*\(/i' => 'mysql_real_escape_string() - Removed in PHP 7.0',
                    '/\bereg\s*\(/i' => 'ereg() - Removed in PHP 7.0, use preg_match()',
                    '/\beregi\s*\(/i' => 'eregi() - Removed in PHP 7.0, use preg_match()',
                    '/\bereg_replace\s*\(/i' => 'ereg_replace() - Removed in PHP 7.0',
                    '/\bsplit\s*\(/i' => 'split() - Removed in PHP 7.0, use explode()',
                    '/\bspliti\s*\(/i' => 'spliti() - Removed in PHP 7.0',
                    '/\bmktime\s*\(\s*0\s*\)/i' => 'mktime() with 0 args deprecated',
                    '/\bcreate_function\s*\(/i' => 'create_function() - Removed in PHP 8.0, use anonymous functions',
                    '/\bget_magic_quotes_gpc\s*\(/i' => 'get_magic_quotes_gpc() - Removed in PHP 7.4',
                    '/\bget_magic_quotes_runtime\s*\(/i' => 'get_magic_quotes_runtime() - Removed in PHP 7.4',
                ],
            ],
            'deprecated_functions' => [
                'weight' => 10,
                'patterns' => [
                    '/\beach\s*\(/i' => 'each() - Deprecated in PHP 7.2',
                    '/\bmoney_format\s*\(/i' => 'money_format() - Removed in PHP 7.4',
                    '/\butf8_encode\s*\(/i' => 'utf8_encode() - Deprecated in PHP 8.2',
                    '/\butf8_decode\s*\(/i' => 'utf8_decode() - Deprecated in PHP 8.2',
                    '/\bfgets\s*\(\s*STDIN/i' => 'Direct STDIN access deprecated pattern',
                ],
            ],
            'security_risks' => [
                'weight' => 25,
                'patterns' => [
                    '/\bserialize\s*\(\s*\$/i' => 'PHP object injection risk: serialize() with user input',
                    '/\bunserialize\s*\(\s*\$/i' => 'PHP object injection risk: unserialize() with user input',
                    '/\bmd5\s*\(\s*\$[a-z]/i' => 'MD5 hashing with variable - use password_hash() instead',
                    '/\bsha1\s*\(\s*\$[a-z]/i' => 'SHA1 hashing with variable - use password_hash() instead',
                    '/\bextract\s*\(\s*\$_/i' => 'Variable injection risk: extract() with superglobal',
                    '/\bpreg_replace\s*\(\s*[\'"]\/[^\/]*e[\'"]/i' => 'Deprecated /e modifier in regex',
                    '/\bvar_dump\s*\(/i' => 'var_dump() found - remove in production',
                    '/\bprint_r\s*\(\s*\$/i' => 'print_r() with variable - potential info leak',
                    '/\bvar_export\s*\(\s*\$/i' => 'var_export() with variable - potential info leak',
                    '/\berror_log\s*\(.+password/i' => 'Passwords logged to error log',
                ],
            ],
        ];

        $scan_dirs = [
            ABSPATH . 'wp-content/plugins/',
            ABSPATH . 'wp-content/themes/',
            ABSPATH . 'wp-includes/',
            ABSPATH . 'wp-admin/',
        ];

        $excluded_plugins = ['wp-waf-firewall1', 'wordfence', 'akismet'];
        $plugin_dir = wp_normalize_path(WAF_FW_PLUGIN_DIR);

        foreach ($scan_dirs as $dir) {
            if (!is_dir($dir)) continue;
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::SELF_FIRST
            );
            foreach ($iterator as $file) {
                if (!$file->isFile()) continue;
                $ext = strtolower($file->getExtension());
                if (!in_array($ext, ['php', 'phtml', 'php5', 'inc'])) continue;
                if ($file->getSize() > 2000000) continue;
                if ($results['files_scanned'] >= 500) break 2;

                $file_path = wp_normalize_path($file->getPathname());
                $skip = false;
                foreach ($excluded_plugins as $ex) {
                    if (strpos($file_path, 'wp-content/plugins/' . $ex . '/') !== false) {
                        $skip = true;
                        break;
                    }
                }
                if ($skip) continue;

                $content = @file_get_contents($file->getPathname());
                if (!$content) continue;

                $stripped = preg_replace('/\'[^\']*\'/', '', $content);
                $stripped = preg_replace('/"[^"]*"/', '', $stripped);
                $stripped = preg_replace('/\/\/.*$/m', '', $stripped);
                $stripped = preg_replace('#/\*.*?\*/#s', '', $stripped);

                $results['files_scanned']++;
                $rel_path = str_replace(ABSPATH, '', $file->getPathname());

                foreach ($deprecated_patterns as $category => $cat_data) {
                    foreach ($cat_data['patterns'] as $pattern => $description) {
                        if (preg_match($pattern, $stripped, $m)) {
                            $results['deprecated_usages'][] = [
                                'file' => $rel_path,
                                'category' => $category,
                                'match' => substr($m[0], 0, 60),
                                'description' => $description,
                            ];
                            $results['categories'][$category][] = $rel_path;
                            $results['total_deprecated_found']++;
                        }
                    }
                }
            }
        }

        return $results;
    }

    private function run_file_permission_audit() {
        $results = [
            'files_checked' => 0,
            'issues' => [],
            'recommendations' => [],
        ];

        $critical_files = [
            'wp-config.php' => ['max' => 0640, 'rec' => 0600, 'description' => 'Main config file'],
            '.htaccess' => ['max' => 0644, 'rec' => 0640, 'description' => 'Apache config'],
        ];

        foreach ($critical_files as $file => $config) {
            $path = ABSPATH . $file;
            if (!file_exists($path)) continue;
            $perms = fileperms($path);
            $octal = $perms & 0777;
            $results['files_checked']++;

            if ($octal > $config['max']) {
                $results['issues'][] = [
                    'file' => $file,
                    'current' => sprintf('%o', $octal),
                    'recommended' => sprintf('%o', $config['rec']),
                    'severity' => 'critical',
                    'description' => $config['description'] . ' has overly permissive permissions (' . sprintf('%o', $octal) . ')',
                ];
            }
        }

        $sensitive_dirs = [
            'wp-content/uploads' => ['max' => 0755, 'rec' => 0750, 'check_php' => true],
            'wp-content/plugins' => ['max' => 0755, 'rec' => 0755, 'check_php' => false],
            'wp-content/themes' => ['max' => 0755, 'rec' => 0755, 'check_php' => false],
            'wp-admin' => ['max' => 0755, 'rec' => 0755, 'check_php' => false],
            'wp-includes' => ['max' => 0755, 'rec' => 0755, 'check_php' => false],
        ];

        foreach ($sensitive_dirs as $dir => $config) {
            $path = ABSPATH . $dir;
            if (!is_dir($path)) continue;
            $perms = fileperms($path);
            $octal = $perms & 0777;
            $results['files_checked']++;

            if ($octal > $config['max']) {
                $results['issues'][] = [
                    'file' => $dir . '/',
                    'current' => sprintf('%o', $octal),
                    'recommended' => sprintf('%o', $config['rec']),
                    'severity' => 'warning',
                    'description' => 'Directory ' . $dir . ' has permissions ' . sprintf('%o', $octal),
                ];
            }

            if ($config['check_php']) {
                $php_test = $path . '/test_' . uniqid() . '.php';
                if (@file_put_contents($php_test, '<?php // test')) {
                    @unlink($php_test);
                    $results['issues'][] = [
                        'file' => $dir . '/',
                        'current' => 'writable',
                        'recommended' => 'no PHP execution',
                        'severity' => 'critical',
                        'description' => 'PHP files can be created in ' . $dir . ' - potential code execution risk',
                    ];
                }
            }
        }

        $results['recommendations'] = [
            'wp-config.php should be 600 or 640',
            '.htaccess should be 640 or 644',
            'wp-content/uploads should be 750 or 755',
            'Upload directories should block PHP execution',
        ];

        return $results;
    }

    private function run_server_fingerprint($url) {
        $results = [
            'server_software' => 'Unknown',
            'php_version' => 'Unknown',
            'os_detected' => false,
            'technology_stack' => [],
            'information_disclosure' => [],
            'issues' => [],
        ];

        $headers = @get_headers($url, 1);
        if ($headers) {
            $h = array_change_key_case($headers, CASE_LOWER);

            if (isset($h['server'])) {
                $results['server_software'] = $h['server'];
                $results['information_disclosure'][] = 'Server header reveals: ' . $h['server'];
                $results['issues'][] = 'Server software disclosed via HTTP header';
            }

            if (isset($h['x-powered-by'])) {
                $results['technology_stack'][] = 'X-Powered-By: ' . $h['x-powered-by'];
                $results['information_disclosure'][] = 'Technology disclosed: ' . $h['x-powered-by'];
                $results['issues'][] = 'Technology stack disclosed via X-Powered-By header';
            }

            if (isset($h['x-aspnet-version'])) {
                $results['technology_stack'][] = 'ASP.NET: ' . $h['x-aspnet-version'];
                $results['information_disclosure'][] = 'ASP.NET version disclosed';
            }

            if (isset($h['x-drupal-cache'])) {
                $results['technology_stack'][] = 'Drupal detected';
            }

            if (isset($h['cf-ray']) || isset($h['cf-cache-status'])) {
                $results['technology_stack'][] = 'Cloudflare CDN detected';
            }

            if (isset($h['x-amz-cf-id']) || isset($h['x-amz-cf-pop'])) {
                $results['technology_stack'][] = 'Amazon CloudFront detected';
            }

            if (isset($h['x-generator'])) {
                $results['technology_stack'][] = 'Generator: ' . $h['x-generator'];
                $results['information_disclosure'][] = 'CMS generator disclosed';
            }
        }

        $results['php_version'] = phpversion();

        $waf_headers = ['x-waf', 'x-firewall', 'x-sucuri-id', 'x-sucuri-cache', 'x-cdn'];
        foreach ($waf_headers as $wh) {
            if (isset($h[$wh])) {
                $results['technology_stack'][] = 'WAF/CDN header: ' . $wh . ' = ' . $h[$wh];
            }
        }

        $error_page_url = $url . '/nonexistent_test_page_' . uniqid() . '.html';
        $error_response = wp_remote_get($error_page_url, ['timeout' => 5]);
        if (!is_wp_error($error_response)) {
            $error_body = wp_remote_retrieve_body($error_response);
            $error_code = wp_remote_retrieve_response_code($error_response);

            if ($error_code === 200 || strpos($error_body, '404') !== false) {
                $results['issues'][] = 'Custom error pages may expose server information';
            }

            if (preg_match('/Apache\/([\d.]+)/i', $error_body, $m)) {
                $results['server_software'] = 'Apache ' . $m[1];
                $results['information_disclosure'][] = 'Apache version leaked via error page';
            }
            if (preg_match('/nginx\/([\d.]+)/i', $error_body, $m)) {
                $results['server_software'] = 'Nginx ' . $m[1];
                $results['information_disclosure'][] = 'Nginx version leaked via error page';
            }
            if (preg_match('/PHP\/([\d.]+)/i', $error_body, $m)) {
                $results['php_version'] = $m[1];
                $results['information_disclosure'][] = 'PHP version leaked via error page';
            }
        }

        $results['total_disclosures'] = count($results['information_disclosure']);
        return $results;
    }

    private function run_config_exposure_check($url) {
        $results = [
            'exposed_files' => [],
            'total_exposed' => 0,
            'severity_breakdown' => ['critical' => 0, 'warning' => 0, 'info' => 0],
        ];

        $sensitive_files = [
            ['path' => '/.env', 'severity' => 'critical', 'desc' => 'Environment configuration file'],
            ['path' => '/.env.bak', 'severity' => 'critical', 'desc' => 'Environment backup file'],
            ['path' => '/.env.local', 'severity' => 'critical', 'desc' => 'Local environment file'],
            ['path' => '/.env.production', 'severity' => 'critical', 'desc' => 'Production environment file'],
            ['path' => '/wp-config.php.bak', 'severity' => 'critical', 'desc' => 'WordPress config backup'],
            ['path' => '/wp-config.php.save', 'severity' => 'critical', 'desc' => 'WordPress config save file'],
            ['path' => '/wp-config.php.old', 'severity' => 'critical', 'desc' => 'WordPress config old file'],
            ['path' => '/wp-config.php.orig', 'severity' => 'critical', 'desc' => 'WordPress config original file'],
            ['path' => '/wp-config.php~', 'severity' => 'critical', 'desc' => 'WordPress config backup (tilde)'],
            ['path' => '/wp-config.bak', 'severity' => 'critical', 'desc' => 'WordPress config backup'],
            ['path' => '/wp-config.txt', 'severity' => 'critical', 'desc' => 'WordPress config text file'],
            ['path' => '/wp-config.php.swp', 'severity' => 'critical', 'desc' => 'WordPress config vim swap'],
            ['path' => '/wp-config.php.dist', 'severity' => 'info', 'desc' => 'WordPress config distribution'],
            ['path' => '/wp-config-sample.php', 'severity' => 'info', 'desc' => 'WordPress sample config'],
            ['path' => '/readme.html', 'severity' => 'warning', 'desc' => 'WordPress readme with version info'],
            ['path' => '/license.txt', 'severity' => 'info', 'desc' => 'WordPress license file'],
            ['path' => '/debug.log', 'severity' => 'critical', 'desc' => 'WordPress debug log'],
            ['path' => '/wp-content/debug.log', 'severity' => 'critical', 'desc' => 'WordPress debug log in content'],
            ['path' => '/composer.json', 'severity' => 'warning', 'desc' => 'Composer configuration file'],
            ['path' => '/composer.lock', 'severity' => 'warning', 'desc' => 'Composer lock file'],
            ['path' => '/package.json', 'severity' => 'info', 'desc' => 'NPM package file'],
            ['path' => '/package-lock.json', 'severity' => 'info', 'desc' => 'NPM lock file'],
            ['path' => '/.git/HEAD', 'severity' => 'critical', 'desc' => 'Git repository exposed'],
            ['path' => '/.git/config', 'severity' => 'critical', 'desc' => 'Git config exposed'],
            ['path' => '/.svn/entries', 'severity' => 'critical', 'desc' => 'SVN repository exposed'],
            ['path' => '/.DS_Store', 'severity' => 'warning', 'desc' => 'macOS directory metadata'],
            ['path' => '/web.config', 'severity' => 'info', 'desc' => 'IIS web config file'],
            ['path' => '/.htpasswd', 'severity' => 'critical', 'desc' => 'Apache password file'],
            ['path' => '/phpinfo.php', 'severity' => 'critical', 'desc' => 'PHP info file'],
            ['path' => '/info.php', 'severity' => 'critical', 'desc' => 'PHP info file'],
            ['path' => '/test.php', 'severity' => 'warning', 'desc' => 'Test PHP file'],
            ['path' => '/phpmyadmin/', 'severity' => 'critical', 'desc' => 'phpMyAdmin interface'],
            ['path' => '/adminer.php', 'severity' => 'critical', 'desc' => 'Adminer database tool'],
            ['path' => '/backup/', 'severity' => 'critical', 'desc' => 'Backup directory'],
            ['path' => '/backups/', 'severity' => 'critical', 'desc' => 'Backups directory'],
            ['path' => '/db/', 'severity' => 'warning', 'desc' => 'Database directory'],
            ['path' => '/sql/', 'severity' => 'warning', 'desc' => 'SQL directory'],
            ['path' => '/dump.sql', 'severity' => 'critical', 'desc' => 'Database dump file'],
            ['path' => '/database.sql', 'severity' => 'critical', 'desc' => 'Database dump file'],
            ['path' => '/wp-content/uploads/', 'severity' => 'info', 'desc' => 'Uploads directory index'],
        ];

        foreach ($sensitive_files as $file_check) {
            $test_url = $url . $file_check['path'];
            $response = wp_remote_head($test_url, ['timeout' => 5, 'redirection' => 0]);
            if (is_wp_error($response)) continue;

            $code = wp_remote_retrieve_response_code($response);
            if (in_array($code, [200, 301, 302, 303, 307, 308, 403])) {
                if ($code === 403 && !in_array($file_check['severity'], ['critical'])) {
                    $file_check['severity'] = 'info';
                    $file_check['desc'] .= ' (403 Forbidden - protected)';
                }

                $results['exposed_files'][] = [
                    'path' => $file_check['path'],
                    'url' => $test_url,
                    'status' => $code,
                    'severity' => $file_check['severity'],
                    'description' => $file_check['desc'],
                ];
                $results['total_exposed']++;
                $results['severity_breakdown'][$file_check['severity']]++;
            }
        }

        return $results;
    }

    private function run_known_files_check() {
        global $wp_version;
        $results = [
            'wp_version' => $wp_version,
            'unknown_files' => [],
            'modified_core_files' => [],
            'suspicious_new_files' => [],
            'total_unknown' => 0,
            'checksums_available' => false,
        ];

        $known_checksums = $this->get_core_checksums();
        if (empty($known_checksums)) {
            $results['checksums_available'] = false;
            return $results;
        }

        $results['checksums_available'] = true;

        $core_dirs = [ABSPATH . 'wp-admin/', ABSPATH . 'wp-includes/'];
        foreach ($core_dirs as $dir) {
            if (!is_dir($dir)) continue;
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::SELF_FIRST
            );
            foreach ($iterator as $file) {
                if (!$file->isFile()) continue;
                $rel_path = str_replace(ABSPATH, '', $file->getPathname());
                $rel_path = ltrim(str_replace('\\', '/', $rel_path), '/');

                if (isset($known_checksums[$rel_path])) {
                    $actual = hash_file('md5', $file->getPathname());
                    if ($known_checksums[$rel_path] !== $actual) {
                        $results['modified_core_files'][] = [
                            'file' => $rel_path,
                            'expected' => $known_checksums[$rel_path],
                            'actual' => $actual,
                            'size' => $file->getSize(),
                        ];
                    }
                } else {
                    $ext = strtolower(pathinfo($rel_path, PATHINFO_EXTENSION));
                    if (in_array($ext, ['php', 'phtml', 'inc', 'js'])) {
                        $results['unknown_files'][] = [
                            'file' => $rel_path,
                            'size' => $file->getSize(),
                            'modified' => date('Y-m-d H:i:s', $file->getMTime()),
                        ];
                    }
                }
            }
        }

        $plugin_manifest = @wp_remote_get('https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&slug=all', ['timeout' => 5]);

        $results['total_unknown'] = count($results['unknown_files']);
        $results['total_modified'] = count($results['modified_core_files']);

        return $results;
    }
}
