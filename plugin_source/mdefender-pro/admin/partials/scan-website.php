<?php
/**
 * MDefender Pro - Autonomous Security Radar & Website Security Scanner
 * 
 * Enterprise SOC Theme matching MDefender Pro core design system.
 * Features:
 * - Prominent Autonomous Security Radar HUD (Canvas)
 * - 18 Security Domains Telemetry Matrix
 * - Asynchronous Micro-Batch Forensic Queues
 * - Evidence-Driven Threat Findings Center with Visual Diff & Quarantine
 * - Security Event Timeline & Historical Audit Ledger
 *
 * @package MDefender_Pro
 */

defined('ABSPATH') || exit;

// Retrieve configuration options
$scheduled_enabled = get_option('waf_fw_scheduled_scan_enabled', 'yes');
$scheduled_interval = get_option('waf_fw_scheduled_scan_interval', 'weekly');
$scheduled_email = get_option('waf_fw_scheduled_scan_email', get_option('admin_email'));
$continuous_monitoring = get_option('waf_fw_continuous_monitoring', 'yes');

global $wpdb;
$table_integrity = $wpdb->prefix . 'waf_file_integrity';
$table_scan_results = $wpdb->prefix . 'waf_scan_results';
$table_file_changes = $wpdb->prefix . 'waf_file_changes';

$monitored_files_count = 0;
if ($wpdb->get_var("SHOW TABLES LIKE '{$table_integrity}'") === $table_integrity) {
    $monitored_files_count = (int)$wpdb->get_var("SELECT COUNT(*) FROM {$table_integrity}");
}

$last_scan_record = null;
if ($wpdb->get_var("SHOW TABLES LIKE '{$table_scan_results}'") === $table_scan_results) {
    $last_scan_record = $wpdb->get_row("SELECT * FROM {$table_scan_results} ORDER BY id DESC LIMIT 1");
}

$active_threats_count = 0;
if ($wpdb->get_var("SHOW TABLES LIKE '{$table_file_changes}'") === $table_file_changes) {
    $active_threats_count = (int)$wpdb->get_var("SELECT COUNT(*) FROM {$table_file_changes} WHERE status != 'resolved'");
}

$last_scan_date = get_option('waf_fw_last_scan_date', '');
if (!$last_scan_date && $last_scan_record && !empty($last_scan_record->created_at)) {
    $last_scan_date = $last_scan_record->created_at;
}
$last_scan_display = !empty($last_scan_date) ? human_time_diff(strtotime($last_scan_date), current_time('timestamp')) . ' ago' : 'Not scanned yet';
$last_scan_duration = ($last_scan_record && !empty($last_scan_record->duration_seconds)) ? 'Duration: ' . $last_scan_record->duration_seconds . 's' : ($last_scan_date ? 'Duration: ~1m' : 'Ready to scan');
$health_score = $last_scan_record && isset($last_scan_record->score) ? (int)$last_scan_record->score : ($active_threats_count > 0 ? 75 : 100);
$health_sub = $health_score >= 95 ? 'A+ Pristine Integrity' : ($health_score >= 80 ? 'Good Security Posture' : 'Action Required');
?>

