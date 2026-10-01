<?php
defined('ABSPATH') || exit;

$hardening = WAF_FW_Website_Hardening::instance();
$report = $hardening->generate_report();
$statuses = $hardening->get_status();
$features = $hardening->get_all_features();
$cat_scores = $report['category_scores'] ?? [];
$active_profile = get_option('waf_harden_active_profile', 'balanced');
$snapshots = get_option('waf_harden_safety_snapshots', []);
$baseline = get_option('waf_harden_security_baseline', null);
$drifts = get_option('waf_harden_drift_findings', []);
$activity_logs = $hardening->get_activity_log();

$score = $report['score'] ?? 0;
$grade = $report['grade'] ?? 'F';
$enabled_count = $report['enabled_count'] ?? 0;
$total_features = $report['total_features'] ?? 16;
$last_audit = $report['last_audit'] ?? current_time('mysql');
$last_change = $report['last_change'] ?? 'None recorded';

$feature_categories = [
    'admin_protect'      => 'auth',
    'login_protect'      => 'auth',
    'wp_config'          => 'core',
    'user_accounts'      => 'auth',
    'version_hiding'     => 'core',
    'htaccess'           => 'files',
    'uploads'            => 'files',
    'sensitive_files'    => 'files',
    'file_perms'         => 'files',
    'rest_api'           => 'network',
    'xmlrpc'             => 'network',
    'php_files'          => 'network',
    'security_headers'   => 'headers',
    'backup'             => 'database',
    'plugin_theme'       => 'core',
    'directory_browsing' => 'files',
];

$feature_icons = [
    'admin_protect'      => 'dashicons-admin-users',
    'login_protect'      => 'dashicons-lock',
    'wp_config'          => 'dashicons-admin-settings',
    'htaccess'           => 'dashicons-admin-tools',
    'uploads'            => 'dashicons-upload',
    'sensitive_files'    => 'dashicons-shield',
    'rest_api'           => 'dashicons-rest-api',
    'xmlrpc'             => 'dashicons-admin-plugins',
    'php_files'          => 'dashicons-editor-code',
    'file_perms'         => 'dashicons-admin-generic',
    'security_headers'   => 'dashicons-shield-alt',
    'user_accounts'      => 'dashicons-groups',
    'backup'             => 'dashicons-database',
    'plugin_theme'       => 'dashicons-admin-appearance',
    'directory_browsing' => 'dashicons-admin-collapse',
    'version_hiding'     => 'dashicons-hidden',
];
?>
<link rel="stylesheet" id="war-harden-css-direct" href="<?php echo esc_url(defined('WAF_FW_PLUGIN_URL') ? WAF_FW_PLUGIN_URL . 'assets/css/hardening.css?v=' . (defined('WAF_FW_VERSION') ? WAF_FW_VERSION : '4.2.2') : ''); ?>">

