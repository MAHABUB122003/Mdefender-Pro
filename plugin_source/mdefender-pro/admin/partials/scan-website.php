<?php
/**
 * MDefender Pro - Autonomous Security Radar & Website Security Scan
 * 
 * Clean, modern white enterprise dashboard theme matching MDefender Pro core.
 * Features:
 * - Prominent Large Autonomous Security Radar HUD (Canvas)
 * - 18 Security Domains Telemetry Matrix
 * - Asynchronous Micro-Batch Queues (Zero heavy synchronous requests)
 * - Evidence-Driven Threat Findings Center with Safe Quarantine & Visual Diff
 * - Security Event Timeline & Historical Audits
 *
 * @package MDefender_Pro
 */

defined('ABSPATH') || exit;

// Retrieve configuration options
$scheduled_enabled = get_option('waf_fw_scheduled_scan_enabled', 'yes');
$scheduled_interval = get_option('waf_fw_scheduled_scan_interval', 'weekly');
$scheduled_email = get_option('waf_fw_scheduled_scan_email', get_option('admin_email'));
$continuous_monitoring = get_option('waf_fw_continuous_monitoring', 'yes');
?>

<div class="mdf-radar-wrapper" id="mdfRadarWrapper">

    <!-- TOP AUTONOMOUS RADAR HERO CARD (CLEAN WHITE ENTERPRISE HUD) -->
    <div class="mdf-card mdf-hud-hero-card">
        <!-- Top Row: Title, Global Status & Actions -->
        <div class="mdf-hud-top-row">
            <div class="mdf-hud-brand">
                <div class="mdf-live-pill">
                    <span class="mdf-live-dot"></span>
                    <span class="mdf-live-label">AUTONOMOUS RADAR ACTIVE</span>
                </div>
                <h2 class="mdf-hud-title">MDefender Security Radar</h2>
                <p class="mdf-hud-subtitle">Continuous Real-Time Website Monitoring, File Integrity & Cloud ML Defense</p>
            </div>

            <!-- Global Status Badge & Action Buttons -->
            <div class="mdf-hud-actions-stack">
                <div class="mdf-status-badge mdf-status-protected" id="mdfGlobalStatusPill">
                    <span class="mdf-status-dot" id="mdfGlobalStatusDot"></span>
                    <span class="mdf-status-text" id="mdfGlobalStatusText">SYSTEM PROTECTED</span>
                </div>

                <div class="mdf-btn-group">
                    <button type="button" class="button button-primary mdf-btn-primary" id="wafStartFullScan">
                        <span class="dashicons dashicons-shield-alt"></span>
                        <span>START FULL SCAN</span>
                    </button>
                    <button type="button" class="button mdf-btn-secondary" id="wafStartQuickScan">
                        <span class="dashicons dashicons-performance"></span>
                        <span>QUICK SCAN</span>
                    </button>
                    <button type="button" class="button mdf-btn-warning" id="wafPauseScan" style="display:none;">
                        <span class="dashicons dashicons-controls-pause"></span>
                        <span>Pause</span>
                    </button>
                    <button type="button" class="button mdf-btn-danger" id="wafCancelScan" style="display:none;">
                        <span class="dashicons dashicons-no-alt"></span>
                        <span>Cancel</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Radar Main Grid: Large Radar Canvas on Left + Live Metrics on Right -->
        <div class="mdf-hud-main-grid">
            <!-- Left: Large High-Resolution Autonomous Radar Display -->
            <div class="mdf-radar-display-column">
                <div class="mdf-radar-viewport">
                    <canvas id="mdfRadarCanvas" width="360" height="360"></canvas>
                    <div class="mdf-radar-center-target">
                        <span class="dashicons dashicons-shield"></span>
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
                        <strong class="mdf-meta-val mdf-text-blue" id="mdfSweepStatus">Active Continuous</strong>
                    </div>
                </div>
            </div>

            <!-- Right: Real-Time Telemetry Metrics Grid -->
            <div class="mdf-metrics-column">
                <div class="mdf-metrics-grid">
                    <!-- Metric 1: Security Health Score -->
                    <div class="mdf-stat-card">
                        <div class="mdf-stat-icon-wrap mdf-icon-emerald">
                            <span class="dashicons dashicons-heart"></span>
                        </div>
                        <div class="mdf-stat-body">
                            <div class="mdf-stat-label">SECURITY HEALTH</div>
                            <div class="mdf-stat-value" id="wafScanScore">100<span class="mdf-stat-unit">/100</span></div>
                            <div class="mdf-stat-sub mdf-text-emerald" id="mdfHealthSub">A+ Pristine Integrity</div>
                        </div>
                    </div>

                    <!-- Metric 2: Files Monitored -->
                    <div class="mdf-stat-card">
                        <div class="mdf-stat-icon-wrap mdf-icon-blue">
                            <span class="dashicons dashicons-media-document"></span>
                        </div>
                        <div class="mdf-stat-body">
                            <div class="mdf-stat-label">FILES MONITORED</div>
                            <div class="mdf-stat-value" id="wafSummaryFilesCount">6,120</div>
                            <div class="mdf-stat-sub">SHA-256 Baseline Tracked</div>
                        </div>
                    </div>

                    <!-- Metric 3: Components Audited -->
                    <div class="mdf-stat-card">
                        <div class="mdf-stat-icon-wrap mdf-icon-indigo">
                            <span class="dashicons dashicons-admin-plugins"></span>
                        </div>
                        <div class="mdf-stat-body">
                            <div class="mdf-stat-label">COMPONENTS AUDITED</div>
                            <div class="mdf-stat-value" id="wafSummaryThemesCount">18 Modules</div>
                            <div class="mdf-stat-sub">Core, Plugins, Themes & DB</div>
                        </div>
                    </div>

                    <!-- Metric 4: Active Threats -->
                    <div class="mdf-stat-card">
                        <div class="mdf-stat-icon-wrap mdf-icon-red">
                            <span class="dashicons dashicons-warning"></span>
                        </div>
                        <div class="mdf-stat-body">
                            <div class="mdf-stat-label">ACTIVE THREATS</div>
                            <div class="mdf-stat-value mdf-text-red" id="wafCriticalCount">0</div>
                            <div class="mdf-stat-sub" id="mdfThreatSub">0 Actionable Threats</div>
                        </div>
                    </div>

                    <!-- Metric 5: Last Deep Analysis -->
                    <div class="mdf-stat-card">
                        <div class="mdf-stat-icon-wrap mdf-icon-purple">
                            <span class="dashicons dashicons-clock"></span>
                        </div>
                        <div class="mdf-stat-body">
                            <div class="mdf-stat-label">LAST DEEP ANALYSIS</div>
                            <div class="mdf-stat-value mdf-text-sm" id="wafScanDate">Just now</div>
                            <div class="mdf-stat-sub" id="wafScanDuration">Duration: 1m 42s</div>
                        </div>
                    </div>

                    <!-- Metric 6: Monitoring Uptime -->
                    <div class="mdf-stat-card">
                        <div class="mdf-stat-icon-wrap mdf-icon-amber">
                            <span class="dashicons dashicons-dashboard"></span>
                        </div>
                        <div class="mdf-stat-body">
                            <div class="mdf-stat-label">AUTONOMOUS UPTIME</div>
                            <div class="mdf-stat-value">99.98%</div>
                            <div class="mdf-stat-sub">Micro-Batch Queue Watcher</div>
                        </div>
                    </div>
                </div>

                <!-- Bottom Quick Settings Strip -->
                <div class="mdf-hud-control-strip">
                    <div class="mdf-switch-group">
                        <label class="mdf-switch">
                            <input type="checkbox" id="mdfContinuousMonitoringToggle" <?php checked($continuous_monitoring, 'yes'); ?>>
                            <span class="mdf-slider round"></span>
                        </label>
                        <span class="mdf-switch-label">Continuous Real-Time Monitoring</span>
                    </div>

                    <div class="mdf-strip-actions">
                        <a href="#" id="wafOpenScheduleBtn" class="mdf-strip-btn">
                            <span class="dashicons dashicons-calendar-alt"></span>
                            <span>Scan Scheduling</span>
                        </a>
                        <a href="#" id="wafEmailReportBtn" class="mdf-strip-btn">
                            <span class="dashicons dashicons-email"></span>
                            <span>Email Report</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <!-- Live Scanning Progress Telemetry HUD (Shown when scan is active) -->
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
                    <span id="wafScannedFileCount">0</span> / <span id="wafTotalFileCount">6,120</span> files &bull; Elapsed: <span id="wafScanElapsed">0s</span>
                </div>
            </div>
        </div>
    </div>

    <!-- 18 SECURITY DOMAINS RADAR MATRIX -->
    <div class="mdf-section-heading">
        <div class="mdf-heading-left">
            <span class="dashicons dashicons-networking mdf-heading-icon"></span>
            <h3 class="mdf-heading-title">18 Security Domains Radar Matrix</h3>
        </div>
        <span class="mdf-badge-pill">CONTINUOUS AUTONOMOUS MONITORING</span>
    </div>

    <div class="mdf-domains-grid" id="mdfDomainsGrid">
        <!-- 1. Filesystem -->
        <div class="mdf-domain-card" data-domain="filesystem" id="domain-card-filesystem">
            <div class="mdf-domain-head">
                <div class="mdf-domain-icon mdf-icon-blue"><span class="dashicons dashicons-portfolio"></span></div>
                <span class="mdf-dom-badge badge-secure" id="badge-domain-filesystem">SECURE</span>
            </div>
            <h4 class="mdf-domain-name">Filesystem Sentinel</h4>
            <p class="mdf-domain-desc">New, modified, deleted & executable files in uploads</p>
            <div class="mdf-domain-foot">
                <span>Checked: <strong class="domain-time">Just now</strong></span>
                <span><strong class="domain-count">0</strong> findings</span>
            </div>
        </div>

        <!-- 2. Malware -->
        <div class="mdf-domain-card" data-domain="malware" id="domain-card-malware">
            <div class="mdf-domain-head">
                <div class="mdf-domain-icon mdf-icon-emerald"><span class="dashicons dashicons-shield"></span></div>
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
                <div class="mdf-domain-icon mdf-icon-red"><span class="dashicons dashicons-code-standards"></span></div>
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
                <div class="mdf-domain-icon mdf-icon-indigo"><span class="dashicons dashicons-yes-alt"></span></div>
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
                <div class="mdf-domain-icon mdf-icon-blue"><span class="dashicons dashicons-wordpress"></span></div>
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
                <div class="mdf-domain-icon mdf-icon-purple"><span class="dashicons dashicons-admin-plugins"></span></div>
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
                <div class="mdf-domain-icon mdf-icon-amber"><span class="dashicons dashicons-admin-appearance"></span></div>
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
                <div class="mdf-domain-icon mdf-icon-emerald"><span class="dashicons dashicons-database"></span></div>
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
                <div class="mdf-domain-icon mdf-icon-indigo"><span class="dashicons dashicons-admin-users"></span></div>
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
                <div class="mdf-domain-icon mdf-icon-blue"><span class="dashicons dashicons-admin-generic"></span></div>
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
                <div class="mdf-domain-icon mdf-icon-red"><span class="dashicons dashicons-hidden"></span></div>
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
                <div class="mdf-domain-icon mdf-icon-amber"><span class="dashicons dashicons-warning"></span></div>
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
                <div class="mdf-domain-icon mdf-icon-purple"><span class="dashicons dashicons-list-view"></span></div>
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
                <div class="mdf-domain-icon mdf-icon-blue"><span class="dashicons dashicons-desktop"></span></div>
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
                <div class="mdf-domain-icon mdf-icon-emerald"><span class="dashicons dashicons-edit"></span></div>
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
                <div class="mdf-domain-icon mdf-icon-indigo"><span class="dashicons dashicons-cloud"></span></div>
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
                <div class="mdf-domain-icon mdf-icon-red"><span class="dashicons dashicons-external"></span></div>
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
                <div class="mdf-domain-icon mdf-icon-amber"><span class="dashicons dashicons-format-aside"></span></div>
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

    <!-- EVIDENCE-DRIVEN THREAT FINDINGS CENTER -->
    <div class="mdf-card mdf-findings-card" id="wafScanResults">
        <div class="mdf-findings-head-row">
            <div class="mdf-findings-head-left">
                <h3 class="mdf-findings-title">
                    <span class="dashicons dashicons-shield"></span>
                    <span>Security Findings & Forensic Analysis</span>
                </h3>
                <span class="mdf-count-pill" id="wafResultsFoundCount">0 Issues</span>
            </div>

            <!-- Action Buttons -->
            <div class="mdf-findings-head-actions">
                <button type="button" class="button" id="wafToggleAllDetailsBtn">
                    <span class="dashicons dashicons-editor-expand"></span>
                    <span id="wafToggleAllText">Expand All</span>
                </button>
                <button type="button" class="button mdf-btn-danger-outline" id="wafBulkCleanBtn">
                    <span class="dashicons dashicons-trash"></span>
                    <span>Quarantine All Threats</span>
                </button>
                <button type="button" class="button mdf-btn-emerald-outline" id="wafBulkRestoreBtn">
                    <span class="dashicons dashicons-update"></span>
                    <span>Repair All Core Files</span>
                </button>
            </div>
        </div>

        <!-- Filter Tabs -->
        <div class="mdf-filter-tabs-row">
            <button type="button" class="mdf-tab-btn active" data-tab="all">All Findings (<span id="wafTabAllCount">0</span>)</button>
            <button type="button" class="mdf-tab-btn tab-critical" data-tab="critical">Critical Threats (<span id="wafTabCriticalCount">0</span>)</button>
            <button type="button" class="mdf-tab-btn tab-warning" data-tab="warning">Warnings (<span id="wafTabWarningCount">0</span>)</button>
            <button type="button" class="mdf-tab-btn tab-ignored" data-tab="ignored">Ignored (<span id="wafTabIgnoredCount">0</span>)</button>
        </div>

        <!-- Findings List -->
        <div id="wafScanDetails" class="mdf-findings-list">
            <div class="mdf-empty-state" id="mdfNoFindingsState">
                <div class="mdf-empty-icon"><span class="dashicons dashicons-yes-alt"></span></div>
                <h4>Zero Threats Detected</h4>
                <p>Your WordPress files, core checksums, database and server configuration match pristine baseline integrity.</p>
            </div>
        </div>
    </div>

    <!-- SECURITY TIMELINE & SCAN HISTORY DUAL GRID -->
    <div class="mdf-dual-grid">
        <!-- Security Event Timeline -->
        <div class="mdf-card">
            <div class="mdf-card-header">
                <div class="mdf-card-header-left">
                    <span class="dashicons dashicons-backup mdf-card-icon mdf-text-blue"></span>
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
        <div class="mdf-card">
            <div class="mdf-card-header">
                <div class="mdf-card-header-left">
                    <span class="dashicons dashicons-analytics mdf-card-icon mdf-text-indigo"></span>
                    <div>
                        <h3 class="mdf-card-title">Scan History</h3>
                        <p class="mdf-card-subtitle">Historical audits and deep diagnostic reports.</p>
                    </div>
                </div>
                <button type="button" class="button button-small" id="wafClearHistory" style="color:#dc2626;">Clear History</button>
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
                <span class="dashicons dashicons-randomize mdf-text-blue" style="font-size:20px;width:20px;height:20px;"></span>
                <div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <strong id="wafDiffFileName" style="font-size:14px;color:#0f172a;">wp-includes/version.php</strong>
                        <span id="wafDiffWpVersion" class="mdf-badge-pill">WordPress Core</span>
                    </div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px;">Compare local modified file against pristine official WordPress.org release version</div>
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
                <span style="color:#475569;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;margin-right:6px;"></span>Official (WordPress.org): <strong id="wafDiffOriginalMeta">Loading...</strong></span>
                <span style="color:#475569;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;margin-right:6px;"></span>Local Disk: <strong id="wafDiffLocalMeta">Loading...</strong></span>
            </div>
            <div id="wafDiffLineStats" style="font-weight:600;font-family:monospace;font-size:12px;">
                <span style="color:#059669;">+0 additions</span> &bull; <span style="color:#dc2626;">-0 deletions</span>
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
                            <span class="dashicons dashicons-yes-alt"></span>
                            ORIGINAL WORDPRESS.ORG FILE (PRISTINE)
                        </div>
                        <table class="waf-diff-table" id="wafDiffLeftTable"></table>
                    </div>
                    <div class="mdf-diff-pane mdf-pane-right">
                        <div class="mdf-diff-pane-title pane-modified">
                            <span class="dashicons dashicons-warning"></span>
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
            <div style="font-size:12px;color:#64748b;display:flex;align-items:center;gap:6px;">
                <span class="dashicons dashicons-shield text-blue" style="font-size:16px;width:16px;height:16px;"></span>
                <span>Restoring will safely backup this file to <code>wp-content/mdefender-backups/</code> before restoring official code.</span>
            </div>
            <div style="display:flex;gap:8px;">
                <button type="button" class="button" id="wafDiffCancelBtn">Close</button>
                <button type="button" class="button" id="wafDiffIgnoreBtn">Ignore This Issue</button>
                <button type="button" class="button button-primary" id="wafDiffRestoreBtn" style="background:#059669;border-color:#059669;">
                    <span class="dashicons dashicons-update" style="margin-top:2px;"></span>
                    Restore to Pristine Official Version
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
                <span class="dashicons dashicons-media-code mdf-text-blue"></span>
                <strong id="wafCodeModalTitle" style="font-size:14px;color:#0f172a;">File Source Inspector</strong>
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
            <strong style="font-size:16px;color:#0f172a;">Autonomous Scan Scheduling</strong>
            <button type="button" id="wafScheduleModalClose" class="mdf-modal-close">&times;</button>
        </div>
        <div class="mdf-modal-body">
            <p style="font-size:13px;color:#64748b;margin:0 0 16px;">Configure periodic deep background security scans powered by WP-Cron with zero performance impact.</p>
            
            <div style="margin-bottom:14px;">
                <label style="display:flex;align-items:center;gap:8px;font-weight:600;font-size:13px;color:#0f172a;cursor:pointer;">
                    <input type="checkbox" id="wafScheduledScanEnabled" value="yes" <?php checked($scheduled_enabled, 'yes'); ?>>
                    Enable Automated Background Deep Scans
                </label>
            </div>

            <div style="margin-bottom:14px;">
                <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Frequency:</label>
                <select id="wafScheduledScanInterval" style="width:100%;height:36px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;">
                    <option value="daily" <?php selected($scheduled_interval, 'daily'); ?>>Daily Deep Scan</option>
                    <option value="weekly" <?php selected($scheduled_interval, 'weekly'); ?>>Weekly Deep Scan (Recommended)</option>
                    <option value="monthly" <?php selected($scheduled_interval, 'monthly'); ?>>Monthly Deep Scan</option>
                </select>
            </div>

            <div style="margin-bottom:16px;">
                <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Email Security Report to:</label>
                <input type="email" id="wafScheduledScanEmail" value="<?php echo esc_attr($scheduled_email); ?>" style="width:100%;height:36px;border-radius:6px;border:1px solid #cbd5e1;padding:0 12px;font-size:13px;box-sizing:border-box;">
            </div>
        </div>
        <div class="mdf-modal-footer">
            <button type="button" class="button" id="wafScheduleCancel">Cancel</button>
            <button type="button" class="button button-primary" id="wafScheduleSave">Save Schedule</button>
        </div>
    </div>