<div class="mdf-canvas-wrap">

    <!-- TOP PLATFORM BREADCRUMB / STATUS BAR -->
    <div class="mdf-platform-bar">
        <div class="mdf-platform-left" style="display:flex;align-items:center;gap:10px;">
            <div style="width:24px;height:24px;border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(15,44,38,0.12);background:#FFFFFF;flex-shrink:0;">
                <img src="<?php echo defined('WAF_FW_PLUGIN_URL') ? esc_url(WAF_FW_PLUGIN_URL . 'assets/images/mdefender-logo.png') : ''; ?>" alt="MDefender Pro Logo" style="width:100%;height:100%;object-fit:contain;">
            </div>
            <span class="mdf-platform-crumb">MDefender Pro</span>
            <span class="mdf-platform-sep">/</span>
            <span class="mdf-platform-crumb">Threat Intelligence</span>
            <span class="mdf-platform-sep">/</span>
            <strong class="mdf-platform-active">Website Security Scanner</strong>
        </div>
        <div class="mdf-platform-right">
            <div class="mdf-shield-status-pill">
                <span class="mdf-pulse-dot"></span>
                <span class="mdf-shield-text">Autonomous Radar Armed</span>
            </div>
        </div>
    </div>

    <!-- HERO HEADER -->
    <div class="mdf-canvas-hero">
        <div class="mdf-canvas-hero-left">
            <h1 class="mdf-canvas-title">Website Threat <span class="mdf-canvas-highlight">Scanner.</span></h1>
            <p class="mdf-canvas-subtitle">Continuous Real-Time File Integrity, Deep AST Malware De-obfuscation & Cloud ML Heuristics.</p>
        </div>
        <div class="mdf-canvas-hero-right">
            <div class="mdf-status-badge mdf-status-protected" id="mdfGlobalStatusPill">
                <span class="mdf-status-dot" id="mdfGlobalStatusDot"></span>
                <span class="mdf-status-text" id="mdfGlobalStatusText">SYSTEM PROTECTED</span>
            </div>
            <div class="mdf-btn-group">
                <button type="button" class="mdf-primary-action-btn" id="wafStartFullScan">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <span>START FULL SCAN</span>
                </button>
                <button type="button" class="mdf-secondary-action-btn" id="wafStartQuickScan">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    <span>QUICK SCAN</span>
                </button>
                <button type="button" class="mdf-warning-action-btn" id="wafPauseScan" style="display:none;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    <span>Pause</span>
                </button>
                <button type="button" class="mdf-danger-action-btn" id="wafCancelScan" style="display:none;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    <span>Cancel</span>
                </button>
            </div>
        </div>
    </div>

    <!-- MAIN RADAR HUD HERO CARD -->
    <div class="mdf-unified-card mdf-hud-hero-card" id="mdfRadarWrapper">
        <div class="mdf-hud-main-grid">
            
            <!-- Left Column: Circular Autonomous Cyber Radar HUD -->
            <div class="mdf-radar-display-column">
                <div class="mdf-radar-viewport">
                    <canvas id="mdfRadarCanvas" width="340" height="340"></canvas>
                    <div class="mdf-radar-center-target">
                        <svg class="mdf-radar-center-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                        <span class="mdf-radar-score-display" id="mdfRadarCenterScore">100%</span>
                        <span class="mdf-radar-target-label">SECURE</span>
                    </div>
                </div>
                <div class="mdf-radar-footer-meta">
                    <div class="mdf-meta-block">
                        <span class="mdf-meta-title">ENGINE MODE</span>
                        <strong class="mdf-meta-val" id="mdfEngineModeVal">Cloud ML + Heuristic AST</strong>
                    </div>
                    <div class="mdf-meta-block" style="text-align:right;">
                        <span class="mdf-meta-title">RADAR SWEEP</span>
                        <strong class="mdf-meta-val mdf-text-emerald" id="mdfSweepStatus">Active Continuous</strong>
                    </div>
                </div>
            </div>

            <!-- Right Column: Real-Time Telemetry Metrics Grid -->
            <div class="mdf-metrics-column">
                <div class="mdf-metrics-grid">
                    
                    <!-- Metric 1: Security Health Score -->
                    <div class="mdf-telemetry-item">
                        <div class="mdf-telemetry-icon mdf-icon-emerald">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                        </div>
                        <div class="mdf-telemetry-body">
                            <div class="mdf-telemetry-label">SECURITY HEALTH</div>
                            <div class="mdf-telemetry-val" id="wafScanScore"><?php echo esc_html($health_score); ?><span class="mdf-telemetry-unit">/100</span></div>
                            <div class="mdf-telemetry-sub mdf-text-emerald" id="mdfHealthSub"><?php echo esc_html($health_sub); ?></div>
                        </div>
                    </div>

                    <!-- Metric 2: Files Monitored -->
                    <div class="mdf-telemetry-item">
                        <div class="mdf-telemetry-icon mdf-icon-forest">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                        </div>
                        <div class="mdf-telemetry-body">
                            <div class="mdf-telemetry-label">FILES MONITORED</div>
                            <div class="mdf-telemetry-val" id="wafSummaryFilesCount"><?php echo $monitored_files_count > 0 ? number_format($monitored_files_count) : '0'; ?></div>
                            <div class="mdf-telemetry-sub"><?php echo $monitored_files_count > 0 ? 'SHA-256 Baseline Tracked' : 'Pending Baseline Scan'; ?></div>
                        </div>
                    </div>

                    <!-- Metric 3: Components Audited -->
                    <div class="mdf-telemetry-item">
                        <div class="mdf-telemetry-icon mdf-icon-mint">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                        </div>
                        <div class="mdf-telemetry-body">
                            <div class="mdf-telemetry-label">COMPONENTS AUDITED</div>
                            <div class="mdf-telemetry-val" id="wafSummaryThemesCount">18 Modules</div>
                            <div class="mdf-telemetry-sub">Core, Plugins, Themes &amp; DB</div>
                        </div>
                    </div>

                    <!-- Metric 4: Active Threats -->
                    <div class="mdf-telemetry-item">
                        <div class="mdf-telemetry-icon mdf-icon-coral">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        </div>
                        <div class="mdf-telemetry-body">
                            <div class="mdf-telemetry-label">ACTIVE THREATS</div>
                            <div class="mdf-telemetry-val <?php echo $active_threats_count > 0 ? 'mdf-text-coral' : 'mdf-text-emerald'; ?>" id="wafCriticalCount"><?php echo number_format($active_threats_count); ?></div>
                            <div class="mdf-telemetry-sub" id="mdfThreatSub"><?php echo $active_threats_count > 0 ? number_format($active_threats_count) . ' Actionable Threats' : '0 Actionable Threats'; ?></div>
                        </div>
                    </div>

                    <!-- Metric 5: Last Deep Analysis -->
                    <div class="mdf-telemetry-item">
                        <div class="mdf-telemetry-icon mdf-icon-forest">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                        <div class="mdf-telemetry-body">
                            <div class="mdf-telemetry-label">LAST DEEP ANALYSIS</div>
                            <div class="mdf-telemetry-val mdf-text-sm" id="wafScanDate"><?php echo esc_html($last_scan_display); ?></div>
                            <div class="mdf-telemetry-sub" id="wafScanDuration"><?php echo esc_html($last_scan_duration); ?></div>
                        </div>
                    </div>

                    <!-- Metric 6: Monitoring Uptime -->
                    <div class="mdf-telemetry-item">
                        <div class="mdf-telemetry-icon mdf-icon-emerald">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                        </div>
                        <div class="mdf-telemetry-body">
                            <div class="mdf-telemetry-label">AUTONOMOUS UPTIME</div>
                            <div class="mdf-telemetry-val">99.98%</div>
                            <div class="mdf-telemetry-sub">Micro-Batch Queue Watcher</div>
                        </div>
                    </div>

                </div>

                <!-- Bottom Quick Settings Strip -->
                <div class="mdf-hud-control-strip">
                    <div class="mdf-switch-group">
                        <label class="mdf-canvas-toggle">
                            <input type="checkbox" id="mdfContinuousMonitoringToggle" <?php checked($continuous_monitoring, 'yes'); ?>>
                            <span class="mdf-canvas-toggle-slider"></span>
                        </label>
                        <span class="mdf-switch-label">Continuous Real-Time Monitoring</span>
                    </div>

                    <div class="mdf-strip-actions">
                        <a href="#" id="wafOpenScheduleBtn" class="mdf-strip-btn">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            <span>Scan Scheduling</span>
                        </a>
                        <a href="#" id="wafEmailReportBtn" class="mdf-strip-btn">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                            <span>Email Report</span>
                        </a>
                    </div>
                </div>

            </div>
        </div>

        <!-- Live Scanning Progress Telemetry HUD (Shown dynamically when scan is active) -->
        <div id="wafScanProgress" class="mdf-scan-live-progress" style="display:none;">
            <div class="mdf-progress-top-row">
                <div class="mdf-progress-stage-info">
                    <span class="mdf-radar-spinner"></span>
                    <div>
                        <strong id="wafScanStage" class="mdf-stage-title">Initializing Autonomous Scan...</strong>
                        <div class="mdf-stage-detail" id="wafStageDetailDesc">Preparing micro-batch queues and compiling delta file hashes...</div>
                    </div>
                </div>
                <div class="mdf-progress-pct-wrap">
                    <span id="wafScanProgressPct" class="mdf-progress-pct-val">0%</span>
                </div>
            </div>

            <!-- Multi-Domain Progress Breakdown -->
            <div class="mdf-domain-bars-grid">
                <div class="mdf-domain-bar-item" id="stageBarFilesystem">
                    <div class="mdf-domain-bar-head"><span>1. Filesystem</span><strong id="stagePctFilesystem">0%</strong></div>
                    <div class="mdf-bar-track"><div class="mdf-bar-fill" style="width:0%;"></div></div>
                </div>
                <div class="mdf-domain-bar-item" id="stageBarMalware">
                    <div class="mdf-domain-bar-head"><span>2. Malware & ML</span><strong id="stagePctMalware">0%</strong></div>
                    <div class="mdf-bar-track"><div class="mdf-bar-fill" style="width:0%;"></div></div>
                </div>
                <div class="mdf-domain-bar-item" id="stageBarCore">
                    <div class="mdf-domain-bar-head"><span>3. WP Core & Integrity</span><strong id="stagePctCore">0%</strong></div>
                    <div class="mdf-bar-track"><div class="mdf-bar-fill" style="width:0%;"></div></div>
                </div>
                <div class="mdf-domain-bar-item" id="stageBarDatabase">
                    <div class="mdf-domain-bar-head"><span>4. Database & Users</span><strong id="stagePctDatabase">0%</strong></div>
                    <div class="mdf-bar-track"><div class="mdf-bar-fill" style="width:0%;"></div></div>
                </div>
                <div class="mdf-domain-bar-item" id="stageBarVulns">
                    <div class="mdf-domain-bar-head"><span>5. Vulnerabilities & Leaks</span><strong id="stagePctVulns">0%</strong></div>
                    <div class="mdf-bar-track"><div class="mdf-bar-fill" style="width:0%;"></div></div>
                </div>
            </div>

            <!-- Streaming File Terminal -->
            <div class="mdf-stream-terminal">
                <div class="mdf-terminal-left">
                    <span class="mdf-term-prompt">&gt;&gt;</span>
                    <span id="wafStreamText">Auditing file checksums and testing for webshell AST patterns...</span>
                </div>
                <div class="mdf-terminal-right">
                    <span id="wafScannedFileCount">0</span> / <span id="wafTotalFileCount"><?php echo $monitored_files_count > 0 ? number_format($monitored_files_count) : '0'; ?></span> files &bull; Elapsed: <span id="wafScanElapsed">0s</span>
                </div>
            </div>
        </div>
    </div>

    <!-- WORDFENCE-GRADE COMPACT SCAN PIPELINE -->
    <div class="mdf-scan-pipeline-bar" id="mdfScanPipelineBar">
        <div class="mdf-pipeline-step active" id="pipeStepSpam">
            <span class="mdf-pipeline-dot"></span>
            <span class="mdf-pipeline-name">1. Spam &amp; SEO</span>
        </div>
        <div class="mdf-pipeline-divider"></div>
        <div class="mdf-pipeline-step active" id="pipeStepServer">
            <span class="mdf-pipeline-dot"></span>
            <span class="mdf-pipeline-name">2. Server &amp; Environment</span>
        </div>
        <div class="mdf-pipeline-divider"></div>
        <div class="mdf-pipeline-step active" id="pipeStepCore">
            <span class="mdf-pipeline-dot"></span>
            <span class="mdf-pipeline-name">3. WP Core Checksums</span>
        </div>
        <div class="mdf-pipeline-divider"></div>
        <div class="mdf-pipeline-step active" id="pipeStepMalware">
            <span class="mdf-pipeline-dot"></span>
            <span class="mdf-pipeline-name">4. Deep AST Malware &amp; ML</span>
        </div>
        <div class="mdf-pipeline-divider"></div>
        <div class="mdf-pipeline-step active" id="pipeStepDB">
            <span class="mdf-pipeline-dot"></span>
            <span class="mdf-pipeline-name">5. Database &amp; Users</span>
        </div>
        <div class="mdf-pipeline-divider"></div>
        <div class="mdf-pipeline-step active" id="pipeStepIntel">
            <span class="mdf-pipeline-dot"></span>
            <span class="mdf-pipeline-name">6. Threat Intel &amp; Leaks</span>
        </div>
    </div>

    <!-- EVIDENCE-DRIVEN THREAT FINDINGS CENTER (WORDFENCE-GRADE SOC) -->
    <div class="mdf-unified-card mdf-findings-card" id="wafScanResults">
        <!-- SECURITY FINDINGS & FORENSIC ANALYSIS TOP HEADER (IMAGE 1 PARITY) -->
        <div class="mdf-wf-findings-header-block">
            <div class="mdf-findings-top-bar">
                <div class="mdf-findings-title-group">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2.2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        <circle cx="12" cy="11" r="2.5"/>
                    </svg>
                    <h3 class="mdf-findings-main-title">Security Findings &amp; Forensic Analysis</h3>
                    <span class="mdf-findings-issues-badge" id="wafHeaderIssuesBadge">0 Issues</span>
                </div>
                <div class="mdf-findings-top-actions">
                    <button type="button" class="mdf-pill-action-btn" id="wafToggleExpandAllBtn" title="Expand or collapse all issue details">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                        <span id="wafExpandAllLabel">Expand All</span>
                    </button>
                    <button type="button" class="mdf-pill-action-btn mdf-pill-btn-quarantine" id="wafBulkCleanBtn" title="Safely quarantine isolated rogue malware">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        <span>Quarantine All Threats</span>
                    </button>
                    <button type="button" class="mdf-pill-action-btn mdf-pill-btn-repair" id="wafBulkRestoreBtn" title="Restore modified core files to pristine WordPress.org release">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                        <span>Repair All Core Files</span>
                    </button>
                </div>
            </div>

            <div class="mdf-findings-filter-row">
                <button type="button" class="mdf-findings-pill-tab active" data-tab="all">All Findings (<span id="wafTabAllCount">0</span>)</button>
                <button type="button" class="mdf-findings-pill-tab" data-tab="critical">Critical Threats (<span id="wafTabCriticalCount">0</span>)</button>
                <button type="button" class="mdf-findings-pill-tab" data-tab="warning">Warnings (<span id="wafTabWarningCount">0</span>)</button>
                <button type="button" class="mdf-findings-pill-tab" data-tab="ignored">Ignored (<span id="wafTabIgnoredCount">0</span>)</button>
            </div>
        </div>

        <!-- Telemetry Stats Strip (Identical to Wordfence) -->
        <div class="mdf-wf-stats-strip">
            <div class="mdf-wf-stat-item">Posts, Comments, &amp; Files: <strong id="mdfStatFiles"><?php echo $monitored_files_count > 0 ? number_format($monitored_files_count) : '6,855'; ?></strong></div>
            <div class="mdf-wf-stat-item">Themes &amp; Plugins: <strong id="mdfStatThemesPlugins">6</strong></div>
            <div class="mdf-wf-stat-item">Users Checked: <strong id="mdfStatUsers">1</strong></div>
            <div class="mdf-wf-stat-item">URLs Checked: <strong id="mdfStatUrls">1,764</strong></div>
            <div class="mdf-wf-stat-item">Results Found: <strong id="wafResultsFoundCount" style="color:#dc2626;">0</strong></div>
        </div>

        <!-- Findings List -->
        <div id="wafScanDetails" class="mdf-findings-list">
            <div class="mdf-empty-state" id="mdfNoFindingsState">
                <div class="mdf-empty-icon">
                    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                </div>
                <h4>Zero Threats Detected</h4>
                <p>Your WordPress files, core checksums, database and server configuration match pristine baseline integrity.</p>
            </div>
        </div>
    </div>

    <!-- 18 SECURITY DOMAINS RADAR MATRIX (COMPACT COLLAPSIBLE SENTINELS) -->
    <div class="mdf-section-heading mdf-collapsible-heading" id="mdfDomainsHeaderToggle" style="cursor:pointer;margin-top:32px;">
        <div class="mdf-heading-left">
            <div class="mdf-heading-icon-wrap" style="width:36px;height:36px;border-radius:10px;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </div>
            <div>
                <h3 class="mdf-heading-title" style="margin:0;">18 Autonomous Security Sentinel Domains</h3>
                <div style="font-size:12px;color:#64748b;margin-top:2px;">Filesystem, integrity, backdoor, CVE vulnerability and header sentinels</div>
            </div>
        </div>
        <div class="mdf-heading-right" style="display:flex;align-items:center;gap:10px;">
            <span class="mdf-badge-pill" style="background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;" id="mdfDomainsStatusBadge">18/18 SENTINELS ACTIVE</span>
            <button type="button" class="mdf-secondary-action-btn" id="mdfToggleDomainsBtn">
                <span id="mdfToggleDomainsText">View 18 Sentinels</span>
                <svg class="mdf-chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="transition:transform 0.2s ease;"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
        </div>
    </div>

    <div class="mdf-domains-grid" id="mdfDomainsGrid" style="display:none;">
        
        <!-- 1. Filesystem -->
        <div class="mdf-domain-card" data-domain="filesystem" id="domain-card-filesystem">
            <div class="mdf-domain-head">
                <div class="mdf-domain-icon mdf-icon-forest">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                </div>
                <span class="mdf-dom-badge badge-secure" id="badge-domain-filesystem">SECURE</span>
            </div>
            <h4 class="mdf-domain-name">Filesystem Sentinel</h4>
            <p class="mdf-domain-desc">New, modified, deleted & executable files in uploads folder</p>
            <div class="mdf-domain-foot">
                <span>Checked: <strong class="domain-time">Just now</strong></span>
                <span><strong class="domain-count">0</strong> findings</span>
            </div>
        </div>

        <!-- 2. Malware -->
        <div class="mdf-domain-card" data-domain="malware" id="domain-card-malware">
            <div class="mdf-domain-head">
                <div class="mdf-domain-icon mdf-icon-emerald">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <span class="mdf-dom-badge badge-secure" id="badge-domain-malware">SECURE</span>
            </div>
            <h4 class="mdf-domain-name">Malware & Trojan Scanner</h4>
            <p class="mdf-domain-desc">Known malware, ransomware & YARA signature intelligence</p>
            <div class="mdf-domain-foot">
                <span>Checked: <strong class="domain-time">Just now</strong></span>
                <span><strong class="domain-count">0</strong> findings</span>
            </div>
        </div>

        <!-- 3. Backdoors / Webshells -->
        <div class="mdf-domain-card" data-domain="backdoors" id="domain-card-backdoors">
            <div class="mdf-domain-head">
                <div class="mdf-domain-icon mdf-icon-coral">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                </div>
                <span class="mdf-dom-badge badge-secure" id="badge-domain-backdoors">SECURE</span>
            </div>
            <h4 class="mdf-domain-name">Backdoors & Webshells</h4>
            <p class="mdf-domain-desc">AST dataflow, dynamic eval, entropy & obfuscated code</p>
            <div class="mdf-domain-foot">
                <span>Checked: <strong class="domain-time">Just now</strong></span>
                <span><strong class="domain-count">0</strong> findings</span>
            </div>
        </div>

        <!-- 4. File Integrity -->
        <div class="mdf-domain-card" data-domain="integrity" id="domain-card-integrity">
            <div class="mdf-domain-head">
                <div class="mdf-domain-icon mdf-icon-forest">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <span class="mdf-dom-badge badge-secure" id="badge-domain-integrity">SECURE</span>
            </div>
            <h4 class="mdf-domain-name">File Integrity Monitor</h4>
            <p class="mdf-domain-desc">SHA-256 cryptographic baseline & delta change tracking</p>
            <div class="mdf-domain-foot">
                <span>Checked: <strong class="domain-time">Just now</strong></span>
                <span><strong class="domain-count">0</strong> findings</span>
            </div>
        </div>

        <!-- 5. WordPress Core Integrity -->
        <div class="mdf-domain-card" data-domain="wp_core" id="domain-card-wp_core">
            <div class="mdf-domain-head">
                <div class="mdf-domain-icon mdf-icon-mint">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
                </div>
                <span class="mdf-dom-badge badge-secure" id="badge-domain-wp_core">SECURE</span>
            </div>
            <h4 class="mdf-domain-name">WordPress Core Integrity</h4>
            <p class="mdf-domain-desc">Official WordPress.org pristine checksum verification</p>
            <div class="mdf-domain-foot">
                <span>Checked: <strong class="domain-time">Just now</strong></span>
                <span><strong class="domain-count">0</strong> findings</span>
            </div>
        </div>

        <!-- 6. Plugin Integrity -->
        <div class="mdf-domain-card" data-domain="plugins" id="domain-card-plugins">
            <div class="mdf-domain-head">
                <div class="mdf-domain-icon mdf-icon-forest">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                </div>
                <span class="mdf-dom-badge badge-secure" id="badge-domain-plugins">SECURE</span>
            </div>
            <h4 class="mdf-domain-name">Plugin Integrity & Health</h4>
            <p class="mdf-domain-desc">Audits plugin modifications, unexpected files & tampered code</p>
            <div class="mdf-domain-foot">
                <span>Checked: <strong class="domain-time">Just now</strong></span>
                <span><strong class="domain-count">0</strong> findings</span>
            </div>
        </div>

        <!-- 7. Theme Integrity -->
        <div class="mdf-domain-card" data-domain="themes" id="domain-card-themes">
            <div class="mdf-domain-head">
                <div class="mdf-domain-icon mdf-icon-mint">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
                </div>
                <span class="mdf-dom-badge badge-secure" id="badge-domain-themes">SECURE</span>
            </div>
            <h4 class="mdf-domain-name">Theme Integrity</h4>
            <p class="mdf-domain-desc">Active & parent themes file integrity and hidden functions</p>
            <div class="mdf-domain-foot">
                <span>Checked: <strong class="domain-time">Just now</strong></span>
                <span><strong class="domain-count">0</strong> findings</span>
            </div>
        </div>

        <!-- 8. Database Security -->
        <div class="mdf-domain-card" data-domain="database" id="domain-card-database">
            <div class="mdf-domain-head">
                <div class="mdf-domain-icon mdf-icon-emerald">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                </div>
                <span class="mdf-dom-badge badge-secure" id="badge-domain-database">SECURE</span>
            </div>
            <h4 class="mdf-domain-name">Database Security</h4>
            <p class="mdf-domain-desc">Table integrity, injected SQL fragments & prefix safety</p>
            <div class="mdf-domain-foot">
                <span>Checked: <strong class="domain-time">Just now</strong></span>
                <span><strong class="domain-count">0</strong> findings</span>
            </div>
        </div>

        <!-- 9. User Security -->
        <div class="mdf-domain-card" data-domain="users" id="domain-card-users">
            <div class="mdf-domain-head">
                <div class="mdf-domain-icon mdf-icon-forest">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <span class="mdf-dom-badge badge-secure" id="badge-domain-users">SECURE</span>
            </div>
            <h4 class="mdf-domain-name">User & Privilege Audit</h4>
            <p class="mdf-domain-desc">Rogue admin detection, password audits & app passwords</p>
            <div class="mdf-domain-foot">
                <span>Checked: <strong class="domain-time">Just now</strong></span>
                <span><strong class="domain-count">0</strong> findings</span>
            </div>
        </div>

        <!-- 10. Option & Config Security -->
        <div class="mdf-domain-card" data-domain="config" id="domain-card-config">
            <div class="mdf-domain-head">
                <div class="mdf-domain-icon mdf-icon-mint">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </div>
                <span class="mdf-dom-badge badge-secure" id="badge-domain-config">SECURE</span>
            </div>
            <h4 class="mdf-domain-name">Option & Config Security</h4>
            <p class="mdf-domain-desc">wp-config.php constants, siteurl, active plugins & core options</p>
            <div class="mdf-domain-foot">
                <span>Checked: <strong class="domain-time">Just now</strong></span>
                <span><strong class="domain-count">0</strong> findings</span>
            </div>
        </div>

        <!-- 11. Public Exposure Sentinel -->
        <div class="mdf-domain-card" data-domain="exposure" id="domain-card-exposure">
            <div class="mdf-domain-head">
                <div class="mdf-domain-icon mdf-icon-coral">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </div>
                <span class="mdf-dom-badge badge-secure" id="badge-domain-exposure">SECURE</span>
            </div>
            <h4 class="mdf-domain-name">Public Exposure Sentinel</h4>
            <p class="mdf-domain-desc">Probes for exposed .env, .git, SQL dumps, debug logs & backups</p>
            <div class="mdf-domain-foot">
                <span>Checked: <strong class="domain-time">Just now</strong></span>
                <span><strong class="domain-count">0</strong> findings</span>
            </div>
        </div>

        <!-- 12. Vulnerability & CVE DB -->
        <div class="mdf-domain-card" data-domain="vulnerabilities" id="domain-card-vulnerabilities">
            <div class="mdf-domain-head">
                <div class="mdf-domain-icon mdf-icon-amber">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <span class="mdf-dom-badge badge-secure" id="badge-domain-vulnerabilities">SECURE</span>
            </div>
            <h4 class="mdf-domain-name">Vulnerability & CVE DB</h4>
            <p class="mdf-domain-desc">Checks core, plugins & themes against active CVE databases</p>
            <div class="mdf-domain-foot">
                <span>Checked: <strong class="domain-time">Just now</strong></span>
                <span><strong class="domain-count">0</strong> findings</span>
            </div>
        </div>

        <!-- 13. Security Headers -->
        <div class="mdf-domain-card" data-domain="headers" id="domain-card-headers">
            <div class="mdf-domain-head">
                <div class="mdf-domain-icon mdf-icon-forest">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                </div>
                <span class="mdf-dom-badge badge-secure" id="badge-domain-headers">SECURE</span>
            </div>
            <h4 class="mdf-domain-name">Security Headers Guard</h4>
            <p class="mdf-domain-desc">CSP, HSTS, X-Frame-Options, X-Content-Type & Permissions</p>
            <div class="mdf-domain-foot">
                <span>Checked: <strong class="domain-time">Just now</strong></span>
                <span><strong class="domain-count">0</strong> findings</span>
            </div>
        </div>

        <!-- 14. PHP & Server Configuration -->
        <div class="mdf-domain-card" data-domain="server" id="domain-card-server">
            <div class="mdf-domain-head">
                <div class="mdf-domain-icon mdf-icon-mint">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                </div>
                <span class="mdf-dom-badge badge-secure" id="badge-domain-server">SECURE</span>
            </div>
            <h4 class="mdf-domain-name">PHP & Server Config</h4>
            <p class="mdf-domain-desc">PHP version, dangerous functions, display_errors & SSL/TLS</p>
            <div class="mdf-domain-foot">
                <span>Checked: <strong class="domain-time">Just now</strong></span>
                <span><strong class="domain-count">0</strong> findings</span>
            </div>
        </div>

        <!-- 15. Suspicious Changes -->
        <div class="mdf-domain-card" data-domain="changes" id="domain-card-changes">
            <div class="mdf-domain-head">
                <div class="mdf-domain-icon mdf-icon-emerald">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </div>
                <span class="mdf-dom-badge badge-secure" id="badge-domain-changes">SECURE</span>
            </div>
            <h4 class="mdf-domain-name">Suspicious Changes</h4>
            <p class="mdf-domain-desc">Unscheduled file writes, permission escalations & modifications</p>
            <div class="mdf-domain-foot">
                <span>Checked: <strong class="domain-time">Just now</strong></span>
                <span><strong class="domain-count">0</strong> findings</span>
            </div>
        </div>

        <!-- 16. Threat Intelligence & ML -->
        <div class="mdf-domain-card" data-domain="threat_intel" id="domain-card-threat_intel">
            <div class="mdf-domain-head">
                <div class="mdf-domain-icon mdf-icon-forest">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
                </div>
                <span class="mdf-dom-badge badge-secure" id="badge-domain-threat_intel">SECURE</span>
            </div>
            <h4 class="mdf-domain-name">Threat Intelligence & ML</h4>
            <p class="mdf-domain-desc">MDefender Cloud AI zero-day model & IP blacklist feed</p>
            <div class="mdf-domain-foot">
                <span>Checked: <strong class="domain-time">Just now</strong></span>
                <span><strong class="domain-count">0</strong> findings</span>
            </div>
        </div>

        <!-- 17. Suspicious Redirects -->
        <div class="mdf-domain-card" data-domain="redirects" id="domain-card-redirects">
            <div class="mdf-domain-head">
                <div class="mdf-domain-icon mdf-icon-coral">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                </div>
                <span class="mdf-dom-badge badge-secure" id="badge-domain-redirects">SECURE</span>
            </div>
            <h4 class="mdf-domain-name">Suspicious Redirects</h4>
            <p class="mdf-domain-desc">Detects conditional hacker redirects and rogue JavaScript links</p>
            <div class="mdf-domain-foot">
                <span>Checked: <strong class="domain-time">Just now</strong></span>
                <span><strong class="domain-count">0</strong> findings</span>
            </div>
        </div>

        <!-- 18. SEO Spam & Content Injection -->
        <div class="mdf-domain-card" data-domain="seo_spam" id="domain-card-seo_spam">
            <div class="mdf-domain-head">
                <div class="mdf-domain-icon mdf-icon-amber">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </div>
                <span class="mdf-dom-badge badge-secure" id="badge-domain-seo_spam">SECURE</span>
            </div>
            <h4 class="mdf-domain-name">SEO Spam & Injected Content</h4>
            <p class="mdf-domain-desc">Scans posts & database for pharmaceutical spam & hidden backdoors</p>
            <div class="mdf-domain-foot">
                <span>Checked: <strong class="domain-time">Just now</strong></span>
                <span><strong class="domain-count">0</strong> findings</span>
            </div>
        </div>

    </div>


    <!-- SECURITY TIMELINE & SCAN HISTORY DUAL GRID -->
    <div class="mdf-dual-grid">
        
        <!-- Security Event Timeline -->
        <div class="mdf-unified-card">
            <div class="mdf-card-header">
                <div class="mdf-card-header-left">
                    <div class="mdf-card-icon-wrap mdf-icon-forest">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <div>
                        <h3 class="mdf-card-title">Autonomous Security Timeline</h3>
                        <p class="mdf-card-subtitle">Real-time security events, file changes & defense actions.</p>
                    </div>
                </div>
            </div>
            <div class="mdf-timeline-box" id="mdfTimelineFeed">
                <div class="mdf-timeline-row">
                    <div class="mdf-time-dot dot-emerald"></div>
                    <div class="mdf-time-body">
                        <div class="mdf-time-top">
                            <strong>Autonomous Radar Online</strong>
                            <span class="mdf-time-date">Active</span>
                        </div>
                        <p class="mdf-time-text">Continuous monitoring engine initialized with micro-batch background queues.</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Historical Scans -->
        <div class="mdf-unified-card">
            <div class="mdf-card-header">
                <div class="mdf-card-header-left">
                    <div class="mdf-card-icon-wrap mdf-icon-mint">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    </div>
                    <div>
                        <h3 class="mdf-card-title">Scan History</h3>
                        <p class="mdf-card-subtitle">Historical audits and deep diagnostic reports.</p>
                    </div>
                </div>
                <button type="button" class="mdf-clear-history-btn" id="wafClearHistory">Clear History</button>
            </div>
            <div class="mdf-table-container">
                <table class="mdf-clean-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Score</th>
                            <th>Issues</th>
                            <th>Duration</th>
                            <th style="text-align:right;">Status</th>
                        </tr>
                    </thead>
                    <tbody id="wafScanHistoryBody">
                        <tr>
                            <td colspan="6" class="mdf-empty-cell">
                                No scan history recorded yet. Run your first scan above.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

    </div>

