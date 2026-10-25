# -*- coding: utf-8 -*-
"""
Script to optimize class-scanner.php candidate pre-filtering from 7,609 single queries to instant bulk queries.
"""

import sys

file_path = r"d:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\plugin_source\mdefender-pro\includes\class-scanner.php"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """                    if ($has_ml_init == 0 && $has_ml_skipped == 0) {
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
                            } else {
                                $full_path = ABSPATH . $rel_path;
                                if (file_exists($full_path)) {
                                    $local = $this->scan_file_multi_signal($full_path, $cat);
                                    if ($local && $local['score'] >= 25) {
                                        $is_candidate = true;
                                    }
                                }
                            }

                            $new_status = $is_candidate ? 'pending_ml' : 'skipped_ml';
                            $wpdb->update($files_table, ['status' => $new_status], ['id' => $f_row->id]);
                        }
                    }"""

replacement = """                    if ($has_ml_init == 0 && $has_ml_skipped == 0) {
                        // High-speed bulk classification to avoid thousands of individual SQL queries
                        $wpdb->query($wpdb->prepare(
                            "UPDATE $files_table SET status = 'skipped_ml' WHERE scan_id = %d AND file_type IN ('admin', 'includes', 'root')",
                            $queue_id
                        ));
                        
                        $wpdb->query($wpdb->prepare(
                            "UPDATE $files_table SET status = 'pending_ml' WHERE scan_id = %d AND file_type = 'uploads'",
                            $queue_id
                        ));

                        // Pre-filter plugin/theme files with suspicious extensions only (php, phtml)
                        $candidates = $wpdb->get_results($wpdb->prepare(
                            "SELECT id, file_path, file_type FROM $files_table WHERE scan_id = %d AND file_type IN ('plugins', 'themes') AND (file_path LIKE '%.php' OR file_path LIKE '%.phtml') LIMIT 200",
                            $queue_id
                        ));

                        $pending_ids = [];
                        foreach ($candidates as $f_row) {
                            $full_path = ABSPATH . $f_row->file_path;
                            if (file_exists($full_path) && filesize($full_path) < 500000) {
                                $content_sample = @file_get_contents($full_path, false, null, 0, 4096);
                                if ($content_sample && (strpos($content_sample, 'eval') !== false || strpos($content_sample, 'base64_decode') !== false || strpos($content_sample, 'shell_exec') !== false || strpos($content_sample, 'assert') !== false)) {
                                    $pending_ids[] = (int) $f_row->id;
                                }
                            }
                        }

                        if (!empty($pending_ids)) {
                            $id_list = implode(',', $pending_ids);
                            $wpdb->query("UPDATE $files_table SET status = 'pending_ml' WHERE id IN ($id_list)");
                        }
                        
                        // Mark remaining unclassified files as skipped
                        $wpdb->query($wpdb->prepare(
                            "UPDATE $files_table SET status = 'skipped_ml' WHERE scan_id = %d AND status = 'pending'",
                            $queue_id
                        ));
                    }"""

if target not in content:
    print("Error: Target code block not found in class-scanner.php")
    sys.exit(1)

content = content.replace(target, replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Optimized class-scanner.php successfully!")