</div>

<!-- Email Report Modal -->
<div id="wafEmailModal" class="mdf-modal-backdrop" style="display:none;">
    <div class="mdf-modal-box mdf-modal-form">
        <div class="mdf-modal-header">
            <strong style="font-size:16px;color:#0f172a;">Email Security Assessment</strong>
            <button type="button" id="wafEmailModalClose" class="mdf-modal-close">&times;</button>
        </div>
        <div class="mdf-modal-body">
            <p style="font-size:13px;color:#64748b;margin:0 0 16px;">Send the full scan assessment and threat findings to your email inbox.</p>
            <input type="email" id="wafReportEmail" value="<?php echo esc_attr(get_option('admin_email')); ?>" style="width:100%;height:36px;border-radius:6px;border:1px solid #cbd5e1;padding:0 12px;font-size:13px;box-sizing:border-box;margin-bottom:16px;">
        </div>
        <div class="mdf-modal-footer">
            <button type="button" class="button" id="wafEmailCancel">Cancel</button>
            <button type="button" class="button button-primary" id="wafEmailSend">Send Report</button>
        </div>
    </div>
</div>

<style>
/* ==========================================================================
   MDefender Pro - Autonomous Security Radar Design System (Clean White Theme)
   ========================================================================== */

.mdf-radar-wrapper {
    max-width: 1400px;
    margin: 20px auto 40px 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
    color: #334155;
    box-sizing: border-box;
}