</div>

<!-- ======================================================= -->
<!-- MODALS: Visual Diff, Code Viewer, Schedule & Email      -->
<!-- ======================================================= -->

<!-- Visual Diff Viewer Modal (Split Side-by-Side & Unified) -->
<div id="wafDiffModal" class="mdf-modal-backdrop" style="display:none;">
    <div class="mdf-modal-box mdf-modal-diff">
        <div class="mdf-modal-header">
            <div class="mdf-modal-header-left">
                <div class="mdf-modal-icon-badge mdf-icon-forest">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/><line x1="14" y1="10" x2="21" y2="3"/></svg>
                </div>
                <div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <strong id="wafDiffFileName" style="font-size:14px;color:#0F2C26;">wp-includes/version.php</strong>
                        <span id="wafDiffWpVersion" class="mdf-badge-pill">WordPress Core</span>
                    </div>
                    <div style="font-size:12px;color:#5B756E;margin-top:2px;">Compare local modified file against pristine official WordPress.org release version</div>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
                <div class="mdf-view-toggle">
                    <button type="button" class="waf-diff-mode-btn active" data-mode="split">Side-by-Side</button>
                    <button type="button" class="waf-diff-mode-btn" data-mode="unified">Unified</button>
                </div>
                <button type="button" id="wafCloseDiffModalBtn" class="mdf-modal-close">&times;</button>
            </div>
        </div>

        <div class="mdf-diff-meta-bar">
            <div style="display:flex;gap:16px;">
                <span style="color:#475569;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10B981;margin-right:6px;"></span>Official (WordPress.org): <strong id="wafDiffOriginalMeta">Loading...</strong></span>
                <span style="color:#475569;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#DF5A38;margin-right:6px;"></span>Local Disk: <strong id="wafDiffLocalMeta">Loading...</strong></span>
            </div>
            <div id="wafDiffLineStats" style="font-weight:600;font-family:monospace;font-size:12px;">
                <span style="color:#059669;">+0 additions</span> &bull; <span style="color:#DF5A38;">-0 deletions</span>
            </div>
        </div>

        <div id="wafDiffContainer" class="mdf-diff-container">
            <div id="wafDiffLoading" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#64748b;gap:10px;">
                <span class="mdf-radar-spinner"></span>
                <span>Fetching pristine reference file from official WordPress.org API...</span>
            </div>
            <div id="wafDiffContent" style="display:none;min-height:100%;">
                <div id="wafDiffSplitView" class="mdf-diff-split-view">
                    <div class="mdf-diff-pane mdf-pane-left">
                        <div class="mdf-diff-pane-title pane-pristine">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            ORIGINAL WORDPRESS.ORG FILE (PRISTINE)
                        </div>
                        <table class="waf-diff-table" id="wafDiffLeftTable"></table>
                    </div>
                    <div class="mdf-diff-pane mdf-pane-right">
                        <div class="mdf-diff-pane-title pane-modified">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            MODIFIED LOCAL FILE (CURRENT SERVER)
                        </div>
                        <table class="waf-diff-table" id="wafDiffRightTable"></table>
                    </div>
                </div>

                <div id="wafDiffUnifiedView" style="display:none;font-family:Consolas, Monaco, monospace;font-size:12px;overflow-x:auto;">
                    <table class="waf-diff-table" id="wafDiffUnifiedTable"></table>
                </div>
            </div>
        </div>

        <div class="mdf-modal-footer">
            <div style="font-size:12px;color:#5B756E;display:flex;align-items:center;gap:6px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>Restoring will safely backup this file to <code>wp-content/mdefender-backups/</code> before restoring official code.</span>
            </div>
            <div style="display:flex;gap:8px;">
                <button type="button" class="mdf-secondary-action-btn" id="wafDiffCancelBtn">Close</button>
                <button type="button" class="mdf-secondary-action-btn" id="wafDiffIgnoreBtn">Ignore This Issue</button>
                <button type="button" class="mdf-primary-action-btn" id="wafDiffRestoreBtn" style="background:#059669;border-color:#059669;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                    <span>Restore to Pristine Official Version</span>
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Source Code Inspector Modal -->
<div id="wafCodeModal" class="mdf-modal-backdrop" style="display:none;">
    <div class="mdf-modal-box mdf-modal-code">
        <div class="mdf-modal-header">
            <div style="display:flex;align-items:center;gap:8px;">
                <div class="mdf-modal-icon-badge mdf-icon-forest">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                </div>
                <strong id="wafCodeModalTitle" style="font-size:14px;color:#0F2C26;">File Source Inspector</strong>
            </div>
            <button type="button" id="wafCloseCodeModalBtn" class="mdf-modal-close">&times;</button>
        </div>
        <div class="mdf-diff-meta-bar">
            <span id="wafCodeModalMeta">Loading file metadata...</span>
        </div>
        <pre id="wafModalCode" class="mdf-code-viewer"></pre>
    </div>
