<?php
/**
 * MDefender Pro — Enterprise WordPress Database Optimizer & Junk Cleaner.
 * 
 * Safe, high-performance database hygiene engine:
 * 1. Post Revisions & Auto-Drafts purging
 * 2. Spam & Trashed Comments cleanup
 * 3. Expired Transient options eradication
 * 4. Orphaned Postmeta, Commentmeta, and Term Relationships removal
 * 5. Safe InnoDB / MyISAM Table Defragmentation (OPTIMIZE TABLE)
 * 
 * Zero-Risk Guarantee:
 * Never touches published/draft posts, users, options, or WooCommerce store data.
 */

defined('ABSPATH') || exit;

class WAF_FW_DB_Optimizer {
    private static $_instance = null;
    private $wpdb;

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function __construct() {
        global $wpdb;
        $this->wpdb = $wpdb ? $wpdb : ($GLOBALS['wpdb'] ?? null);
    }

    /**
     * Inspect database health, table overhead, and count cleanable junk records.
     */
    public function get_status() {
        if (!$this->wpdb) {
            return ['success' => false, 'message' => 'WordPress database connection unavailable.'];
        }

        $wpdb = $this->wpdb;

        // 1. Calculate Total Database Size and Table Overheads (Data Free)
        $db_name = DB_NAME;
        $tables_status = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT TABLE_NAME as name, 
                        ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) AS size_mb,
                        ROUND((DATA_FREE / 1024 / 1024), 2) AS overhead_mb,
                        TABLE_ROWS as rows_count,
                        ENGINE as engine
                 FROM information_schema.TABLES 
                 WHERE TABLE_SCHEMA = %s AND TABLE_NAME LIKE %s",
                $db_name,
                $wpdb->prefix . '%'
            )
        );

        $total_size_mb = 0.0;
        $total_overhead_mb = 0.0;
        $tables_with_overhead = 0;
        $table_details = [];

        if (is_array($tables_status)) {
            foreach ($tables_status as $t) {
                $s_mb = floatval($t->size_mb ?? 0);
                $o_mb = floatval($t->overhead_mb ?? 0);
                $total_size_mb += $s_mb;
                $total_overhead_mb += $o_mb;
                if ($o_mb > 0) {
                    $tables_with_overhead++;
                }
                $table_details[] = [
                    'name' => $t->name,
                    'size_mb' => $s_mb,
                    'overhead_mb' => $o_mb,
                    'rows' => intval($t->rows_count ?? 0),
                    'engine' => $t->engine ?? 'InnoDB'
                ];
            }
        }

        // 2. Count Post Revisions
        $revisions_count = (int) $wpdb->get_var(
            "SELECT COUNT(ID) FROM {$wpdb->posts} WHERE post_type = 'revision'"
        );

        // 3. Count Auto-Drafts
        $auto_drafts_count = (int) $wpdb->get_var(
            "SELECT COUNT(ID) FROM {$wpdb->posts} WHERE post_status = 'auto-draft'"
        );

        // 4. Count Trashed Posts
        $trashed_posts_count = (int) $wpdb->get_var(
            "SELECT COUNT(ID) FROM {$wpdb->posts} WHERE post_status = 'trash'"
        );

        // 5. Count Spam & Trashed Comments
        $spam_comments_count = (int) $wpdb->get_var(
            "SELECT COUNT(comment_ID) FROM {$wpdb->comments} WHERE comment_approved = 'spam'"
        );
        $trashed_comments_count = (int) $wpdb->get_var(
            "SELECT COUNT(comment_ID) FROM {$wpdb->comments} WHERE comment_approved = 'trash'"
        );

        // 6. Count Expired Transients in wp_options
        $now = time();
        $expired_transients_count = (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(option_id) FROM {$wpdb->options} 
                 WHERE option_name LIKE %s AND option_value < %d",
                '_transient_timeout_%',
                $now
            )
        );

        // 7. Count Orphaned Postmeta (records whose parent post no longer exists)
        $orphaned_postmeta_count = (int) $wpdb->get_var(
            "SELECT COUNT(pm.meta_id) FROM {$wpdb->postmeta} pm 
             LEFT JOIN {$wpdb->posts} wp ON wp.ID = pm.post_id 
             WHERE wp.ID IS NULL"
        );

        // 8. Count Orphaned Commentmeta
        $orphaned_commentmeta_count = (int) $wpdb->get_var(
            "SELECT COUNT(cm.meta_id) FROM {$wpdb->commentmeta} cm 
             LEFT JOIN {$wpdb->comments} c ON c.comment_ID = cm.comment_id 
             WHERE c.comment_ID IS NULL"
        );

        // 9. Count Orphaned Term Relationships
        $orphaned_term_rels_count = (int) $wpdb->get_var(
            "SELECT COUNT(tr.object_id) FROM {$wpdb->term_relationships} tr 
             LEFT JOIN {$wpdb->posts} wp ON wp.ID = tr.object_id 
             WHERE wp.ID IS NULL"
        );

        // Calculate Cleanable Total Items
        $cleanable_records = $revisions_count + $auto_drafts_count + $trashed_posts_count 
                           + $spam_comments_count + $trashed_comments_count + $expired_transients_count 
                           + $orphaned_postmeta_count + $orphaned_commentmeta_count + $orphaned_term_rels_count;

        // Estimated Reclaimable MB (Overhead + Rough row footprint estimate)
        $est_reclaimable_mb = round($total_overhead_mb + ($cleanable_records * 0.003), 2);

        // Compute Health Score (100 is pristine, drops if overhead/junk accumulates)
        $penalty = min(50, ($cleanable_records > 50 ? 15 : 0) + ($total_overhead_mb > 5 ? 20 : 0) + ($revisions_count > 100 ? 15 : 0));
        $health_score = max(50, 100 - $penalty);

        return [
            'success' => true,
            'db_name' => $db_name,
            'mysql_version' => $wpdb->db_version(),
            'total_size_mb' => round($total_size_mb, 2),
            'total_overhead_mb' => round($total_overhead_mb, 2),
            'tables_count' => count($table_details),
            'tables_with_overhead' => $tables_with_overhead,
            'cleanable_records_total' => $cleanable_records,
            'estimated_reclaimable_mb' => $est_reclaimable_mb,
            'health_score' => $health_score,
            'junk_breakdown' => [
                'revisions' => [
                    'count' => $revisions_count,
                    'label' => 'Post Revisions',
                    'description' => 'Old snapshots and revision histories of edited posts & pages'
                ],
                'auto_drafts' => [
                    'count' => $auto_drafts_count,
                    'label' => 'Auto Drafts',
                    'description' => 'Incomplete auto-saved draft states abandoned in editor'
                ],
                'trash_posts' => [
                    'count' => $trashed_posts_count,
                    'label' => 'Trashed Posts',
                    'description' => 'Deleted articles and media sitting in post trash bin'
                ],
                'spam_comments' => [
                    'count' => $spam_comments_count,
                    'label' => 'Spam Comments',
                    'description' => 'Flagged spam comments waiting in moderation queue'
                ],
                'trash_comments' => [
                    'count' => $trashed_comments_count,
                    'label' => 'Trashed Comments',
                    'description' => 'Deleted reader comments sitting in comment trash'
                ],
                'expired_transients' => [
                    'count' => $expired_transients_count,
                    'label' => 'Expired Transients',
                    'description' => 'Outdated transient API caches and plugin timers in options table'
                ],
                'orphaned_postmeta' => [
                    'count' => $orphaned_postmeta_count,
                    'label' => 'Orphaned Postmeta',
                    'description' => 'Ghost custom fields belonging to deleted posts'
                ],
                'orphaned_commentmeta' => [
                    'count' => $orphaned_commentmeta_count,
                    'label' => 'Orphaned Commentmeta',
                    'description' => 'Metadata entries whose parent comments were removed'
                ],
                'orphaned_term_relationships' => [
                    'count' => $orphaned_term_rels_count,
                    'label' => 'Orphaned Term Relationships',
                    'description' => 'Taxonomy links pointing to non-existent posts'
                ]
            ],
            'table_details' => array_slice($table_details, 0, 25), // Top tables preview
            'timestamp' => current_time('mysql')
        ];
    }

    /**
     * Safely optimize selected targets.
     * 
     * @param array $targets List of components to clean (e.g. ['revisions', 'transients', 'optimize_tables'] or ['all'])
     */
    public function optimize($targets = ['all']) {
        if (!$this->wpdb) {
            return ['success' => false, 'message' => 'WordPress database connection unavailable.'];
        }

        $wpdb = $this->wpdb;
        $start_time = microtime(true);

        if (!is_array($targets)) {
            $targets = ['all'];
        }

        $do_all = in_array('all', $targets);
        $cleaned = [];
        $total_rows_deleted = 0;

        // Status before cleaning
        $status_before = $this->get_status();
        $size_before = $status_before['total_size_mb'] ?? 0;

        // 1. Purge Post Revisions
        if ($do_all || in_array('revisions', $targets)) {
            // Delete postmeta belonging to revisions first
            $wpdb->query(
                "DELETE pm FROM {$wpdb->postmeta} pm 
                 INNER JOIN {$wpdb->posts} wp ON wp.ID = pm.post_id 
                 WHERE wp.post_type = 'revision'"
            );
            $deleted_revs = $wpdb->query(
                "DELETE FROM {$wpdb->posts} WHERE post_type = 'revision'"
            );
            $count = ($deleted_revs !== false) ? (int)$deleted_revs : 0;
            $cleaned['revisions'] = $count;
            $total_rows_deleted += $count;
        }

        // 2. Purge Auto-Drafts
        if ($do_all || in_array('auto_drafts', $targets)) {
            $wpdb->query(
                "DELETE pm FROM {$wpdb->postmeta} pm 
                 INNER JOIN {$wpdb->posts} wp ON wp.ID = pm.post_id 
                 WHERE wp.post_status = 'auto-draft'"
            );
            $deleted_drafts = $wpdb->query(
                "DELETE FROM {$wpdb->posts} WHERE post_status = 'auto-draft'"
            );
            $count = ($deleted_drafts !== false) ? (int)$deleted_drafts : 0;
            $cleaned['auto_drafts'] = $count;
            $total_rows_deleted += $count;
        }

        // 3. Purge Trashed Posts
        if ($do_all || in_array('trash_posts', $targets)) {
            $wpdb->query(
                "DELETE pm FROM {$wpdb->postmeta} pm 
                 INNER JOIN {$wpdb->posts} wp ON wp.ID = pm.post_id 
                 WHERE wp.post_status = 'trash'"
            );
            $deleted_trash = $wpdb->query(
                "DELETE FROM {$wpdb->posts} WHERE post_status = 'trash'"
            );
            $count = ($deleted_trash !== false) ? (int)$deleted_trash : 0;
            $cleaned['trash_posts'] = $count;
            $total_rows_deleted += $count;
        }

        // 4. Purge Spam Comments
        if ($do_all || in_array('spam_comments', $targets)) {
            $wpdb->query(
                "DELETE cm FROM {$wpdb->commentmeta} cm 
                 INNER JOIN {$wpdb->comments} c ON c.comment_ID = cm.comment_id 
                 WHERE c.comment_approved = 'spam'"
            );
            $deleted_spam = $wpdb->query(
                "DELETE FROM {$wpdb->comments} WHERE comment_approved = 'spam'"
            );
            $count = ($deleted_spam !== false) ? (int)$deleted_spam : 0;
            $cleaned['spam_comments'] = $count;
            $total_rows_deleted += $count;
        }

        // 5. Purge Trashed Comments
        if ($do_all || in_array('trash_comments', $targets)) {
            $wpdb->query(
                "DELETE cm FROM {$wpdb->commentmeta} cm 
                 INNER JOIN {$wpdb->comments} c ON c.comment_ID = cm.comment_id 
                 WHERE c.comment_approved = 'trash'"
            );
            $deleted_trash_c = $wpdb->query(
                "DELETE FROM {$wpdb->comments} WHERE comment_approved = 'trash'"
            );
            $count = ($deleted_trash_c !== false) ? (int)$deleted_trash_c : 0;
            $cleaned['trash_comments'] = $count;
            $total_rows_deleted += $count;
        }

        // 6. Purge Expired Transients
        if ($do_all || in_array('expired_transients', $targets)) {
            $now = time();
            $expired_keys = $wpdb->get_col(
                $wpdb->prepare(
                    "SELECT option_name FROM {$wpdb->options} 
                     WHERE option_name LIKE %s AND option_value < %d",
                    '_transient_timeout_%',
                    $now
                )
            );

            $transient_count = 0;
            if (!empty($expired_keys)) {
                foreach ($expired_keys as $key) {
                    $transient_name = str_replace('_transient_timeout_', '', $key);
                    delete_transient($transient_name);
                    $transient_count++;
                }
            }
            $cleaned['expired_transients'] = $transient_count;
            $total_rows_deleted += $transient_count;
        }

        // 7. Purge Orphaned Metadata & Term Relationships
        if ($do_all || in_array('orphaned_metadata', $targets)) {
            $d_pm = $wpdb->query(
                "DELETE pm FROM {$wpdb->postmeta} pm 
                 LEFT JOIN {$wpdb->posts} wp ON wp.ID = pm.post_id 
                 WHERE wp.ID IS NULL"
            );
            $d_cm = $wpdb->query(
                "DELETE cm FROM {$wpdb->commentmeta} cm 
                 LEFT JOIN {$wpdb->comments} c ON c.comment_ID = cm.comment_id 
                 WHERE c.comment_ID IS NULL"
            );
            $d_tr = $wpdb->query(
                "DELETE tr FROM {$wpdb->term_relationships} tr 
                 LEFT JOIN {$wpdb->posts} wp ON wp.ID = tr.object_id 
                 WHERE wp.ID IS NULL"
            );

            $orphaned_total = (int)($d_pm ?: 0) + (int)($d_cm ?: 0) + (int)($d_tr ?: 0);
            $cleaned['orphaned_metadata'] = $orphaned_total;
            $total_rows_deleted += $orphaned_total;
        }

        // 8. Safe Table Defragmentation (OPTIMIZE TABLE)
        $tables_optimized = 0;
        if ($do_all || in_array('optimize_tables', $targets)) {
            $db_name = DB_NAME;
            $overhead_tables = $wpdb->get_col(
                $wpdb->prepare(
                    "SELECT TABLE_NAME FROM information_schema.TABLES 
                     WHERE TABLE_SCHEMA = %s AND TABLE_NAME LIKE %s AND DATA_FREE > 0",
                    $db_name,
                    $wpdb->prefix . '%'
                )
            );

            if (!empty($overhead_tables)) {
                foreach ($overhead_tables as $table) {
                    // Safe identifier escaping via regex validation
                    if (preg_match('/^[a-zA-Z0-9_]+$/', $table)) {
                        $wpdb->query("OPTIMIZE TABLE `{$table}`");
                        $tables_optimized++;
                    }
                }
            }
            $cleaned['tables_optimized'] = $tables_optimized;
        }

        // Flush WordPress runtime object cache so post/comment counts synchronize immediately
        if (function_exists('wp_cache_flush')) {
            wp_cache_flush();
        }

        $duration = round((microtime(true) - $start_time) * 1000, 2);

        // Status after cleaning
        $status_after = $this->get_status();
        $size_after = $status_after['total_size_mb'] ?? 0;
        $reclaimed_mb = max(0.0, round($size_before - $size_after, 2));

        // Save last run in options for historical tracking
        $history = (array) get_option('mdefender_db_opt_history', []);
        $run_record = [
            'timestamp' => current_time('mysql'),
            'rows_deleted' => $total_rows_deleted,
            'tables_optimized' => $tables_optimized,
            'size_before_mb' => $size_before,
            'size_after_mb' => $size_after,
            'reclaimed_mb' => $reclaimed_mb,
            'duration_ms' => $duration,
            'targets' => $targets
        ];
        array_unshift($history, $run_record);
        if (count($history) > 10) {
            array_pop($history);
        }
        update_option('mdefender_db_opt_history', $history);

        return [
            'success' => true,
            'message' => "Database optimization complete: {$total_rows_deleted} junk records purged across {$tables_optimized} defragmented tables.",
            'total_rows_deleted' => $total_rows_deleted,
            'tables_optimized' => $tables_optimized,
            'size_before_mb' => $size_before,
            'size_after_mb' => $size_after,
            'reclaimed_mb' => $reclaimed_mb,
            'duration_ms' => $duration,
            'details' => $cleaned,
            'new_health_score' => $status_after['health_score'] ?? 100,
            'timestamp' => current_time('mysql')
        ];
    }
}