.mdf-radar-wrapper *, .mdf-radar-wrapper *::before, .mdf-radar-wrapper *::after {
    box-sizing: border-box;
}

/* CARDS */
.mdf-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    margin-bottom: 24px;
}

/* HUD HERO CARD */
.mdf-hud-hero-card {
    border-top: 3px solid #2563eb;
}

.mdf-hud-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 18px;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 16px;
}

.mdf-hud-brand {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.mdf-live-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    padding: 3px 10px;
    border-radius: 999px;
    width: fit-content;
    font-size: 11px;
    font-weight: 700;
    color: #1d4ed8;
    letter-spacing: 0.04em;
}

.mdf-live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #2563eb;
    box-shadow: 0 0 6px #2563eb;
    animation: mdfLivePulse 1.4s infinite ease-in-out;
}

@keyframes mdfLivePulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(0.85); opacity: 0.35; }
}

.mdf-hud-title {
    margin: 2px 0 0 0;
    font-size: 20px;
    font-weight: 800;
    color: #0f172a;
}

.mdf-hud-subtitle {
    margin: 0;
    font-size: 13px;
    color: #64748b;
}

.mdf-hud-actions-stack {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
}

.mdf-status-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    color: #065f46;
}

.mdf-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

.mdf-btn-group {
    display: flex;
    gap: 8px;
    align-items: center;
}