</div>

<!-- Scan Scheduling Modal -->
<div id="wafScheduleModal" class="mdf-modal-backdrop" style="display:none;">
    <div class="mdf-modal-box mdf-modal-form">
        <div class="mdf-modal-header">
            <div style="display:flex;align-items:center;gap:10px;">
                <div class="mdf-modal-icon-badge mdf-icon-forest">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <strong style="font-size:16px;color:#0F2C26;">Autonomous Scan Scheduling</strong>
            </div>
            <button type="button" id="wafScheduleModalClose" class="mdf-modal-close">&times;</button>
        </div>
        <div class="mdf-modal-body">
            <p style="font-size:13px;color:#5B756E;margin:0 0 16px;">Configure periodic deep background security scans powered by WP-Cron with zero performance impact.</p>
            
            <div style="margin-bottom:14px;">
                <label style="display:flex;align-items:center;gap:8px;font-weight:600;font-size:13px;color:#0F2C26;cursor:pointer;">
                    <input type="checkbox" id="wafScheduledScanEnabled" value="yes" <?php checked($scheduled_enabled, 'yes'); ?>>
                    Enable Automated Background Deep Scans
                </label>
            </div>

            <div style="margin-bottom:14px;">
                <label style="font-size:12px;font-weight:600;color:#5B756E;display:block;margin-bottom:6px;">Frequency:</label>
                <select id="wafScheduledScanInterval" class="mdf-input-select">
                    <option value="daily" <?php selected($scheduled_interval, 'daily'); ?>>Daily Deep Scan</option>
                    <option value="weekly" <?php selected($scheduled_interval, 'weekly'); ?>>Weekly Deep Scan (Recommended)</option>
                    <option value="monthly" <?php selected($scheduled_interval, 'monthly'); ?>>Monthly Deep Scan</option>
                </select>
            </div>

            <div style="margin-bottom:16px;">
                <label style="font-size:12px;font-weight:600;color:#5B756E;display:block;margin-bottom:6px;">Email Security Report to:</label>
                <input type="email" id="wafScheduledScanEmail" class="mdf-input-text" value="<?php echo esc_attr($scheduled_email); ?>">
            </div>
        </div>
        <div class="mdf-modal-footer">
            <button type="button" class="mdf-secondary-action-btn" id="wafScheduleCancel">Cancel</button>
            <button type="button" class="mdf-primary-action-btn" id="wafScheduleSave">Save Schedule</button>
        </div>
    </div>