<div class="war-harden-container">
    <!-- 1. Header -->
    <div class="war-harden-header-card">
        <div class="war-header-main">
            <div class="war-brand-row">
                <span class="war-brand-tag">MDEFENDER PRO</span>
                <span class="war-brand-divider">/</span>
                <span class="war-module-title">Website Hardening</span>
            </div>
            <h1 class="war-page-headline">Enterprise Security Hardening &amp; Posture Management</h1>
            <p class="war-page-desc">Systematic WordPress core protection, access boundary enforcement, continuous drift monitoring, and atomic safety rollbacks.</p>
        </div>

        <div class="war-header-metrics">
            <div class="war-hmetric-item">
                <span class="war-hmetric-label">Defense Index</span>
                <div class="war-hmetric-val-wrap">
                    <strong class="war-hmetric-val" id="wafHardenScoreValue"><?php echo esc_html($score); ?></strong>
                    <span class="war-hmetric-sub">/ 100</span>
                    <span class="war-grade-pill war-grade-<?php echo strtolower(esc_attr($grade)); ?>" id="wafHardenGradeBadge"><?php echo esc_html($grade); ?></span>
                </div>
            </div>

            <div class="war-hmetric-item">
                <span class="war-hmetric-label">Protection Status</span>
                <strong class="war-hmetric-status <?php echo $score >= 75 ? 'status-optimal' : 'status-warning'; ?>" id="wafProtectionStatusLabel">
                    <?php echo $score >= 75 ? 'Active &bull; Fortified' : 'Needs Attention'; ?>
                </strong>
            </div>

            <div class="war-hmetric-item">
                <span class="war-hmetric-label">Last Security Audit</span>
                <span class="war-hmetric-date" id="wafLastAuditDate"><?php echo esc_html($last_audit); ?></span>
                <span class="war-hmetric-meta">Last Change: <span id="wafLastChangeDate"><?php echo esc_html($last_change); ?></span></span>
            </div>

            <div class="war-header-buttons">
                <button type="button" class="war-btn-compact war-btn-primary" id="wafHardenOneClick">
                    <span class="dashicons dashicons-shield"></span> 1-Click Harden
                </button>
                <button type="button" class="war-btn-compact war-btn-outline" id="wafHardenReport">
                    <span class="dashicons dashicons-clipboard"></span> Run Security Audit
                </button>
                <button type="button" class="war-btn-compact war-btn-ghost" id="wafHardenRefreshStatus" title="Refresh Live State">
                    <span class="dashicons dashicons-update"></span> Refresh
                </button>
            </div>
        </div>
    </div>

    <!-- 2. Security Defense Score Breakdown (8 Categories) -->
    <div class="war-score-breakdown-card">
        <div class="war-card-section-title">
            <span>Security Score Breakdown by Defense Domain</span>
            <small>Calculated from live state across all active security controls.</small>
        </div>
        <div class="war-cat-score-grid">
            <?php foreach ($cat_scores as $ckey => $cdata): 
                $c_score = $cdata['score'];
                $c_color = $c_score >= 80 ? 'color-green' : ($c_score >= 50 ? 'color-yellow' : 'color-red');
            ?>
            <div class="war-cat-card" data-category-filter="<?php echo esc_attr($ckey); ?>">
                <div class="war-cat-card-header">
                    <strong class="war-cat-name"><?php echo esc_html($cdata['title']); ?></strong>
                    <span class="war-cat-score-badge <?php echo esc_attr($c_color); ?>"><?php echo esc_html($c_score); ?>%</span>
                </div>
                <div class="war-cat-bar-bg">
                    <div class="war-cat-bar-fill <?php echo esc_attr($c_color); ?>" style="width: <?php echo esc_attr($c_score); ?>%;"></div>
                </div>
                <div class="war-cat-meta">
                    <span><?php echo esc_html($cdata['passed']); ?> Passed</span>
                    <span class="<?php echo $cdata['failed'] > 0 ? 'text-failed' : ''; ?>"><?php echo esc_html($cdata['failed']); ?> Failed</span>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- 3. Hardening Profiles Bar -->
    <div class="war-profiles-bar">
        <div class="war-profiles-label">
            <span class="dashicons dashicons-admin-settings"></span>
            <strong>Hardening Profiles:</strong>
        </div>
        <div class="war-profiles-btns">
            <button type="button" class="war-profile-btn <?php echo $active_profile === 'balanced' ? 'active' : ''; ?>" data-profile="balanced">
                <strong>Balanced</strong> <span>Recommended Production</span>
            </button>
            <button type="button" class="war-profile-btn <?php echo $active_profile === 'strong' ? 'active' : ''; ?>" data-profile="strong">
                <strong>Strong</strong> <span>High Security Defense</span>
            </button>
            <button type="button" class="war-profile-btn <?php echo $active_profile === 'maximum' ? 'active' : ''; ?>" data-profile="maximum">
                <strong>Maximum</strong> <span>Strict Enterprise Lockdown</span>
            </button>
            <button type="button" class="war-profile-btn <?php echo $active_profile === 'custom' ? 'active' : ''; ?>" data-profile="custom">
                <strong>Custom</strong> <span>Manual Configuration</span>
            </button>
        </div>
    </div>

    <!-- 4. Navigation Tabs -->
    <div class="war-harden-tabs-nav">
        <button type="button" class="war-harden-tab active" data-tab="tab-controls" data-filter="all">
            <span class="dashicons dashicons-admin-tools"></span>
            <span>Security Controls (<?php echo esc_html($total_features); ?>)</span>
        </button>
        <button type="button" class="war-harden-tab" data-tab="tab-permissions" id="wafTabNavPermissions">
            <span class="dashicons dashicons-admin-generic"></span>
            <span>Live File Permissions</span>
        </button>
        <button type="button" class="war-harden-tab" data-tab="tab-headers">
            <span class="dashicons dashicons-shield-alt"></span>
            <span>Security Headers (10)</span>
        </button>
        <button type="button" class="war-harden-tab" data-tab="tab-integrity">
            <span class="dashicons dashicons-media-document"></span>
            <span>File Integrity &amp; Uploads</span>
        </button>
        <button type="button" class="war-harden-tab" data-tab="tab-db-audit">
            <span class="dashicons dashicons-database"></span>
            <span>Database Security Audit</span>
        </button>
        <button type="button" class="war-harden-tab" data-tab="tab-baseline-drift">
            <span class="dashicons dashicons-randomize"></span>
            <span>Baseline &amp; Drift Monitor</span>
        </button>
        <button type="button" class="war-harden-tab" data-tab="tab-snapshots-rollback">
            <span class="dashicons dashicons-backup"></span>
            <span>Snapshots &amp; Rollback</span>
        </button>
        <button type="button" class="war-harden-tab" data-tab="tab-admin-ip">
            <span class="dashicons dashicons-lock"></span>
            <span>Admin IP &amp; Geo-Fence</span>
        </button>
        <button type="button" class="war-harden-tab" data-tab="tab-activity-log">
            <span class="dashicons dashicons-list-view"></span>
            <span>Activity History</span>
        </button>
    </div>

    <!-- TAB 1: 16 Hardening Controls (Compact Rows) -->
    <div id="tab-controls" class="war-tab-pane active">
        <div class="war-controls-filter-bar">
            <span>Filter Category:</span>
            <button type="button" class="war-subfilter-btn active" data-filter="all">All Controls (16)</button>
            <button type="button" class="war-subfilter-btn" data-filter="core">Core &amp; WordPress</button>
            <button type="button" class="war-subfilter-btn" data-filter="auth">Authentication &amp; Admin</button>
            <button type="button" class="war-subfilter-btn" data-filter="files">File Security</button>
            <button type="button" class="war-subfilter-btn" data-filter="network">Network &amp; REST</button>
            <button type="button" class="war-subfilter-btn" data-filter="headers">Security Headers</button>
            <button type="button" class="war-subfilter-btn" data-filter="database">Database &amp; Backup</button>
        </div>

        <div class="war-controls-table-card">
            <?php
            foreach ($features as $key => $label):
                $info = $statuses[$key] ?? ['status' => 'disabled', 'settings' => []];
                $enabled = ($info['status'] === 'enabled');
                $settings = $info['settings'] ?? [];
                $icon = $feature_icons[$key] ?? 'dashicons-shield';
                $category = $feature_categories[$key] ?? 'core';
            ?>
            <div class="war-control-row <?php echo $enabled ? 'is-enabled' : 'is-disabled'; ?>" 
                 data-feature="<?php echo esc_attr($key); ?>" 
                 data-category="<?php echo esc_attr($category); ?>">
                
                <div class="war-control-header">
                    <div class="war-control-info">
                        <span class="dashicons <?php echo esc_attr($icon); ?> war-control-icon"></span>
                        <div class="war-control-text">
                            <div class="war-control-title-line">
                                <strong class="war-control-name"><?php echo esc_html($label); ?></strong>
                                <span class="war-status-pill <?php echo $enabled ? 'pill-enabled' : 'pill-disabled'; ?>">
                                    <?php echo $enabled ? 'PASS &bull; ACTIVE' : 'DISABLED'; ?>
                                </span>
                                <span class="war-cat-pill"><?php echo esc_html(strtoupper($category)); ?></span>
                            </div>
                        </div>
                    </div>

                    <div class="war-control-actions">
                        <label class="war-switch-toggle" title="Toggle <?php echo esc_attr($label); ?>">
                            <input type="checkbox" <?php checked($enabled); ?> class="war-feature-switch">
                            <span class="war-switch-slider"></span>
                        </label>
                        <button type="button" class="war-control-toggle-btn" title="Configure settings">
                            <span class="dashicons dashicons-arrow-down-alt2"></span>
                        </button>
                    </div>
                </div>

                <div class="war-control-body" style="display:none;">
                    <?php 
                    if (isset($this) && method_exists($this, 'render_feature_settings')) {
                        $this->render_feature_settings($key, $label, $settings);
                    } elseif (class_exists('WAF_FW_Admin')) {
                        WAF_FW_Admin::instance()->render_feature_settings($key, $label, $settings);
                    }
                    ?>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- TAB 2: Live File Permissions Inspector & 1-Click Fixer -->
    <div id="tab-permissions" class="war-tab-pane" style="display:none;">
        <div class="war-pane-card">
            <div class="war-pane-header">
                <div>
                    <h3>Live File &amp; Directory Permissions Inspector</h3>
                    <p class="war-pane-sub">Real-time audit of critical WordPress core files, server configurations, and system directories with 1-Click automated remediation to WordPress security standards.</p>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button type="button" class="war-btn-compact war-btn-outline" id="wafScanPermissionsBtn">
                        <span class="dashicons dashicons-update"></span> Scan Live Permissions
                    </button>
                    <button type="button" class="war-btn-compact war-btn-primary" id="wafFixAllPermissionsBtn">
                        <span class="dashicons dashicons-admin-tools"></span> 1-Click Fix All Permissions
                    </button>
                </div>
            </div>

            <div class="war-perms-telemetry-row">
                <div class="war-perms-kpi">
                    <span class="war-perms-kpi-lbl">Monitored Targets</span>
                    <strong class="war-perms-kpi-val" id="wafPermsCountTotal">13</strong>
                </div>
                <div class="war-perms-kpi">
                    <span class="war-perms-kpi-lbl">Optimal Status</span>
                    <strong class="war-perms-kpi-val text-optimal" id="wafPermsCountOptimal">--</strong>
                </div>
                <div class="war-perms-kpi">
                    <span class="war-perms-kpi-lbl">Permission Deviations</span>
                    <strong class="war-perms-kpi-val text-risk" id="wafPermsCountRisk">--</strong>
                </div>
                <div class="war-perms-kpi">
                    <span class="war-perms-kpi-lbl">Security Standard</span>
                    <strong class="war-perms-kpi-val" style="font-size:12.5px;color:#0f172a;">Files: 0644/0600 | Dirs: 0755</strong>
                </div>
            </div>

            <div style="margin-top:16px;">
                <table class="war-data-table">
                    <thead>
                        <tr>
                            <th>File / Directory Target</th>
                            <th>Role &amp; Entity Type</th>
                            <th>Live Permission</th>
                            <th>Symbolic Mode</th>
                            <th>Recommended</th>
                            <th>Status</th>
                            <th style="text-align:right;">1-Click Action</th>
                        </tr>
                    </thead>
                    <tbody id="wafPermissionsTableBody">
                        <?php 
                        $perms_scan = $hardening->scan_live_file_permissions();
                        foreach ($perms_scan['items'] as $pitem):
                            $p_opt = $pitem['is_optimal'];
                        ?>
                        <tr data-perm-key="<?php echo esc_attr($pitem['key']); ?>">
                            <td>
                                <strong style="display:flex;align-items:center;gap:6px;">
                                    <span class="dashicons <?php echo $pitem['is_dir'] ? 'dashicons-category' : ($pitem['key'] === 'wp_config' ? 'dashicons-admin-settings' : 'dashicons-media-code'); ?>" style="color:<?php echo $p_opt ? '#10b981' : '#f59e0b'; ?>;"></span>
                                    <code><?php echo esc_html($pitem['name']); ?></code>
                                </strong>
                                <small style="color:#64748b;font-size:11px;"><?php echo esc_html($pitem['description']); ?></small>
                            </td>
                            <td>
                                <span class="war-cat-pill"><?php echo esc_html($pitem['type']); ?></span>
                            </td>
                            <td>
                                <strong class="war-perm-octal <?php echo $p_opt ? 'text-optimal' : 'text-risk'; ?>">
                                    <?php echo esc_html($pitem['current_octal']); ?>
                                </strong>
                            </td>
                            <td>
                                <code class="war-perm-symbolic"><?php echo esc_html($pitem['current_symbolic']); ?></code>
                            </td>
                            <td>
                                <code style="color:#4f46e5;font-weight:700;"><?php echo esc_html($pitem['recommended_octal']); ?></code>
                            </td>
                            <td>
                                <span class="war-status-pill <?php echo $p_opt ? 'pill-enabled' : 'pill-disabled'; ?>">
                                    <?php echo $p_opt ? 'OPTIMAL' : 'RISK DEVIATION'; ?>
                                </span>
                            </td>
                            <td style="text-align:right;">
                                <button type="button" class="war-btn-compact war-btn-remediate waf-fix-single-perm-btn" data-key="<?php echo esc_attr($pitem['key']); ?>">
                                    <span class="dashicons dashicons-yes"></span> Set <?php echo esc_html($pitem['recommended_octal']); ?>
                                </button>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- TAB 3: Advanced HTTP Security Headers Suite -->
    <div id="tab-headers" class="war-tab-pane" style="display:none;">
        <div class="war-pane-card">
            <div class="war-pane-header">
                <div>
                    <h3>Advanced HTTP Security Response Headers Suite</h3>
                    <p class="war-pane-sub">Enforce modern cryptographic and browser-level defense boundaries against Clickjacking, MIME-confusion, XSS, and Cross-Origin data exfiltration.</p>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button type="button" class="war-btn-compact war-btn-primary" id="wafApplyRecommendedHeadersBtn">
                        <span class="dashicons dashicons-shield"></span> 1-Click Apply Recommended Full Suite
                    </button>
                    <button type="button" class="war-btn-compact war-btn-outline" id="wafSaveHeadersTabBtn">
                        <span class="dashicons dashicons-saved"></span> Save Custom Configuration
                    </button>
                </div>
            </div>

            <?php 
            $header_list = get_option('waf_harden_security_headers_list', []);
            $h_settings = get_option('waf_harden_security_headers_settings', []);
            $headers_schema = $hardening->get_security_headers_schema();
            ?>

            <div class="war-headers-status-summary">
                <span>Active Protection Directives: <strong><?php echo count($header_list); ?> / <?php echo count($headers_schema); ?> Enforced</strong></span>
                <span style="color:#64748b;font-size:11.5px;">All headers are injected automatically via the standard WordPress <code>send_headers</code> hook.</span>
            </div>

            <table class="war-data-table" style="margin-top:16px;">
                <thead>
                    <tr>
                        <th>Security Directive</th>
                        <th>Live Current State</th>
                        <th>Recommended Configuration</th>
                        <th>Status</th>
                        <th>Defense Impact</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($headers_schema as $hdirective => $hinfo): 
                        $current_val = $header_list[$hdirective] ?? null;
                        $is_active = !empty($current_val);
                    ?>
                    <tr>
                        <td>
                            <strong><?php echo esc_html($hinfo['name']); ?></strong><br>
                            <code style="color:#4f46e5;"><?php echo esc_html($hdirective); ?></code>
                        </td>
                        <td>
                            <?php if ($is_active): ?>
                                <code class="war-header-active-val"><?php echo esc_html($current_val); ?></code>
                            <?php else: ?>
                                <span class="war-header-missing-val">Not Sent (Unprotected)</span>
                            <?php endif; ?>
                        </td>
                        <td>
                            <code style="font-size:11px;color:#334155;"><?php echo esc_html($hinfo['recommended']); ?></code>
                        </td>
                        <td>
                            <span class="war-status-pill <?php echo $is_active ? 'pill-enabled' : 'pill-disabled'; ?>">
                                <?php echo $is_active ? 'ENFORCED' : 'MISSING'; ?>
                            </span>
                        </td>
                        <td>
                            <small><?php echo esc_html($hinfo['desc']); ?></small>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>

    <!-- TAB 4: File Integrity & Upload Security Engine -->
    <div id="tab-integrity" class="war-tab-pane" style="display:none;">
        <div class="war-pane-card">
            <div class="war-pane-header">
                <div>
                    <h3>File Integrity Engine (SHA-256)</h3>
                    <p class="war-pane-sub">Continuous cryptographic baseline monitoring for WordPress core, configuration, and root execution entry points.</p>
                </div>
                <button type="button" class="war-btn-compact war-btn-primary" id="wafRunIntegrityScan">
                    <span class="dashicons dashicons-search"></span> Scan File Integrity
                </button>
            </div>
            
            <div id="wafIntegrityResultsWrap">
                <table class="war-data-table">
                    <thead>
                        <tr>
                            <th>File Target</th>
                            <th>Status / Change Type</th>
                            <th>Severity</th>
                            <th>Current SHA-256</th>
                            <th>Baseline SHA-256</th>
                            <th>Detected At</th>
                        </tr>
                    </thead>
                    <tbody id="wafIntegrityTableBody">
                        <tr>
                            <td colspan="6" class="war-table-empty">Click "Scan File Integrity" to verify file hashes against baseline.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="war-pane-card" style="margin-top:20px;">
            <div class="war-pane-header">
                <div>
                    <h3>Uploads Directory Script &amp; Executable Inspection</h3>
                    <p class="war-pane-sub">Scans <code>wp-content/uploads/</code> for unauthorized PHP scripts, double extensions, and dangerous binaries.</p>
                </div>
                <button type="button" class="war-btn-compact war-btn-outline" id="wafRunUploadsScan">
                    <span class="dashicons dashicons-upload"></span> Scan Uploads Folder
                </button>
            </div>
            <div id="wafUploadsResultsWrap">
                <table class="war-data-table">
                    <thead>
                        <tr>
                            <th>File Path</th>
                            <th>Security Finding</th>
                            <th>Severity</th>
                            <th>File Size</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="wafUploadsTableBody">
                        <tr>
                            <td colspan="5" class="war-table-empty">Click "Scan Uploads Folder" to audit media storage.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- TAB 5: Database Security Audit -->
    <div id="tab-db-audit" class="war-tab-pane" style="display:none;">
        <div class="war-pane-card">
            <div class="war-pane-header">
                <div>
                    <h3>Read-Only Database &amp; Storage Audit</h3>
                    <p class="war-pane-sub">Discovers publicly accessible SQL dumps, rogue administrator accounts, and code injection signatures inside <code>wp_options</code>.</p>
                </div>
                <button type="button" class="war-btn-compact war-btn-primary" id="wafRunDbAudit">
                    <span class="dashicons dashicons-search"></span> Run Database Audit
                </button>
            </div>

            <div id="wafDbAuditResultsWrap">
                <table class="war-data-table">
                    <thead>
                        <tr>
                            <th>Audit Check Type</th>
                            <th>Target Record / Entity</th>
                            <th>Severity</th>
                            <th>Audit Finding Details</th>
                        </tr>
                    </thead>
                    <tbody id="wafDbAuditTableBody">
                        <tr>
                            <td colspan="4" class="war-table-empty">Click "Run Database Audit" to perform a non-destructive security inspection.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- TAB 6: Baseline & Drift Monitor -->
    <div id="tab-baseline-drift" class="war-tab-pane" style="display:none;">
        <div class="war-pane-card">
            <div class="war-pane-header">
                <div>
                    <h3>Security Baseline &amp; Configuration Drift Detection</h3>
                    <p class="war-pane-sub">Establishes an authoritative security benchmark and alerts when hardened configurations are modified.</p>
                </div>
                <div style="display:flex;gap:8px;">
                    <button type="button" class="war-btn-compact war-btn-primary" id="wafCreateBaselineBtn">
                        <span class="dashicons dashicons-saved"></span> Create Security Baseline
                    </button>
                    <button type="button" class="war-btn-compact war-btn-outline" id="wafCheckDriftBtn">
                        <span class="dashicons dashicons-randomize"></span> Check Configuration Drift
                    </button>
                </div>
            </div>

            <div class="war-baseline-status-box">
                <div>
                    <strong>Baseline Status:</strong>
                    <span id="wafBaselineDateText"><?php echo $baseline ? 'Active (Created ' . esc_html($baseline['created_at']) . ')' : 'No baseline created yet'; ?></span>
                </div>
                <div>
                    <strong>Last Drift Check:</strong>
                    <span id="wafLastDriftCheckText"><?php echo esc_html(get_option('waf_harden_last_drift_check', 'Never')); ?></span>
                </div>
            </div>

            <div style="margin-top:20px;">
                <table class="war-data-table">
                    <thead>
                        <tr>
                            <th>Security Control</th>
                            <th>Drift Type</th>
                            <th>Severity</th>
                            <th>Expected (Baseline)</th>
                            <th>Current State</th>
                            <th>Remediation</th>
                        </tr>
                    </thead>
                    <tbody id="wafDriftTableBody">
                        <?php if (empty($drifts)): ?>
                        <tr>
                            <td colspan="6" class="war-table-empty">No configuration drift detected. All hardened controls match baseline.</td>
                        </tr>
                        <?php else: ?>
                            <?php foreach ($drifts as $d): ?>
                            <tr>
                                <td><strong><?php echo esc_html($d['label'] ?? $d['control']); ?></strong></td>
                                <td><?php echo esc_html($d['type']); ?></td>
                                <td><span class="war-severity-badge severity-high"><?php echo esc_html($d['severity']); ?></span></td>
                                <td><code><?php echo esc_html($d['expected']); ?></code></td>
                                <td><code style="color:#dc2626;"><?php echo esc_html($d['current']); ?></code></td>
                                <td>
                                    <button type="button" class="war-btn-compact war-btn-remediate" data-control="<?php echo esc_attr($d['control']); ?>">
                                        Fix Drift
                                    </button>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- TAB 6: Snapshots & Rollback -->
    <div id="tab-snapshots-rollback" class="war-tab-pane" style="display:none;">
        <div class="war-pane-card">
            <div class="war-pane-header">
                <div>
                    <h3>Pre-Change Safety Snapshots &amp; 1-Click Rollback</h3>
                    <p class="war-pane-sub">Automated point-in-time snapshots created before modifying <code>wp-config.php</code> or <code>.htaccess</code>.</p>
                </div>
                <button type="button" class="war-btn-compact war-btn-outline" id="wafCreateManualSnapshotBtn">
                    <span class="dashicons dashicons-camera"></span> Create Safety Snapshot
                </button>
            </div>

            <table class="war-data-table">
                <thead>
                    <tr>
                        <th>Snapshot ID / Target</th>
                        <th>Created At</th>
                        <th>File Size</th>
                        <th>SHA-256 Checksum</th>
                        <th>Note / Trigger</th>
                        <th style="text-align:right;">Action</th>
                    </tr>
                </thead>
                <tbody id="wafSnapshotsTableBody">
                    <?php if (empty($snapshots)): ?>
                    <tr>
                        <td colspan="6" class="war-table-empty">No safety snapshots generated yet. Snapshots are created automatically before hardening edits.</td>
                    </tr>
                    <?php else: ?>
                        <?php foreach (array_reverse($snapshots) as $snap): ?>
                        <tr>
                            <td>
                                <strong><?php echo esc_html($snap['target']); ?></strong><br>
                                <small style="color:#64748b;"><?php echo esc_html($snap['filename']); ?></small>
                            </td>
                            <td><?php echo esc_html($snap['created_at']); ?></td>
                            <td><?php echo size_format($snap['size'] ?? 0, 2); ?></td>
                            <td><code><?php echo substr($snap['hash'] ?? '', 0, 16); ?>...</code></td>
                            <td><small><?php echo esc_html($snap['note'] ?? 'Safety Backup'); ?></small></td>
                            <td style="text-align:right;">
                                <button type="button" class="war-btn-compact war-btn-rollback" data-snapshot-id="<?php echo esc_attr($snap['id']); ?>">
                                    <span class="dashicons dashicons-undo"></span> Rollback
                                </button>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>

    <!-- TAB 7: Admin IP & Geo-Fencing -->
    <div id="tab-admin-ip" class="war-tab-pane" style="display:none;">
        <div class="war-pane-card">
            <div class="war-pane-header">
                <div>
                    <h3>Admin Panel IP &amp; Geolocation Fencing</h3>
                    <p class="war-pane-sub">Restrict <code>/wp-admin/</code> and <code>wp-login.php</code> to authorized IP subnets and trusted countries.</p>
                </div>
            </div>

            <div class="war-pref-item" style="margin-top:16px;">
                <label class="war-switch-toggle">
                    <input type="checkbox" id="wafAdminIpEnabled" <?php checked(WAF_FW_Admin_Panel_IP::instance()->is_enabled()); ?>>
                    <span class="war-switch-slider"></span>
                </label>
                <div style="margin-left:12px;">
                    <strong>Enforce Strict Admin Endpoint Access Control</strong>
                    <p style="margin:2px 0 0 0;color:#64748b;font-size:12px;">Unauthorized connection attempts are dropped with an instant HTTP 403 Forbidden firewall response.</p>
                </div>
            </div>

            <div class="war-form-group" style="margin-top:20px;">
                <label class="war-form-label">Whitelisted Admin IP Addresses &amp; Subnets (One per line)</label>
                <textarea id="wafAdminIpWhitelist" rows="5" class="war-textarea" placeholder="127.0.0.1&#10;192.168.1.0/24"><?php echo esc_textarea(get_option('waf_harden_admin_whitelist', '')); ?></textarea>
            </div>

            <div class="war-form-group">
                <label class="war-form-label">Blocked Geolocation Country Codes (Comma-separated)</label>
                <input type="text" id="wafAdminIpCountries" value="<?php echo esc_attr(get_option('waf_harden_admin_blocked_countries', '')); ?>" placeholder="CN, RU, KP, IR" class="war-input">
            </div>

            <div style="margin-top:20px;">
                <button type="button" class="war-btn-compact war-btn-primary" id="wafSaveAdminIp">
                    <span class="dashicons dashicons-saved"></span> Save IP &amp; Geo Restrictions
                </button>
            </div>
        </div>
    </div>

    <!-- TAB 8: Activity History Log -->
    <div id="tab-activity-log" class="war-tab-pane" style="display:none;">
        <div class="war-pane-card">
            <div class="war-pane-header">
                <div>
                    <h3>Hardening Activity Audit Log</h3>
                    <p class="war-pane-sub">Chronological audit trail of all security changes, profile switches, drift remediations, and rollbacks.</p>
                </div>
                <button type="button" class="war-btn-compact war-btn-ghost" id="wafClearActivityLogBtn">
                    <span class="dashicons dashicons-trash"></span> Clear Activity Log
                </button>
            </div>

            <table class="war-data-table">
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>Action</th>
                        <th>Target Control</th>
                        <th>Result</th>
                        <th>User</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody id="wafActivityLogTableBody">
                    <?php if (empty($activity_logs)): ?>
                    <tr>
                        <td colspan="6" class="war-table-empty">No hardening activities recorded yet.</td>
                    </tr>
                    <?php else: ?>
                        <?php foreach (array_slice($activity_logs, 0, 50) as $log): ?>
                        <tr>
                            <td><small><?php echo esc_html($log['timestamp']); ?></small></td>
                            <td><strong><?php echo esc_html($log['action']); ?></strong></td>
                            <td><?php echo esc_html($log['control']); ?></td>
                            <td>
                                <span class="war-status-pill <?php echo $log['result'] === 'Success' ? 'pill-enabled' : 'pill-disabled'; ?>">
                                    <?php echo esc_html($log['result']); ?>
                                </span>
                            </td>
                            <td><?php echo esc_html($log['user']); ?></td>
                            <td><small><?php echo esc_html($log['details']); ?></small></td>
                        </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- AUDIT REPORT MODAL -->