.mdf-btn-primary {
    font-weight: 700 !important;
    font-size: 13.5px !important;
    height: 40px !important;
    line-height: 38px !important;
    padding: 0 20px !important;
    border-radius: 6px !important;
    background: #2563eb !important;
    border-color: #1d4ed8 !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 6px !important;
    box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25) !important;
}

.mdf-btn-secondary {
    font-weight: 700 !important;
    font-size: 13px !important;
    height: 40px !important;
    line-height: 38px !important;
    padding: 0 16px !important;
    border-radius: 6px !important;
    background: #f0f9ff !important;
    border-color: #bae6fd !important;
    color: #0284c7 !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 6px !important;
}

.mdf-btn-warning {
    background: #f59e0b !important;
    border-color: #f59e0b !important;
    color: #fff !important;
    height: 40px !important;
}

.mdf-btn-danger {
    background: #ef4444 !important;
    border-color: #ef4444 !important;
    color: #fff !important;
    height: 40px !important;
}

/* MAIN HUD GRID */
.mdf-hud-main-grid {
    display: grid;
    grid-template-columns: 380px 1fr;
    gap: 28px;
    align-items: center;
}

@media (max-width: 1080px) {
    .mdf-hud-main-grid {
        grid-template-columns: 1fr;
    }
}