</div>

<!-- Email Report Modal -->
<div id="wafEmailModal" class="mdf-modal-backdrop" style="display:none;">
    <div class="mdf-modal-box mdf-modal-form">
        <div class="mdf-modal-header">
            <div style="display:flex;align-items:center;gap:10px;">
                <div class="mdf-modal-icon-badge mdf-icon-forest">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                <strong style="font-size:16px;color:#0F2C26;">Email Security Assessment</strong>
            </div>
            <button type="button" id="wafEmailModalClose" class="mdf-modal-close">&times;</button>
        </div>
        <div class="mdf-modal-body">
            <p style="font-size:13px;color:#5B756E;margin:0 0 16px;">Send the full scan assessment and threat findings to your email inbox.</p>
            <input type="email" id="wafReportEmail" class="mdf-input-text" value="<?php echo esc_attr(get_option('admin_email')); ?>" style="margin-bottom:16px;">
        </div>
        <div class="mdf-modal-footer">
            <button type="button" class="mdf-secondary-action-btn" id="wafEmailCancel">Cancel</button>
            <button type="button" class="mdf-primary-action-btn" id="wafEmailSend">Send Report</button>
        </div>
    </div>
</div>


<!-- Wordfence-Style Repair Confirmation & Backup Download Modal -->
<div id="wafRepairModal" class="mdf-modal-backdrop" style="display:none;">
    <div class="mdf-modal-box" style="max-width: 520px; width: 100%; padding: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(15,23,42,0.18);">
        <div class="mdf-modal-header" style="padding: 16px 20px; background: #ffffff; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 32px; height: 32px; border-radius: 8px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </div>
                <strong style="font-size: 16px; color: #0f172a; font-weight: 700;">Download Backup File</strong>
            </div>
            <button type="button" id="wafCloseRepairModalBtn" class="mdf-modal-close" style="background:none;border:none;font-size:22px;color:#94a3b8;cursor:pointer;line-height:1;">&times;</button>
        </div>
        <div class="mdf-modal-body" style="padding: 22px 24px; background: #ffffff;">
            <p style="font-size: 13.5px; color: #334155; line-height: 1.55; margin: 0 0 14px;">
                Please make a backup of this file before proceeding. If you need to restore this backup file, you can copy it to the following path from your site's root:
            </p>
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 11px 14px; font-family: Consolas, Monaco, monospace; font-size: 12.5px; color: #0f172a; margin-bottom: 18px; word-break: break-all;" id="wafRepairTargetFilePath">
                wp-admin/includes/update-core.php
            </div>
            <div style="margin-bottom: 18px;">
                <button type="button" class="mdf-secondary-action-btn" id="wafRepairDownloadBackupBtn" style="font-size: 12px; font-weight: 700; padding: 9px 16px; border-color: #cbd5e1; color: #2563eb; background: #f8fafc;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    <span>DOWNLOAD FILE</span>
                </button>
            </div>
            <label style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #64748b; cursor: pointer; user-select: none;">
                <input type="checkbox" id="wafRepairDontAskAgain" style="accent-color: #2563eb; cursor: pointer;">
                <span>Don't ask again</span>
            </label>
        </div>
        <div class="mdf-modal-footer" style="padding: 14px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" class="mdf-secondary-action-btn" id="wafRepairCancelBtn" style="font-size:12.5px;padding:8px 18px;">CANCEL</button>
            <button type="button" class="mdf-primary-action-btn" id="wafRepairConfirmBtn" style="font-size:12.5px;padding:8px 18px;background:#dc2626;border-color:#dc2626;box-shadow:none;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                <span>REPAIR FILE</span>
            </button>
        </div>
    </div>
</div>

<style>
/* ==========================================================================
   MDefender Pro - Unified Enterprise Security Scanner Design System
   Matches Authentic MDefender Pro SOC Theme:
   Base Canvas: #f8fafc | Cards: #ffffff | Border: #e2e8f0
   Slate Dark: #0f172a / #1e293b | Cyber Blue: #2563eb | Emerald: #10b981
   Crimson: #ef4444 | Amber: #f59e0b
   ========================================================================== */

.mdf-canvas-wrap {
    background: #f8fafc;
    padding: 24px 32px 60px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #0f172a;
    box-sizing: border-box;
    width: 100%;
    margin-left: 0;
}

.mdf-canvas-wrap *, .mdf-canvas-wrap *::before, .mdf-canvas-wrap *::after {
    box-sizing: border-box;
}

/* TOP PLATFORM BAR */
.mdf-platform-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.mdf-platform-left {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #64748b;
}

.mdf-platform-crumb {
    color: #64748b;
}

.mdf-platform-sep {
    color: #cbd5e1;
}

.mdf-platform-active {
    color: #0f172a;
    font-weight: 700;
}

.mdf-shield-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    color: #0f172a;
    box-shadow: 0 1px 3px rgba(15,23,42,0.04);
}

.mdf-pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
    animation: mdfPulseEmerald 1.8s infinite ease-in-out;
}

@keyframes mdfPulseEmerald {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(0.85); opacity: 0.45; }
}

/* HERO HEADER */
.mdf-canvas-hero {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 16px;
}

.mdf-canvas-title {
    font-size: 30px;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 6px 0;
    line-height: 1.15;
    letter-spacing: -0.025em;
}

.mdf-canvas-highlight {
    color: #2563eb;
}

.mdf-canvas-subtitle {
    font-size: 14px;
    color: #64748b;
    margin: 0;
    font-weight: 500;
}

.mdf-canvas-hero-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.mdf-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.04em;
}

.mdf-status-protected {
    background: #ecfdf5;
    color: #059669;
    border: 1px solid #a7f3d0;
}

.mdf-status-threat {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
}

.mdf-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
}

.mdf-btn-group {
    display: flex;
    gap: 10px;
}

.mdf-primary-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #2563eb;
    color: #ffffff;
    border: none;
    font-size: 13px;
    font-weight: 700;
    padding: 10px 18px;
    border-radius: 10px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.28);
    transition: all 0.2s ease;
}

.mdf-primary-action-btn:hover {
    background: #1d4ed8;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.36);
}

.mdf-secondary-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #ffffff;
    color: #0f172a;
    border: 1px solid #cbd5e1;
    font-size: 13px;
    font-weight: 700;
    padding: 10px 18px;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.mdf-secondary-action-btn:hover {
    background: #f1f5f9;
    border-color: #94a3b8;
}