<div id="wafHardenAuditModal" class="war-modal-backdrop" style="display:none;">
    <div class="war-modal-window">
        <div class="war-modal-header">
            <div class="war-modal-title-wrap">
                <span class="dashicons dashicons-clipboard"></span>
                <h3>Enterprise Website Hardening Audit Report</h3>
            </div>
            <button type="button" class="war-modal-close" id="wafCloseAuditModal">&times;</button>
        </div>
        <div class="war-modal-body" id="wafAuditModalContent">
            <div style="text-align:center;padding:40px;">
                <span class="dashicons dashicons-update war-spin-icon" style="font-size:32px;width:32px;height:32px;color:#4f46e5;"></span>
                <p style="margin-top:12px;color:#64748b;font-weight:600;">Generating comprehensive security audit report...</p>
            </div>
        </div>
        <div class="war-modal-footer">
            <button type="button" class="war-btn-compact war-btn-primary" id="wafModalApplyAll">
                <span class="dashicons dashicons-shield"></span> Apply Recommended Profile
            </button>
            <button type="button" class="war-btn-compact war-btn-outline" id="wafCloseAuditModalBtn">Close</button>
        </div>
    </div>
</div>

<!-- Toast Container -->
<div id="wafHardenToast" class="war-harden-toast" style="display:none;"></div>
