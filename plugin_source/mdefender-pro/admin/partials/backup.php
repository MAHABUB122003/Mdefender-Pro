<?php
defined('ABSPATH') || exit;

$engine = WAF_FW_Backup_Engine::instance();
$backups = $engine->get_backups();

$total_backups = count($backups);
$total_size = 0;
foreach ($backups as $b) {
    $total_size += ($b['size'] ?? 0);
}

$last_backup = !empty($backups) ? $backups[0] : null;
$sched_enabled = get_option('waf_fw_backup_sched_enabled', 'no') === 'yes';
$sched_freq = get_option('waf_fw_backup_sched_freq', 'daily');
$sched_type = get_option('waf_fw_backup_sched_type', 'full');
$retention = (int) get_option('waf_fw_backup_retention', 5);

$has_zip = class_exists('ZipArchive');
$nonce = wp_create_nonce('waf_fw_ajax');
$download_nonce = wp_create_nonce('waf_fw_download_backup');
?>

<div class="mdf-backup-container">
    <!-- 1. Hero Header -->
    <div class="mdf-backup-hero">
        <div class="mdf-backup-hero-left">
            <div class="mdf-backup-badge">
                <span class="dashicons dashicons-shield"></span>
                <span>DISASTER RECOVERY &bull; ENTERPRISE BACKUP</span>
            </div>
            <h1 class="mdf-backup-title">Site Backup &amp; 1-Click Disaster Recovery</h1>
            <p class="mdf-backup-subtitle">
                Create complete snapshots of your WordPress database and files. In the event of a security breach, plugin conflict, or broken update, restore your website to a healthy state in 1-click.
            </p>
        </div>
        <div class="mdf-backup-hero-actions">
            <button type="button" class="mdf-btn mdf-btn-emerald" id="mdfOpenCreateBackupModal">
                <span class="dashicons dashicons-backup"></span>
                <span>Create Backup Now</span>
            </button>
            <button type="button" class="mdf-btn mdf-btn-outline" id="mdfTabBtnUpload">
                <span class="dashicons dashicons-upload"></span>
                <span>Upload Archive</span>
            </button>
            <button type="button" class="mdf-btn mdf-btn-ghost" id="mdfRefreshBackups" title="Refresh list">
                <span class="dashicons dashicons-update"></span>
                <span>Refresh</span>
            </button>
        </div>
    </div>

    <!-- 2. KPI Telemetry Row -->
    <div class="mdf-backup-kpi-grid">
        <div class="mdf-bkpi-card">
            <div class="mdf-bkpi-icon icon-emerald">
                <span class="dashicons dashicons-database"></span>
            </div>
            <div class="mdf-bkpi-info">
                <span class="mdf-bkpi-label">Stored Backups</span>
                <strong class="mdf-bkpi-val" id="mdfKpiCount"><?php echo esc_html($total_backups); ?> Archives</strong>
                <span class="mdf-bkpi-sub" id="mdfKpiSize"><?php echo size_format($total_size, 2); ?> Total Storage</span>
            </div>
        </div>

        <div class="mdf-bkpi-card">
            <div class="mdf-bkpi-icon icon-indigo">
                <span class="dashicons dashicons-clock"></span>
            </div>
            <div class="mdf-bkpi-info">
                <span class="mdf-bkpi-label">Latest Snapshot</span>
                <strong class="mdf-bkpi-val">
                    <?php echo $last_backup ? esc_html($last_backup['created_at']) : 'No backups yet'; ?>
                </strong>
                <span class="mdf-bkpi-sub">
                    <?php echo $last_backup ? ucfirst(esc_html($last_backup['type'])) . ' Snapshot (' . esc_html($last_backup['size_formatted']) . ')' : 'Create your first backup'; ?>
                </span>
            </div>
        </div>

        <div class="mdf-bkpi-card">
            <div class="mdf-bkpi-icon icon-purple">
                <span class="dashicons dashicons-calendar-alt"></span>
            </div>
            <div class="mdf-bkpi-info">
                <span class="mdf-bkpi-label">Automated Schedule</span>
                <strong class="mdf-bkpi-val <?php echo $sched_enabled ? 'mdf-text-emerald' : ''; ?>">
                    <?php echo $sched_enabled ? '● Active (' . ucfirst(esc_html($sched_freq)) . ')' : 'Disabled'; ?>
                </strong>
                <span class="mdf-bkpi-sub">Retention: Keep last <?php echo esc_html($retention); ?> backups</span>
            </div>
        </div>

        <div class="mdf-bkpi-card">
            <div class="mdf-bkpi-icon icon-blue">
                <span class="dashicons dashicons-admin-generic"></span>
            </div>
            <div class="mdf-bkpi-info">
                <span class="mdf-bkpi-label">Engine Capabilities</span>
                <strong class="mdf-bkpi-val">ZipArchive: <?php echo $has_zip ? 'Enabled' : 'Missing'; ?></strong>
                <span class="mdf-bkpi-sub">Storage: <code>wp-content/mdefender-backups/</code></span>
            </div>
        </div>
    </div>

    <!-- 3. Navigation Tabs -->
    <div class="mdf-backup-tabs-nav">
        <button type="button" class="mdf-backup-tab active" data-tab="mdf-tab-backups">
            <span class="dashicons dashicons-list-view"></span>
            <span>Backup Archives (<?php echo esc_html($total_backups); ?>)</span>
        </button>
        <button type="button" class="mdf-backup-tab" data-tab="mdf-tab-create">
            <span class="dashicons dashicons-plus-alt2"></span>
            <span>Create New Backup</span>
        </button>
        <button type="button" class="mdf-backup-tab" data-tab="mdf-tab-schedule">
            <span class="dashicons dashicons-calendar-alt"></span>
            <span>Automated Schedule</span>
        </button>
        <button type="button" class="mdf-backup-tab" data-tab="mdf-tab-upload">
            <span class="dashicons dashicons-upload"></span>
            <span>Upload Archive</span>
        </button>
    </div>

    <!-- TAB 1: Backup Archives Table -->
    <div id="mdf-tab-backups" class="mdf-backup-tab-pane active">
        <div class="mdf-backup-table-card">
            <div class="mdf-table-header">
                <h3>Available Recovery Snapshots</h3>
                <span class="mdf-table-sub">Stored in isolated, access-protected filesystem storage.</span>
            </div>

            <div class="mdf-table-wrap">
                <table class="mdf-backup-table" id="mdfBackupsTable">
                    <thead>
                        <tr>
                            <th>Archive Filename / ID</th>
                            <th>Type</th>
                            <th>Included Components</th>
                            <th>Size</th>
                            <th>Date Created</th>
                            <th style="text-align: right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="mdfBackupsTableBody">
                        <?php if (empty($backups)): ?>
                        <tr class="mdf-empty-row">
                            <td colspan="6">
                                <div class="mdf-empty-state">
                                    <span class="dashicons dashicons-backup"></span>
                                    <h4>No Backups Created Yet</h4>
                                    <p>Protect your website from data loss and security emergencies by generating a full site backup now.</p>
                                    <button type="button" class="mdf-btn mdf-btn-emerald" id="mdfEmptyCreateBtn">Create First Backup</button>
                                </div>
                            </td>
                        </tr>
                        <?php else: ?>
                            <?php foreach ($backups as $b): 
                                $b_type = $b['type'] ?? 'full';
                                $b_name = $b['filename'] ?? '';
                                $b_download_url = admin_url('admin.php?action=waf_fw_download_backup&file=' . urlencode($b_name) . '&_wpnonce=' . $download_nonce);
                            ?>
                            <tr data-filename="<?php echo esc_attr($b_name); ?>">
                                <td>
                                    <div class="mdf-file-col">
                                        <span class="dashicons <?php echo $b_type === 'database' ? 'dashicons-database' : 'dashicons-media-archive'; ?>"></span>
                                        <div>
                                            <strong class="mdf-filename"><?php echo esc_html($b_name); ?></strong>
                                            <?php if (!empty($b['note'])): ?>
                                                <small class="mdf-note-tag"><?php echo esc_html($b['note']); ?></small>
                                            <?php endif; ?>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span class="mdf-type-badge mdf-badge-<?php echo esc_attr($b_type); ?>">
                                        <?php echo esc_html(strtoupper($b_type)); ?>
                                    </span>
                                </td>
                                <td>
                                    <div class="mdf-comp-pills">
                                        <?php 
                                        $comps = $b['components'] ?? ['Full Site'];
                                        foreach ($comps as $c): 
                                        ?>
                                            <span class="mdf-comp-pill"><?php echo esc_html($c); ?></span>
                                        <?php endforeach; ?>
                                    </div>
                                </td>
                                <td><strong><?php echo esc_html($b['size_formatted'] ?? size_format($b['size'] ?? 0, 2)); ?></strong></td>
                                <td><?php echo esc_html($b['created_at'] ?? 'Unknown'); ?></td>
                                <td>
                                    <div class="mdf-actions-col">
                                        <button type="button" class="mdf-action-btn mdf-btn-restore" data-filename="<?php echo esc_attr($b_name); ?>" title="Restore website from this backup">
                                            <span class="dashicons dashicons-backup"></span> Restore
                                        </button>
                                        <a href="<?php echo esc_url($b_download_url); ?>" class="mdf-action-btn mdf-btn-download" title="Download backup archive (.zip)">
                                            <span class="dashicons dashicons-download"></span> Download
                                        </a>
                                        <button type="button" class="mdf-action-btn mdf-btn-delete" data-filename="<?php echo esc_attr($b_name); ?>" title="Delete permanently">
                                            <span class="dashicons dashicons-trash"></span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- TAB 2: Create New Backup -->
    <div id="mdf-tab-create" class="mdf-backup-tab-pane" style="display:none;">
        <div class="mdf-create-card">
            <h3>Generate Site Backup</h3>
            <p class="mdf-card-desc">Select the desired backup scope. Backups are compressed and streamed in real time to avoid server timeouts.</p>

            <form id="mdfCreateBackupForm">
                <div class="mdf-scope-grid">
                    <label class="mdf-scope-box active">
                        <input type="radio" name="backup_type" value="full" checked>
                        <div class="mdf-scope-inner">
                            <span class="dashicons dashicons-admin-site-alt3"></span>
                            <strong>Full WordPress Site</strong>
                            <small>Entire MySQL database + Core, Plugins, Themes, Uploads, and wp-config.php.</small>
                        </div>
                    </label>

                    <label class="mdf-scope-box">
                        <input type="radio" name="backup_type" value="database">
                        <div class="mdf-scope-inner">
                            <span class="dashicons dashicons-database"></span>
                            <strong>Database Only</strong>
                            <small>Complete SQL dump of all WordPress tables, options, posts, users, and metadata.</small>
                        </div>
                    </label>

                    <label class="mdf-scope-box">
                        <input type="radio" name="backup_type" value="files">
                        <div class="mdf-scope-inner">
                            <span class="dashicons dashicons-media-archive"></span>
                            <strong>Files Only</strong>
                            <small>Core, plugins, themes, and uploaded media archives without database tables.</small>
                        </div>
                    </label>

                    <label class="mdf-scope-box">
                        <input type="radio" name="backup_type" value="custom">
                        <div class="mdf-scope-inner">
                            <span class="dashicons dashicons-admin-generic"></span>
                            <strong>Custom Selection</strong>
                            <small>Manually select which individual components to include in the backup package.</small>
                        </div>
                    </label>
                </div>

                <div id="mdfCustomComponentsWrap" style="display:none;margin-top:16px;background:#f8fafc;padding:14px 18px;border-radius:8px;border:1px solid #e2e8f0;">
                    <strong style="display:block;margin-bottom:10px;color:#0f172a;">Select Components:</strong>
                    <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;">
                        <label class="mdf-checkbox-label"><input type="checkbox" name="components[]" value="db" checked> <span>WordPress Database (SQL)</span></label>
                        <label class="mdf-checkbox-label"><input type="checkbox" name="components[]" value="plugins" checked> <span>Plugins Directory</span></label>
                        <label class="mdf-checkbox-label"><input type="checkbox" name="components[]" value="themes" checked> <span>Themes Directory</span></label>
                        <label class="mdf-checkbox-label"><input type="checkbox" name="components[]" value="uploads" checked> <span>Media Uploads</span></label>
                        <label class="mdf-checkbox-label"><input type="checkbox" name="components[]" value="core" checked> <span>WordPress Core Files</span></label>
                        <label class="mdf-checkbox-label"><input type="checkbox" name="components[]" value="wp_config" checked> <span>wp-config.php &amp; .htaccess</span></label>
                    </div>
                </div>

                <div class="mdf-form-row" style="margin-top:20px;">
                    <label class="mdf-form-label">Backup Description / Note (Optional)</label>
                    <input type="text" id="mdfBackupNote" class="mdf-input" placeholder="e.g. Pre-Update Snapshot, Prior to Theme Redesign">
                </div>

                <div class="mdf-form-actions" style="margin-top:24px;">
                    <button type="submit" class="mdf-btn mdf-btn-emerald" id="mdfSubmitCreateBackup">
                        <span class="dashicons dashicons-shield"></span>
                        <span>Start Backup Process</span>
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- TAB 3: Automated Schedule & Retention -->
    <div id="mdf-tab-schedule" class="mdf-backup-tab-pane" style="display:none;">
        <div class="mdf-create-card">
            <h3>Automated Scheduled Backups</h3>
            <p class="mdf-card-desc">Keep your website continuously protected with automated background snapshots managed via WP-Cron.</p>

            <form id="mdfScheduleForm">
                <div class="mdf-toggle-item">
                    <label class="mdf-switch-toggle">
                        <input type="checkbox" id="mdfSchedEnabled" <?php checked($sched_enabled); ?>>
                        <span class="mdf-switch-slider"></span>
                    </label>
                    <div>
                        <strong>Enable Automated Recurring Backups</strong>
                        <p>When enabled, MDefender-Pro will generate snapshots in the background on the selected schedule.</p>
                    </div>
                </div>

                <div class="mdf-form-grid" style="display:grid;grid-template-columns:repeat(3, 1fr);gap:16px;margin-top:20px;">
                    <div class="mdf-form-group">
                        <label class="mdf-form-label">Backup Frequency</label>
                        <select id="mdfSchedFreq" class="mdf-select">
                            <option value="daily" <?php selected($sched_freq, 'daily'); ?>>Daily (Once every 24 hours)</option>
                            <option value="weekly" <?php selected($sched_freq, 'weekly'); ?>>Weekly (Once every 7 days)</option>
                            <option value="monthly" <?php selected($sched_freq, 'monthly'); ?>>Monthly (Once every 30 days)</option>
                        </select>
                    </div>

                    <div class="mdf-form-group">
                        <label class="mdf-form-label">Scheduled Backup Scope</label>
                        <select id="mdfSchedType" class="mdf-select">
                            <option value="full" <?php selected($sched_type, 'full'); ?>>Full Site (Database + All Files)</option>
                            <option value="database" <?php selected($sched_type, 'database'); ?>>Database Only</option>
                            <option value="files" <?php selected($sched_type, 'files'); ?>>Files Only</option>
                        </select>
                    </div>

                    <div class="mdf-form-group">
                        <label class="mdf-form-label">Max Retention Limit</label>
                        <select id="mdfSchedRetention" class="mdf-select">
                            <option value="3" <?php selected($retention, 3); ?>>Keep last 3 backups</option>
                            <option value="5" <?php selected($retention, 5); ?>>Keep last 5 backups (Recommended)</option>
                            <option value="10" <?php selected($retention, 10); ?>>Keep last 10 backups</option>
                            <option value="15" <?php selected($retention, 15); ?>>Keep last 15 backups</option>
                        </select>
                    </div>
                </div>

                <div class="mdf-form-actions" style="margin-top:24px;">
                    <button type="submit" class="mdf-btn mdf-btn-emerald">
                        <span class="dashicons dashicons-saved"></span>
                        <span>Save Schedule Settings</span>
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- TAB 4: Upload Archive -->
    <div id="mdf-tab-upload" class="mdf-backup-tab-pane" style="display:none;">
        <div class="mdf-create-card">
            <h3>Upload Existing Backup Archive</h3>
            <p class="mdf-card-desc">Upload a previously exported MDefender-Pro <code>.zip</code> or <code>.sql</code> archive file to restore or add to your local repository.</p>

            <form id="mdfUploadBackupForm" enctype="multipart/form-data">
                <div class="mdf-upload-zone" id="mdfUploadDropzone">
                    <span class="dashicons dashicons-upload"></span>
                    <h4>Drag &amp; Drop Backup Archive (.zip / .sql)</h4>
                    <p>or click to browse your computer</p>
                    <input type="file" id="mdfBackupFileInput" name="backup_file" accept=".zip,.sql,.gz" style="display:none;">
                    <button type="button" class="mdf-btn mdf-btn-outline" id="mdfBrowseBtn">Select Backup File</button>
                    <div id="mdfSelectedFileLabel" style="margin-top:10px;font-weight:600;color:#4f46e5;display:none;"></div>
                </div>

                <div class="mdf-form-actions" style="margin-top:20px;">
                    <button type="submit" class="mdf-btn mdf-btn-emerald" id="mdfSubmitUploadBtn" disabled>
                        <span class="dashicons dashicons-cloud-upload"></span>
                        <span>Upload &amp; Add to Catalog</span>
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- 4. RESTORE CONFIRMATION MODAL -->
<div id="mdfRestoreModal" class="mdf-modal-backdrop" style="display:none;">
    <div class="mdf-modal-window">
        <div class="mdf-modal-header">
            <div class="mdf-modal-title">
                <span class="dashicons dashicons-warning" style="color:#ef4444;"></span>
                <h3>Confirm Site Disaster Recovery Restoration</h3>
            </div>
            <button type="button" class="mdf-modal-close" id="mdfCloseRestoreModal">&times;</button>
        </div>
        <div class="mdf-modal-body">
            <div class="mdf-modal-alert">
                <strong>Attention: This action will overwrite existing files and database records.</strong>
                <p style="margin:4px 0 0 0;">All current database tables and WordPress files will be replaced with the contents of the chosen snapshot.</p>
            </div>
            <p style="margin-top:14px;"><strong>Target Snapshot:</strong> <code id="mdfRestoreTargetFilename" style="color:#0f172a;font-weight:700;"></code></p>
            <ul style="margin:12px 0 0 18px;color:#475569;font-size:12.5px;line-height:1.6;">
                <li>Database tables will be reconstructed and populated.</li>
                <li>WordPress core, plugins, themes, and uploaded files will be overwritten.</li>
                <li>Object cache and bytecode opcache will be reset upon completion.</li>
            </ul>
        </div>
        <div class="mdf-modal-footer">
            <button type="button" class="mdf-btn mdf-btn-danger" id="mdfConfirmRestoreBtn">
                <span class="dashicons dashicons-backup"></span>
                <span>Proceed with Restoration</span>
            </button>
            <button type="button" class="mdf-btn mdf-btn-ghost" id="mdfCancelRestoreBtn">Cancel</button>
        </div>
    </div>
</div>

<!-- 5. PROGRESS OVERLAY MODAL -->
<div id="mdfProgressModal" class="mdf-modal-backdrop" style="display:none;">
    <div class="mdf-modal-window" style="max-width:520px;text-align:center;padding:32px 24px;">
        <span class="dashicons dashicons-update war-spin-icon" style="font-size:42px;width:42px;height:42px;color:#4f46e5;"></span>
        <h3 id="mdfProgressTitle" style="margin:16px 0 6px 0;font-size:18px;color:#0f172a;">Processing Backup...</h3>
        <p id="mdfProgressMessage" style="color:#64748b;font-size:13px;margin:0 0 18px 0;">Please wait while the server packages your database and files.</p>
        <div class="mdf-progress-bar-bg">
            <div class="mdf-progress-bar-fill" id="mdfProgressBarFill" style="width: 70%;"></div>
        </div>
    </div>
</div>

<!-- 6. Toast Feedback -->
<div id="mdfBackupToast" class="mdf-toast" style="display:none;"></div>