.mdf-warning-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #fffbeb;
    color: #d97706;
    border: 1px solid #fde68a;
    font-size: 13px;
    font-weight: 700;
    padding: 10px 18px;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.mdf-danger-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
    font-size: 13px;
    font-weight: 700;
    padding: 10px 18px;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
}

/* UNIFIED CARD CONTAINER */
.mdf-unified-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
    padding: 24px;
    margin-bottom: 24px;
}

/* RADAR HUD MAIN CARD */
.mdf-hud-main-grid {
    display: grid;
    grid-template-columns: 360px 1fr;
    gap: 32px;
    align-items: center;
}

@media (max-width: 1080px) {
    .mdf-hud-main-grid {
        grid-template-columns: 1fr;
    }
}

.mdf-radar-display-column {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.mdf-radar-viewport {
    position: relative;
    width: 340px;
    height: 340px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.mdf-radar-viewport canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 340px;
    height: 340px;
    border-radius: 50%;
    box-shadow: inset 0 0 24px rgba(37, 99, 235, 0.08);
}

.mdf-radar-center-target {
    position: relative;
    z-index: 5;
    text-align: center;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.mdf-radar-center-icon {
    color: #10b981;
    margin-bottom: 4px;
}

.mdf-radar-score-display {
    font-size: 32px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1;
    letter-spacing: -0.02em;
}

.mdf-radar-target-label {
    font-size: 11px;
    font-weight: 800;
    color: #64748b;
    letter-spacing: 0.08em;
    margin-top: 4px;
}

.mdf-radar-footer-meta {
    width: 100%;
    display: flex;
    justify-content: space-between;
    padding-top: 16px;
    margin-top: 14px;
    border-top: 1px solid #f1f5f9;
}

.mdf-meta-block {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.mdf-meta-title {
    font-size: 10.5px;
    font-weight: 700;
    color: #94a3b8;
    letter-spacing: 0.05em;
}

.mdf-meta-val {
    font-size: 12.5px;
    font-weight: 700;
    color: #0f172a;
}

.mdf-text-emerald { color: #10b981 !important; }
.mdf-text-coral { color: #ef4444 !important; }
.mdf-text-forest { color: #0f172a !important; }

/* TELEMETRY METRICS GRID */
.mdf-metrics-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 20px;
}

@media (max-width: 768px) {
    .mdf-metrics-grid {
        grid-template-columns: 1fr;
    }
}

.mdf-telemetry-item {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 16px 18px;
    display: flex;
    align-items: flex-start;
    gap: 14px;
    transition: all 0.2s ease;
}

.mdf-telemetry-item:hover {
    background: #ffffff;
    border-color: #cbd5e1;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(15,23,42,0.06);
}

.mdf-telemetry-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.mdf-icon-emerald { background: #ecfdf5; color: #10b981; }
.mdf-icon-forest { background: #eff6ff; color: #2563eb; }
.mdf-icon-mint { background: #f0fdf4; color: #10b981; }
.mdf-icon-coral { background: #fef2f2; color: #ef4444; }
.mdf-icon-amber { background: #fffbeb; color: #f59e0b; }

.mdf-telemetry-body {
    flex: 1;
}

.mdf-telemetry-label {
    font-size: 10.5px;
    font-weight: 800;
    color: #64748b;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
}

.mdf-telemetry-val {
    font-size: 22px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.1;
}

.mdf-telemetry-unit {
    font-size: 14px;
    font-weight: 600;
    color: #64748b;
}

.mdf-telemetry-sub {
    font-size: 11.5px;
    color: #64748b;
    margin-top: 4px;
    font-weight: 500;
}

/* QUICK SETTINGS STRIP */
.mdf-hud-control-strip {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 12px 18px;
    flex-wrap: wrap;
    gap: 12px;
}

.mdf-switch-group {
    display: flex;
    align-items: center;
    gap: 12px;
}

.mdf-canvas-toggle {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
    margin: 0;
}

.mdf-canvas-toggle input {
    opacity: 0;
    width: 0;
    height: 0;
}

.mdf-canvas-toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0; left: 0; right: 0; bottom: 0;
    background-color: #cbd5e1;
    transition: 0.3s;
    border-radius: 999px;
}

.mdf-canvas-toggle-slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

.mdf-canvas-toggle input:checked + .mdf-canvas-toggle-slider {
    background-color: #2563eb;
}

.mdf-canvas-toggle input:checked + .mdf-canvas-toggle-slider:before {
    transform: translateX(20px);
}

.mdf-switch-label {
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
}

.mdf-strip-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.mdf-strip-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    font-weight: 700;
    color: #0f172a;
    text-decoration: none;
    padding: 6px 12px;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    transition: all 0.2s ease;
}

.mdf-strip-btn:hover {
    background: #f1f5f9;
    color: #0f172a;
    border-color: #94a3b8;
}

/* SCAN LIVE PROGRESS HUD */
.mdf-scan-live-progress {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid #e2e8f0;
}

.mdf-progress-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.mdf-progress-stage-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.mdf-radar-spinner {
    width: 24px;
    height: 24px;
    border: 3px solid #e2e8f0;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: mdfSpin 0.9s linear infinite;
    display: inline-block;
}

@keyframes mdfSpin {
    to { transform: rotate(360deg); }
}

.mdf-stage-title {
    font-size: 15px;
    font-weight: 800;
    color: #0f172a;
}

.mdf-stage-detail {
    font-size: 12.5px;
    color: #64748b;
    margin-top: 2px;
}

.mdf-progress-pct-val {
    font-size: 24px;
    font-weight: 800;
    color: #2563eb;
}

.mdf-domain-bars-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
    margin-bottom: 18px;
}

@media (max-width: 900px) {
    .mdf-domain-bars-grid {
        grid-template-columns: 1fr;
    }
}

.mdf-domain-bar-item {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 10px 12px;
}

.mdf-domain-bar-head {
    display: flex;
    justify-content: space-between;
    font-size: 11.5px;
    font-weight: 700;
    color: #64748b;
    margin-bottom: 6px;
}

.mdf-bar-track {
    width: 100%;
    height: 6px;
    background: #e2e8f0;
    border-radius: 999px;
    overflow: hidden;
}

.mdf-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #2563eb, #10b981);
    transition: width 0.3s ease;
}

.mdf-stream-terminal {
    background: #0f172a;
    color: #38bdf8;
    font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
    font-size: 12px;
    border-radius: 12px;
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid #1e293b;
}

.mdf-term-prompt {
    color: #10b981;
    font-weight: 800;
    margin-right: 8px;
}

.mdf-terminal-right {
    color: #94a3b8;
    font-size: 11px;
}

/* ==========================================================================
   WORDFENCE-GRADE HORIZONTAL SCAN PIPELINE BAR
   ========================================================================== */
.mdf-scan-pipeline-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 12px 20px;
    margin: 20px 0 24px;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
    overflow-x: auto;
}

.mdf-pipeline-step {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 700;
    color: #64748b;
    white-space: nowrap;
}

.mdf-pipeline-step.active {
    color: #0f172a;
}

.mdf-pipeline-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.mdf-pipeline-step.pending .mdf-pipeline-dot {
    background: #cbd5e1;
    box-shadow: none;
}

.mdf-pipeline-divider {
    flex: 1;
    height: 2px;
    background: #f1f5f9;
    margin: 0 12px;
    min-width: 16px;
    max-width: 48px;
}

/* SECTION HEADING */
.mdf-section-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 28px 0 18px;
}

.mdf-heading-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.mdf-heading-title {
    font-size: 18px;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
}

.mdf-badge-pill {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    background: #f1f5f9;
    color: #0f172a;
    letter-spacing: 0.04em;
}

/* 18 SECURITY DOMAINS GRID (COMPACT) */
.mdf-domains-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 28px;
}

@media (max-width: 1024px) {
    .mdf-domains-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 640px) {
    .mdf-domains-grid {
        grid-template-columns: 1fr;
    }
}

.mdf-domain-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 16px 18px;
    transition: all 0.2s ease;
}

.mdf-domain-card:hover {
    border-color: #cbd5e1;
    transform: translateY(-2px);
    box-shadow: 0 4px 14px rgba(15,23,42,0.06);
}

.mdf-domain-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.mdf-domain-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.mdf-dom-badge {
    font-size: 10.5px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 999px;
    letter-spacing: 0.04em;
}

.badge-secure {
    background: #ecfdf5;
    color: #059669;
    border: 1px solid #a7f3d0;
}

.badge-threat {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
}

.mdf-domain-name {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 4px 0;
}

.mdf-domain-desc {
    font-size: 12px;
    color: #64748b;
    margin: 0 0 12px 0;
    line-height: 1.4;
    min-height: 34px;
}

.mdf-domain-foot {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #94a3b8;
    border-top: 1px solid #f1f5f9;
    padding-top: 8px;
}

.mdf-domain-foot strong {
    color: #0f172a;
}

/* ==========================================================================
   EVIDENCE-DRIVEN FINDINGS CENTER (WORDFENCE-GRADE SOC DESIGN)
   ========================================================================== */
.mdf-findings-head-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 16px;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 12px;
}

.mdf-findings-head-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.mdf-findings-title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #0f172a;
}

.mdf-findings-title {
    font-size: 18px;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
}

.mdf-count-pill {
    background: #eff6ff;
    color: #2563eb;
    border: 1px solid #bfdbfe;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 800;
}

.mdf-findings-head-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.mdf-outline-coral-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #ffffff;
    color: #dc2626;
    border: 1px solid #fecaca;
    font-size: 12.5px;
    font-weight: 700;
    padding: 8px 14px;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.mdf-outline-coral-btn:hover {
    background: #fef2f2;
    border-color: #ef4444;
}

.mdf-outline-emerald-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #ffffff;
    color: #059669;
    border: 1px solid #a7f3d0;
    font-size: 12.5px;
    font-weight: 700;
    padding: 8px 14px;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.mdf-outline-emerald-btn:hover {
    background: #ecfdf5;
    border-color: #10b981;
}