/* RADAR CANVAS DISPLAY */
.mdf-radar-display-column {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: #0f172a;
    border-radius: 14px;
    padding: 16px;
    border: 1px solid #1e293b;
    box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
}

.mdf-radar-viewport {
    position: relative;
    width: 330px;
    height: 330px;
    display: flex;
    align-items: center;
    justify-content: center;
}

#mdfRadarCanvas {
    width: 330px;
    height: 330px;
}

.mdf-radar-center-target {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: radial-gradient(circle, #0f172a 0%, #070b14 100%);
    border: 2px solid #38bdf8;
    box-shadow: 0 0 20px rgba(56, 189, 248, 0.4);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #38bdf8;
    pointer-events: none;
}

.mdf-radar-center-target .dashicons {
    font-size: 22px;
    width: 22px;
    height: 22px;
}

.mdf-radar-score-display {
    font-size: 13px;
    font-weight: 800;
    color: #ffffff;
    margin-top: -3px;
}

.mdf-radar-target-label {
    font-size: 9px;
    font-weight: 700;
    color: #94a3b8;
    letter-spacing: 0.05em;
}

.mdf-radar-footer-meta {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.mdf-meta-block {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.mdf-meta-title {
    font-size: 10px;
    font-weight: 700;
    color: #64748b;
    letter-spacing: 0.05em;
}

.mdf-meta-val {
    font-size: 11.5px;
    color: #cbd5e1;
}

.mdf-text-blue { color: #38bdf8 !important; }
.mdf-text-emerald { color: #059669 !important; }
.mdf-text-red { color: #dc2626 !important; }
.mdf-text-indigo { color: #4f46e5 !important; }

/* METRICS GRID */
.mdf-metrics-column {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.mdf-metrics-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
}

@media (max-width: 768px) {
    .mdf-metrics-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 500px) {
    .mdf-metrics-grid {
        grid-template-columns: 1fr;
    }
}

.mdf-stat-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 16px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    transition: all 0.2s ease;
}

.mdf-stat-card:hover {
    background: #ffffff;
    border-color: #cbd5e1;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.mdf-stat-icon-wrap {
    width: 38px;
    height: 38px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.mdf-stat-icon-wrap .dashicons {
    font-size: 20px;
    width: 20px;
    height: 20px;
}

.mdf-icon-emerald { background: #ecfdf5; color: #059669; }
.mdf-icon-blue { background: #eff6ff; color: #2563eb; }
.mdf-icon-indigo { background: #eef2ff; color: #4f46e5; }
.mdf-icon-red { background: #fef2f2; color: #dc2626; }
.mdf-icon-purple { background: #faf5ff; color: #9333ea; }
.mdf-icon-amber { background: #fffbeb; color: #d97706; }

.mdf-stat-body {
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.mdf-stat-label {
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
    letter-spacing: 0.03em;
}

.mdf-stat-value {
    font-size: 22px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
    margin: 2px 0;
}

.mdf-stat-unit {
    font-size: 13px;
    color: #64748b;
    font-weight: 600;
}

.mdf-text-sm {
    font-size: 14px;
}

.mdf-stat-sub {
    font-size: 11px;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* STRIP CONTROL */
.mdf-hud-control-strip {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 14px;
    flex-wrap: wrap;
    gap: 12px;
}

.mdf-switch-group {
    display: flex;
    align-items: center;
    gap: 10px;
}

.mdf-switch-label {
    font-size: 12.5px;
    font-weight: 600;
    color: #334155;
}

/* SWITCH UI */
.mdf-switch {
    position: relative;
    display: inline-block;
    width: 36px;
    height: 20px;
}

.mdf-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.mdf-slider {
    position: absolute;
    cursor: pointer;
    top: 0; left: 0; right: 0; bottom: 0;
    background-color: #cbd5e1;
    transition: .3s;
    border-radius: 20px;
}

.mdf-slider:before {
    position: absolute;
    content: "";
    height: 14px;
    width: 14px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: .3s;
    border-radius: 50%;
}

input:checked + .mdf-slider {
    background-color: #2563eb;
}

input:checked + .mdf-slider:before {
    transform: translateX(16px);
}

.mdf-strip-actions {
    display: flex;
    gap: 10px;
}

.mdf-strip-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    text-decoration: none;
    padding: 5px 10px;
    border-radius: 6px;
    background: #ffffff;
    border: 1px solid #cbd5e1;
}

.mdf-strip-btn:hover {
    color: #2563eb;
    border-color: #93c5fd;
}

/* SCAN PROGRESS */
.mdf-scan-live-progress {
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid #e2e8f0;
}

.mdf-progress-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.mdf-progress-stage-info {
    display: flex;
    align-items: center;
    gap: 10px;
}

.mdf-radar-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(37, 99, 235, 0.2);
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: mdfSpin 0.7s infinite linear;
    display: inline-block;
}

@keyframes mdfSpin {
    to { transform: rotate(360deg); }
}

.mdf-stage-title {
    font-size: 14px;
    color: #0f172a;
}

.mdf-stage-detail {
    font-size: 12px;
    color: #64748b;
}

.mdf-progress-pct-val {
    font-size: 16px;
    font-weight: 800;
    color: #2563eb;
    font-family: monospace;
}

.mdf-domain-bars-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
    margin-bottom: 14px;
}

@media (max-width: 768px) {
    .mdf-domain-bars-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

.mdf-domain-bar-item {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px 10px;
}

.mdf-domain-bar-head {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #475569;
    font-weight: 600;
    margin-bottom: 4px;
}

.mdf-bar-track {
    height: 5px;
    background: #e2e8f0;
    border-radius: 999px;
    overflow: hidden;
}

.mdf-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #2563eb, #6366f1);
    border-radius: 999px;
    transition: width 0.3s ease;
}

.mdf-stream-terminal {
    background: #0f172a;
    border-radius: 8px;
    padding: 10px 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: Consolas, Monaco, monospace;
    font-size: 12px;
    color: #94a3b8;
    gap: 12px;
}

.mdf-terminal-left {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #38bdf8;
}

.mdf-term-prompt {
    color: #38bdf8;
    font-weight: 800;
    margin-right: 6px;
}

.mdf-terminal-right {
    white-space: nowrap;
    color: #64748b;
    font-size: 11px;
}

/* SECTION HEADING */
.mdf-section-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 28px 0 16px 0;
}

.mdf-heading-left {
    display: flex;
    align-items: center;
    gap: 8px;
}

.mdf-heading-icon {
    color: #2563eb;
    font-size: 20px;
    width: 20px;
    height: 20px;
}

.mdf-heading-title {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
}

.mdf-badge-pill {
    font-size: 10.5px;
    font-weight: 700;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    color: #1d4ed8;
    padding: 3px 8px;
    border-radius: 4px;
}

/* 18 DOMAINS GRID */
.mdf-domains-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 14px;
    margin-bottom: 28px;
}

@media (max-width: 1200px) {
    .mdf-domains-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

@media (max-width: 768px) {
    .mdf-domains-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 480px) {
    .mdf-domains-grid {
        grid-template-columns: 1fr;
    }
}

.mdf-domain-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 140px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    transition: all 0.2s ease;
}

.mdf-domain-card:hover {
    border-color: #93c5fd;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.mdf-domain-card.active-scanning {
    border-color: #2563eb;
    box-shadow: 0 0 10px rgba(37, 99, 235, 0.25);
}

.mdf-domain-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.mdf-domain-icon {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.mdf-domain-icon .dashicons {
    font-size: 16px;
    width: 16px;
    height: 16px;
}

.mdf-dom-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
}

.badge-secure { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
.badge-checking { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
.badge-warning { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
.badge-danger { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

.mdf-domain-name {
    margin: 0 0 4px 0;
    font-size: 12.5px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.3;
}

.mdf-domain-desc {
    margin: 0 0 10px 0;
    font-size: 11px;
    color: #64748b;
    line-height: 1.35;
    flex-grow: 1;
}

.mdf-domain-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 8px;
    border-top: 1px solid #f1f5f9;
    font-size: 10px;
    color: #64748b;
}

/* FINDINGS CENTER */
.mdf-findings-card {
    border-top: 3px solid #6366f1;
}

.mdf-findings-head-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 12px;
}

.mdf-findings-head-left {
    display: flex;
    align-items: center;
    gap: 10px;
}

.mdf-findings-title {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 6px;
}

.mdf-count-pill {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    color: #1d4ed8;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 999px;
}

.mdf-findings-head-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.mdf-btn-danger-outline {
    color: #dc2626 !important;
    border-color: #fca5a5 !important;
}

.mdf-btn-emerald-outline {
    color: #059669 !important;
    border-color: #a7f3d0 !important;
}

.mdf-filter-tabs-row {
    display: flex;
    gap: 6px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 10px;
    margin-bottom: 18px;
    flex-wrap: wrap;
}

.mdf-tab-btn {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
}

.mdf-tab-btn.active {
    background: #2563eb;
    color: #ffffff;
    border-color: #2563eb;
}

.mdf-tab-btn.tab-critical.active {
    background: #dc2626;
    border-color: #dc2626;
}

.mdf-tab-btn.tab-warning.active {
    background: #d97706;
    border-color: #d97706;
}

/* FINDING CARDS */
.mdf-finding-card {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    margin-bottom: 12px;
    background: #ffffff;
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.mdf-finding-card.severity-critical {
    border-left: 4px solid #ef4444;
}

.mdf-finding-card.severity-warning {
    border-left: 4px solid #f59e0b;
}

.mdf-finding-card.severity-info {
    border-left: 4px solid #3b82f6;
}

.mdf-finding-header {
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8fafc;
    cursor: pointer;
    flex-wrap: wrap;
    gap: 10px;
}

.mdf-finding-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.mdf-sev-badge {
    font-size: 10.5px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 4px;
}

.sev-critical { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.sev-high { background: #fff7ed; color: #ea580c; border: 1px solid #fed7aa; }
.sev-warning { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
.sev-info { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }

.mdf-finding-title-text {
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
}

.mdf-finding-body {
    padding: 16px;
    border-top: 1px solid #f1f5f9;
    background: #ffffff;
    display: none;
}

.mdf-finding-desc {
    font-size: 12.5px;
    color: #334155;
    line-height: 1.5;
    margin-bottom: 12px;
}

.mdf-finding-evidence-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 14px;
    margin-bottom: 12px;
}

.mdf-evidence-title {
    font-size: 11.5px;
    font-weight: 700;
    color: #2563eb;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
}

.mdf-evidence-list {
    margin: 0;
    padding-left: 16px;
    font-size: 12px;
    color: #475569;
    line-height: 1.5;
}

.mdf-finding-footer-actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
    flex-wrap: wrap;
    padding-top: 6px;
}

/* EMPTY STATE */
.mdf-empty-state {
    text-align: center;
    padding: 36px 20px;
    color: #64748b;
}

.mdf-empty-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #ecfdf5;
    color: #059669;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 10px;
}

.mdf-empty-icon .dashicons {
    font-size: 26px;
    width: 26px;
    height: 26px;
}

.mdf-empty-state h4 {
    margin: 0 0 4px 0;
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
}

.mdf-empty-state p {
    margin: 0;
    font-size: 12.5px;
    color: #64748b;
}

/* DUAL GRID */
.mdf-dual-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
}

@media (max-width: 900px) {
    .mdf-dual-grid {
        grid-template-columns: 1fr;
    }
}

.mdf-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f1f5f9;
}

.mdf-card-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
}

.mdf-card-icon {
    font-size: 20px;
    width: 20px;
    height: 20px;
}

.mdf-card-title {
    margin: 0;
    font-size: 14.5px;
    font-weight: 700;
    color: #0f172a;
}

.mdf-card-subtitle {
    margin: 0;
    font-size: 11px;
    color: #64748b;
}

/* TIMELINE */
.mdf-timeline-box {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 240px;
    overflow-y: auto;
}

.mdf-timeline-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px 10px;
}

.mdf-time-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-top: 4px;
    flex-shrink: 0;
}

.dot-emerald { background: #10b981; }
.dot-cyan { background: #0284c7; }
.dot-crimson { background: #ef4444; }

.mdf-time-body {
    flex-grow: 1;
}

.mdf-time-top {
    display: flex;
    justify-content: space-between;
    font-size: 11.5px;
    color: #0f172a;
    margin-bottom: 2px;
}

.mdf-time-date {
    font-size: 10px;
    color: #64748b;
}

.mdf-time-text {
    margin: 0;
    font-size: 11px;
    color: #475569;
}

/* TABLE */
.mdf-table-container {
    overflow-x: auto;
}

.mdf-clean-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
}

.mdf-clean-table th {
    background: #f8fafc;
    padding: 8px 10px;
    text-align: left;
    font-weight: 600;
    color: #475569;
    border-bottom: 1px solid #e2e8f0;
}

.mdf-clean-table td {
    padding: 8px 10px;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
}

.mdf-empty-cell {
    text-align: center;
    padding: 24px !important;
    color: #94a3b8;
}

/* MODALS */
.mdf-modal-backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(4px);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.mdf-modal-box {
    background: #ffffff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
    display: flex;
    flex-direction: column;
}

.mdf-modal-diff {
    width: 95%;
    max-width: 1200px;
    height: 88vh;
}

.mdf-modal-code {
    width: 90%;
    max-width: 900px;
    max-height: 85vh;
}

.mdf-modal-form {
    width: 420px;
    max-width: 95%;
}

.mdf-modal-header {
    background: #ffffff;
    padding: 14px 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.mdf-modal-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
}

.mdf-modal-close {
    background: transparent;
    border: 1px solid #cbd5e1;
    color: #64748b;
    border-radius: 6px;
    width: 28px;
    height: 28px;
    font-size: 16px;
    line-height: 22px;
    cursor: pointer;
}

.mdf-modal-body {
    padding: 20px;
}

.mdf-modal-footer {
    background: #f8fafc;
    padding: 12px 20px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
}

/* DIFF MODAL */
.mdf-view-toggle {
    display: flex;
    background: #f1f5f9;
    border-radius: 6px;
    padding: 2px;
}

.waf-diff-mode-btn {
    background: transparent;
    border: none;
    color: #64748b;
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 600;
    border-radius: 4px;
    cursor: pointer;
}

.waf-diff-mode-btn.active {
    background: #2563eb;
    color: #ffffff;
}

.mdf-diff-meta-bar {
    background: #f8fafc;
    padding: 8px 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
}

.mdf-diff-container {
    flex: 1;
    overflow: auto;
    background: #0d1117;
    position: relative;
}

.mdf-diff-split-view {
    display: flex;
    min-height: 100%;
    font-family: Consolas, Monaco, monospace;
    font-size: 12px;
}

.mdf-diff-pane {
    flex: 1;
    overflow-x: auto;
}

.mdf-pane-left {
    border-right: 1px solid #30363d;
}

.mdf-diff-pane-title {
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 6px;
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
}

.waf-diff-ln {
    width: 44px;
    min-width: 44px;
    text-align: right;
    color: #484f58;
    user-select: none;
    padding-right: 10px !important;
    border-right: 1px solid #30363d;
    background: #0d1117;
}

.waf-diff-row-added { background: rgba(46, 160, 67, 0.18) !important; color: #7ee787 !important; }
.waf-diff-row-deleted { background: rgba(248, 81, 73, 0.18) !important; color: #ffa198 !important; }
.waf-diff-row-modified { background: rgba(210, 153, 34, 0.18) !important; color: #e3b341 !important; }

/* CODE VIEWER */
.mdf-code-viewer {
    background: #090d16;
    color: #e2e8f0;
    padding: 16px;
    margin: 0;
    overflow: auto;
    flex: 1;
    font-family: Consolas, Monaco, monospace;
    font-size: 12.5px;
    line-height: 1.6;
    white-space: pre;
}
</style>