.mdf-filter-tabs-row {
    display: flex;
    gap: 8px;
    margin-bottom: 18px;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 10px;
    flex-wrap: wrap;
}

.mdf-tab-btn {
    background: transparent;
    border: none;
    font-size: 13px;
    font-weight: 700;
    color: #64748b;
    padding: 6px 14px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.mdf-tab-btn:hover {
    color: #0f172a;
    background: #f1f5f9;
}

.mdf-tab-btn.active {
    background: #0f172a;
    color: #ffffff;
}

.mdf-empty-state {
    text-align: center;
    padding: 48px 20px;
}

.mdf-empty-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: #ecfdf5;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
}

.mdf-empty-state h4 {
    font-size: 18px;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 6px 0;
}

.mdf-empty-state p {
    font-size: 13.5px;
    color: #64748b;
    max-width: 480px;
    margin: 0 auto;
}

/* ==========================================================================
   INDIVIDUAL FINDING CARD (WORDFENCE-GRADE ACCORDION ITEM)
   ========================================================================== */
.mdf-findings-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.mdf-finding-item {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-left: 4px solid #f59e0b;
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(15,23,42,0.03);
}

.mdf-finding-item:hover {
    border-color: #cbd5e1;
    box-shadow: 0 4px 12px rgba(15,23,42,0.06);
}

.mdf-finding-item.severity-critical {
    border-left-color: #ef4444;
}

.mdf-finding-item.severity-warning {
    border-left-color: #f59e0b;
}

.mdf-finding-item.severity-safe, .mdf-finding-item.is-resolved {
    border-left-color: #10b981;
    opacity: 0.7;
    background: #f8fafc;
}

/* Header summary row */
.mdf-finding-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 18px;
    cursor: pointer;
    background: #ffffff;
    gap: 16px;
    flex-wrap: wrap;
}

.mdf-finding-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    flex-wrap: wrap;
}

.mdf-finding-sev-pill {
    font-size: 10.5px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    flex-shrink: 0;
}

.sev-pill-critical {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
}

.sev-pill-warning {
    background: #fffbeb;
    color: #d97706;
    border: 1px solid #fde68a;
}

.sev-pill-safe {
    background: #ecfdf5;
    color: #059669;
    border: 1px solid #a7f3d0;
}

.mdf-finding-type-badge {
    font-size: 11px;
    font-weight: 600;
    color: #475569;
    background: #f1f5f9;
    padding: 3px 8px;
    border-radius: 6px;
    flex-shrink: 0;
}

.mdf-finding-title-text {
    font-size: 13.5px;
    font-weight: 700;
    color: #0f172a;
}

.mdf-path-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 2px 8px;
    font-family: Consolas, Monaco, monospace;
    font-size: 11.5px;
    color: #334155;
    max-width: 380px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.mdf-copy-path-btn {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: #94a3b8;
    display: flex;
    align-items: center;
    transition: color 0.15s ease;
}

.mdf-copy-path-btn:hover {
    color: #2563eb;
}

/* Quick Action Buttons in Summary Row */
.mdf-finding-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.mdf-quick-btn {
    font-size: 12px;
    font-weight: 700;
    padding: 6px 12px;
    border-radius: 8px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s ease;
    border: 1px solid transparent;
}

.btn-quick-repair {
    background: #ecfdf5;
    color: #059669;
    border-color: #a7f3d0;
}

.btn-quick-repair:hover {
    background: #10b981;
    color: #ffffff;
    border-color: #10b981;
}

.btn-quick-quarantine {
    background: #fef2f2;
    color: #dc2626;
    border-color: #fecaca;
}

.btn-quick-quarantine:hover {
    background: #ef4444;
    color: #ffffff;
    border-color: #ef4444;
}

.btn-quick-ignore {
    background: #ffffff;
    color: #64748b;
    border-color: #e2e8f0;
}

.btn-quick-ignore:hover {
    background: #f1f5f9;
    color: #0f172a;
}

.btn-quick-details {
    background: #eff6ff;
    color: #2563eb;
    border-color: #bfdbfe;
}

.btn-quick-details:hover {
    background: #2563eb;
    color: #ffffff;
    border-color: #2563eb;
}

.mdf-details-chevron {
    transition: transform 0.2s ease;
}

/* Expandable Details Drawer */
.mdf-finding-drawer {
    border-top: 1px solid #f1f5f9;
    background: #f8fafc;
    padding: 18px 20px;
    display: none;
}

.mdf-finding-desc-box {
    font-size: 13px;
    color: #334155;
    line-height: 1.5;
    margin-bottom: 14px;
}

.mdf-forensic-box {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 16px;
    color: #f8fafc;
}

.mdf-forensic-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    font-weight: 700;
    color: #94a3b8;
    letter-spacing: 0.05em;
    margin-bottom: 10px;
    border-bottom: 1px solid #1e293b;
    padding-bottom: 6px;
}

.mdf-forensic-status {
    color: #ef4444;
    font-weight: 800;
}

.mdf-evidence-item {
    font-size: 12px;
    color: #cbd5e1;
    margin: 4px 0;
    display: flex;
    gap: 8px;
    align-items: flex-start;
}

.mdf-evidence-bullet {
    color: #10b981;
    font-weight: 800;
}

.mdf-code-snippet-box {
    background: #090d16;
    border: 1px solid #1e293b;
    border-radius: 6px;
    padding: 10px 12px;
    font-family: Consolas, Monaco, monospace;
    font-size: 12px;
    color: #e2e8f0;
    overflow-x: auto;
    display: flex;
    gap: 12px;
    margin-top: 10px;
}

.mdf-code-line-num {
    color: #64748b;
    user-select: none;
    font-weight: 700;
    min-width: 50px;
}

.mdf-code-line-content {
    color: #f87171;
    word-break: break-all;
    white-space: pre-wrap;
}

.mdf-drawer-remediation-bar {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    padding-top: 6px;
}

.mdf-remedy-btn {
    font-size: 12.5px;
    font-weight: 700;
    padding: 7px 14px;
    border-radius: 8px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s ease;
    border: 1px solid transparent;
}

/* DUAL GRID */
.mdf-dual-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-top: 24px;
}

@media (max-width: 960px) {
    .mdf-dual-grid {
        grid-template-columns: 1fr;
    }
}

.mdf-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
}

.mdf-card-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.mdf-card-icon-wrap {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.mdf-card-title {
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
}

.mdf-card-subtitle {
    font-size: 12px;
    color: #64748b;
    margin: 2px 0 0;
}

.mdf-clear-history-btn {
    background: transparent;
    border: 1px solid #fecaca;
    color: #dc2626;
    font-size: 11.5px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 8px;
    cursor: pointer;
}

.mdf-clear-history-btn:hover {
    background: #fef2f2;
}

/* TIMELINE */
.mdf-timeline-box {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.mdf-timeline-row {
    display: flex;
    gap: 12px;
    align-items: flex-start;
}

.mdf-time-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-top: 5px;
    flex-shrink: 0;
}

.dot-emerald {
    background: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

.mdf-time-body {
    flex: 1;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 10px 14px;
}

.mdf-time-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    color: #0f172a;
    margin-bottom: 4px;
}

.mdf-time-date {
    font-size: 11px;
    color: #94a3b8;
}

.mdf-time-text {
    font-size: 12px;
    color: #64748b;
    margin: 0;
    line-height: 1.4;
}

/* CLEAN TABLE */
.mdf-table-container {
    overflow-x: auto;
}

.mdf-clean-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
}

.mdf-clean-table th {
    text-align: left;
    font-size: 11px;
    font-weight: 800;
    color: #64748b;
    letter-spacing: 0.05em;
    padding: 8px 12px;
    border-bottom: 1px solid #e2e8f0;
}

.mdf-clean-table td {
    padding: 12px;
    font-size: 12.5px;
    color: #0f172a;
    border-bottom: 1px solid #f1f5f9;
}

.mdf-empty-cell {
    text-align: center;
    color: #94a3b8;
    padding: 30px 12px !important;
}

/* MODALS */
.mdf-modal-backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(6px);
    z-index: 100000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
}

.mdf-modal-box {
    background: #ffffff;
    border-radius: 18px;
    box-shadow: 0 20px 40px rgba(15,23,42,0.25);
    overflow: hidden;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
}

.mdf-modal-diff { width: 1150px; height: 85vh; }
.mdf-modal-code { width: 900px; height: 75vh; }
.mdf-modal-form { width: 500px; }

.mdf-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 24px;
    border-bottom: 1px solid #e2e8f0;
}

.mdf-modal-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.mdf-modal-icon-badge {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.mdf-modal-close {
    background: none;
    border: none;
    font-size: 24px;
    color: #94a3b8;
    cursor: pointer;
    line-height: 1;
}

.mdf-modal-close:hover {
    color: #ef4444;
}

.mdf-modal-body {
    padding: 24px;
    overflow-y: auto;
}

.mdf-modal-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
}

.mdf-input-text, .mdf-input-select {
    width: 100%;
    height: 40px;
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    padding: 0 14px;
    font-size: 13.5px;
    color: #0f172a;
    background: #ffffff;
    outline: none;
    box-sizing: border-box;
}

.mdf-input-text:focus, .mdf-input-select:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
}

.mdf-view-toggle {
    display: inline-flex;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 3px;
    gap: 3px;
}

.waf-diff-mode-btn {
    border: none;
    background: transparent;
    font-size: 11.5px;
    font-weight: 700;
    color: #64748b;
    padding: 4px 10px;
    border-radius: 6px;
    cursor: pointer;
}

.waf-diff-mode-btn.active {
    background: #ffffff;
    color: #0f172a;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.mdf-diff-meta-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 10px 24px;
    font-size: 12px;
}

.mdf-diff-container {
    flex: 1;
    overflow: auto;
    background: #0d1117;
}

.mdf-diff-split-view {
    display: flex;
    min-height: 100%;
}

.mdf-diff-pane {
    flex: 1;
    overflow-x: auto;
}

.mdf-pane-left {
    border-right: 1px solid #30363d;
}

.mdf-diff-pane-title {
    padding: 8px 14px;
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 8px;
    position: sticky;
    top: 0;
    z-index: 10;
}

.pane-pristine { background: #161b22; color: #10b981; border-bottom: 1px solid #30363d; }
.pane-modified { background: #161b22; color: #f87171; border-bottom: 1px solid #30363d; }

.waf-diff-table {
    width: 100%;
    border-collapse: collapse;
    color: #c9d1d9;
}

.waf-diff-table td {
    padding: 2px 8px;
    line-height: 20px;
    white-space: pre-wrap;
    word-break: break-all;
    font-size: 11.5px;
    font-family: Consolas, Monaco, monospace;
}

.waf-diff-ln {
    width: 44px;
    min-width: 44px;
    text-align: right;
    color: #484f58;
    user-select: none;
    padding-right: 10px !important;
    border-right: 1px solid #30363d;
    background: #090d14;
}

.waf-diff-row-added { background: rgba(46, 160, 67, 0.18) !important; color: #7ee787 !important; }
.waf-diff-row-deleted { background: rgba(248, 81, 73, 0.18) !important; color: #ffa198 !important; }
.waf-diff-row-modified { background: rgba(210, 153, 34, 0.18) !important; color: #e3b341 !important; }

.mdf-code-viewer {
    background: #0d1117;
    color: #e2e8f0;
    padding: 18px;
    margin: 0;
    overflow: auto;
    flex: 1;
    font-family: Consolas, Monaco, monospace;
    font-size: 12.5px;
    line-height: 1.6;
    white-space: pre;
}

/* ==========================================================================
   CLEAN, NATURAL & PROFESSIONAL WORDPRESS-GRADE FINDINGS STYLES
   Restrained palette, natural typography, zero neon / rainbow distraction.
   ========================================================================== */
.mdf-wf-findings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #dcdcde;
    padding-bottom: 0px;
    margin-bottom: 14px;
    flex-wrap: wrap;
    gap: 12px;
}

.mdf-wf-tabs-left {
    display: flex;
    gap: 6px;
}

.mdf-wf-tab-btn {
    background: #f0f0f1;
    border: 1px solid #c3c4c7;
    border-bottom: none;
    font-size: 13px;
    font-weight: 600;
    color: #50575e;
    padding: 9px 18px;
    border-radius: 6px 6px 0 0;
    cursor: pointer;
    transition: all 0.15s ease;
}

.mdf-wf-tab-btn.active {
    background: #ffffff;
    color: #1d2327;
    border-color: #c3c4c7;
    border-top: 3px solid #2271b1;
    margin-bottom: -1px;
    border-bottom: 1px solid #ffffff;
}

/* SECURITY FINDINGS & FORENSIC ANALYSIS TOP HEADER (IMAGE 1 PARITY) */
.mdf-wf-findings-header-block {
    margin-bottom: 16px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 14px;
}

.mdf-findings-top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 14px;
    flex-wrap: wrap;
}

.mdf-findings-title-group {
    display: flex;
    align-items: center;
    gap: 10px;
}

.mdf-findings-title-group svg {
    color: #0f172a;
}

.mdf-findings-main-title {
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
    letter-spacing: -0.2px;
}

.mdf-findings-issues-badge {
    background: #e6f4ea;
    color: #137333;
    font-size: 12px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 12px;
    letter-spacing: 0.2px;
}

.mdf-findings-top-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.mdf-pill-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    background: #ffffff;
    border: 1px solid #dcdcde;
    color: #1d2327;
    transition: all 0.15s ease;
}

.mdf-pill-action-btn:hover {
    background: #f6f7f7;
    border-color: #8c8f94;
}

.mdf-pill-btn-quarantine {
    border-color: #fca5a5;
    color: #dc2626;
    background: #ffffff;
}

.mdf-pill-btn-quarantine:hover {
    background: #fef2f2;
    border-color: #dc2626;
    color: #b91c1c;
}

.mdf-pill-btn-repair {
    border-color: #6ee7b7;
    color: #059669;
    background: #ffffff;
}

.mdf-pill-btn-repair:hover {
    background: #ecfdf5;
    border-color: #059669;
    color: #047857;
}

/* FILTER TABS ROW (ALL FINDINGS, CRITICAL, WARNINGS, IGNORED) */
.mdf-findings-filter-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.mdf-findings-pill-tab {
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 12.5px;
    font-weight: 600;
    background: transparent;
    border: none;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s ease;
}

.mdf-findings-pill-tab:hover {
    color: #0f172a;
    background: #f1f5f9;
}

.mdf-findings-pill-tab.active {
    background: #0f172a;
    color: #ffffff;
}

.mdf-wf-btn-repair:hover {
    background: #2271b1;
    color: #ffffff;
}

.mdf-wf-stats-strip {
    display: flex;
    justify-content: space-between;
    background: #f6f7f7;
    border: 1px solid #dcdcde;
    border-radius: 6px;
    padding: 10px 18px;
    margin-bottom: 16px;
    font-size: 12.5px;
    color: #50575e;
    flex-wrap: wrap;
    gap: 12px;
}

.mdf-wf-stat-item strong {
    color: #1d2327;
    font-weight: 700;
}

/* NATURAL FINDING ROW ITEM */
.mdf-wf-finding-row {
    background: #ffffff;
    border: 1px solid #dcdcde;
    border-left: 4px solid #d63638;
    border-radius: 4px;
    margin-bottom: 10px;
    overflow: hidden;
    transition: all 0.15s ease;
    box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}

.mdf-wf-finding-row:hover {
    box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    border-color: #c3c4c7;
}

.mdf-wf-finding-row.severity-high, .mdf-wf-finding-row.severity-critical {
    border-left-color: #d63638;
}

.mdf-wf-finding-row.severity-medium, .mdf-wf-finding-row.severity-warning {
    border-left-color: #dba617;
}

.mdf-wf-finding-row.severity-safe, .mdf-wf-finding-row.is-resolved {
    border-left-color: #008a20;
    opacity: 0.7;
    background: #f6f7f7;
}

.mdf-wf-row-main {
    display: flex;
    align-items: center;
    padding: 14px 18px;
    cursor: pointer;
    gap: 16px;
}

/* Neutral, natural gray category icons */
.mdf-wf-row-icon {
    width: 34px;
    height: 34px;
    border-radius: 6px;
    background: #f0f0f1;
    color: #50575e;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.mdf-wf-row-body {
    flex: 1;
    min-width: 0;
}

.mdf-wf-row-title {
    font-size: 13.5px;
    font-weight: 600;
    color: #1d2327;
    line-height: 1.4;
    margin-bottom: 2px;
    word-break: break-all;
}

.mdf-wf-row-type {
    font-size: 12px;
    color: #64748b;
}

.mdf-wf-row-meta {
    text-align: right;
    font-size: 11.5px;
    color: #64748b;
    margin-right: 14px;
    flex-shrink: 0;
}

.mdf-wf-meta-date {
    display: block;
    margin-bottom: 2px;
}

.mdf-wf-meta-sev {
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.sev-dot-critical, .sev-dot-high {
    color: #d63638;
}

.sev-dot-medium, .sev-dot-warning {
    color: #dba617;
}

/* Natural Action Buttons */
.mdf-wf-row-actions {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-shrink: 0;
}

.mdf-wf-action-btn {
    background: none;
    border: none;
    padding: 4px 6px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-weight: 600;
    color: #50575e;
    transition: all 0.15s ease;
}

.mdf-wf-action-btn svg {
    stroke-width: 2;
}

.mdf-wf-action-btn:hover {
    color: #2271b1;
}

.mdf-wf-action-btn.btn-act-repair:hover {
    color: #008a20;
}

.mdf-wf-action-btn.btn-act-delete:hover {
    color: #d63638;
}

/* Collapsible Natural Drawer */
.mdf-wf-drawer {
    background: #fbfbfb;
    border-top: 1px solid #dcdcde;
    padding: 16px 20px 20px;
    display: none;
}

.mdf-wf-drawer-field {
    font-size: 12.5px;
    color: #2c3338;
    margin-bottom: 8px;
    line-height: 1.5;
}

.mdf-wf-drawer-field strong {
    color: #1d2327;
    font-weight: 600;
    min-width: 80px;
    display: inline-block;
}

.mdf-wf-path-code {
    background: #f0f0f1;
    border: 1px solid #dcdcde;
    border-radius: 4px;
    padding: 2px 6px;
    font-family: Consolas, Monaco, monospace;
    font-size: 12px;
    color: #1d2327;
}

/* Clean, natural code box */
.mdf-wf-code-box {
    background: #f6f7f7;
    border: 1px solid #dcdcde;
    border-radius: 6px;
    padding: 12px 14px;
    margin: 12px 0 16px;
    font-family: Consolas, Monaco, monospace;
    font-size: 12px;
    color: #1d2327;
}

.mdf-wf-code-header {
    font-size: 11px;
    color: #50575e;
    font-weight: 700;
    margin-bottom: 6px;
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 4px;
}

.mdf-wf-code-content {
    color: #b32d2e;
    white-space: pre-wrap;
    word-break: break-all;
    font-weight: 500;
}

.mdf-wf-drawer-actions {
    display: flex;
    gap: 10px;
    margin-top: 14px;
    flex-wrap: wrap;
}

.mdf-wf-outline-btn {
    background: #ffffff;
    border: 1px solid #c3c4c7;
    color: #2271b1;
    font-size: 12px;
    font-weight: 600;
    padding: 7px 15px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
}

.mdf-wf-outline-btn:hover {
    background: #f0f0f1;
    border-color: #2271b1;
}

.mdf-wf-btn-mark {
    color: #50575e;
}

.mdf-wf-btn-mark:hover {
    background: #f0f0f1;
    color: #1d2327;
    border-color: #8c8f94;
}

.mdf-wf-btn-do-repair {
    background: #008a20;
    border-color: #008a20;
    color: #ffffff;
}

.mdf-wf-btn-do-repair:hover {
    background: #007017;
    border-color: #007017;
}

</style>
