<div class="waf-scan-wrapper">
    <!-- Top Scanner Hero Card -->
    <div class="war-card" style="margin-bottom:20px;background:#ffffff;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
        <!-- Top row: Start Scan and Info columns -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:18px;margin-bottom:20px;border-bottom:1px solid #f1f5f9;gap:20px;flex-wrap:wrap;">
            <!-- Start Scan Button Column -->
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                <input type="hidden" id="wafScanType" value="full">
                <button type="button" class="button button-primary" id="wafStartFullScan" style="font-weight:700;font-size:13.5px;height:42px;line-height:40px;padding:0 22px;border-radius:6px;background:#2563eb;border:1px solid #1d4ed8;color:#fff;box-shadow:0 2px 4px rgba(37,99,235,0.25);cursor:pointer;display:flex;align-items:center;gap:8px;">
                    <span class="dashicons dashicons-shield-alt" style="font-size:18px;width:18px;height:18px;margin-top:2px;"></span>
                    START FULL SCAN
                </button>
                <button type="button" class="button" id="wafStartQuickScan" style="font-weight:700;font-size:13.5px;height:42px;line-height:40px;padding:0 20px;border-radius:6px;background:#f0f9ff;border:1px solid #bae6fd;color:#0284c7;cursor:pointer;display:flex;align-items:center;gap:8px;">
                    <span class="dashicons dashicons-performance" style="font-size:18px;width:18px;height:18px;margin-top:2px;"></span>
                    QUICK SCAN
                </button>
                
                <div style="display:flex;gap:8px;">
                    <button type="button" class="button" id="wafPauseScan" style="display:none;height:40px;line-height:38px;padding:0 14px;border-radius:6px;background:#f59e0b;color:#fff;border-color:#f59e0b;font-weight:600;">Pause</button>
                    <button type="button" class="button" id="wafCancelScan" style="display:none;height:40px;line-height:38px;padding:0 14px;border-radius:6px;color:#ef4444;border-color:#ef4444;font-weight:600;">Cancel</button>
                </div>
            </div>

            <!-- Scanner Status Badge -->
            <div style="display:flex;align-items:center;gap:8px;background:#f8fafc;padding:6px 14px;border-radius:999px;border:1px solid #e2e8f0;font-size:12px;font-weight:600;color:#475569;">
                <span id="wafScannerStatusDot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,0.2);"></span>
                <span id="wafScannerStatusText">Scanner Ready</span>
            </div>

            <!-- Scan Options Column -->
            <div style="display:flex;align-items:center;gap:16px;">
                <a href="#" id="wafOpenScheduleBtn" style="display:flex;align-items:center;gap:6px;color:#0284c7;font-size:12.5px;font-weight:700;text-decoration:none;padding:8px 12px;border-radius:6px;background:#f8fafc;border:1px solid #e2e8f0;">
                    <span class="dashicons dashicons-admin-generic" style="font-size:18px;width:18px;height:18px;"></span>
                    Scan Options & Scheduling
                </a>
            </div>
        </div>

        <style>
            .waf-wordfence-pipeline {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin: 30px 0;
                position: relative;
                padding: 0 10px;
            }
            .waf-wordfence-pipeline::before {
                content: '';
                position: absolute;
                top: 20px;
                left: 4%;
                right: 4%;
                height: 3px;
                background: #cbd5e1;
                z-index: 1;
            }
            .waf-wf-step {
                display: flex;
                flex-direction: column;
                align-items: center;
                position: relative;
                z-index: 2;
                flex: 1;
                text-align: center;
            }
            .waf-wf-icon-wrap {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: #ffffff;
                border: 3px solid #cbd5e1;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 8px;
                transition: all 0.3s ease;
                color: #94a3b8;
            }
            .waf-wf-icon-wrap.active {
                border-color: #007cba;
                background: #f0f9ff;
                color: #007cba;
                box-shadow: 0 0 8px rgba(0,124,186,0.3);
            }
            .waf-wf-icon-wrap.warning {
                border-color: #f59e0b;
                background: #fffbeb;
                color: #f59e0b;
            }
            .waf-wf-icon-wrap.danger {
                border-color: #ef4444;
                background: #fef2f2;
                color: #ef4444;
            }
            .waf-wf-icon-wrap.check {
                border-color: #10b981;
                background: #f0fdf4;
                color: #10b981;
            }
            .waf-wf-label {
                font-size: 11px;
                font-weight: 600;
                color: #334155;
                max-width: 100px;
                line-height: 1.3;
            }
            .waf-wf-link {
                font-size: 11px;
                color: #0284c7;
                text-decoration: underline;
                margin-top: 2px;
                font-weight: 500;
                display: inline-block;
            }
        </style>

        <!-- Connecting Checklist Pipeline -->
        <div class="waf-wordfence-pipeline">
            <div class="waf-wf-step" id="step-spamvertising">
                <div class="waf-wf-icon-wrap check">
                    <span class="dashicons dashicons-yes" style="font-size:24px;width:24px;height:24px;font-weight:bold;"></span>
                </div>
                <div class="waf-wf-label">Spamvertising Checks</div>
            </div>
            <div class="waf-wf-step" id="step-spam">
                <div class="waf-wf-icon-wrap check">
                    <span class="dashicons dashicons-yes" style="font-size:24px;width:24px;height:24px;font-weight:bold;"></span>
                </div>
                <div class="waf-wf-label">Spam Check</div>
            </div>
            <div class="waf-wf-step" id="step-blocklist">
                <div class="waf-wf-icon-wrap check">
                    <span class="dashicons dashicons-yes" style="font-size:24px;width:24px;height:24px;font-weight:bold;"></span>
                </div>
                <div class="waf-wf-label">Blocklist Check</div>
            </div>
            <div class="waf-wf-step" id="step-server-state">
                <div class="waf-wf-icon-wrap check">
                    <span class="dashicons dashicons-yes" style="font-size:24px;width:24px;height:24px;font-weight:bold;"></span>
                </div>
                <div class="waf-wf-label">Server State</div>
            </div>
            <div class="waf-wf-step" id="step-file-changes">
                <div class="waf-wf-icon-wrap check">
                    <span class="dashicons dashicons-yes" style="font-size:24px;width:24px;height:24px;font-weight:bold;"></span>
                </div>
                <div class="waf-wf-label">File Changes</div>
            </div>
            <div class="waf-wf-step" id="step-malware-scan">
                <div class="waf-wf-icon-wrap check">
                    <span class="dashicons dashicons-yes" style="font-size:24px;width:24px;height:24px;font-weight:bold;"></span>
                </div>
                <div class="waf-wf-label">Malware Scan</div>
            </div>
            <div class="waf-wf-step" id="step-content-safety">
                <div class="waf-wf-icon-wrap check">
                    <span class="dashicons dashicons-yes" style="font-size:24px;width:24px;height:24px;font-weight:bold;"></span>
                </div>
                <div class="waf-wf-label">Content Safety</div>
            </div>
            <div class="waf-wf-step" id="step-public-files">
                <div class="waf-wf-icon-wrap check">
                    <span class="dashicons dashicons-yes" style="font-size:24px;width:24px;height:24px;font-weight:bold;"></span>
                </div>
                <div class="waf-wf-label">Public Files</div>
            </div>
            <div class="waf-wf-step" id="step-password-strength">
                <div class="waf-wf-icon-wrap check">
                    <span class="dashicons dashicons-yes" style="font-size:24px;width:24px;height:24px;font-weight:bold;"></span>
                </div>
                <div class="waf-wf-label">Password Strength</div>
            </div>
            <div class="waf-wf-step" id="step-vulnerability-scan">
                <div class="waf-wf-icon-wrap check">
                    <span class="dashicons dashicons-yes" style="font-size:24px;width:24px;height:24px;font-weight:bold;"></span>
                </div>
                <div class="waf-wf-label">Vulnerability Scan</div>
            </div>
            <div class="waf-wf-step" id="step-user-audit">
                <div class="waf-wf-icon-wrap check">
                    <span class="dashicons dashicons-yes" style="font-size:24px;width:24px;height:24px;font-weight:bold;"></span>
                </div>
                <div class="waf-wf-label">User & Option Audit</div>
            </div>
        </div>

        <!-- Live Scan Progress Display -->
        <div id="wafScanProgress" style="display:none;margin-top:24px;border-top:1px solid #cbd5e1;padding-top:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span class="waf-spinner-radar"></span>
                    <strong id="wafScanStage" style="font-size:14px;color:#0f172a;">Initializing scan...</strong>
                </div>
                <span id="wafScanProgressPct" style="font-size:14px;font-weight:800;color:#1d4ed8;">0%</span>
            </div>
            <div class="waf-scan-progress-bar" style="height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin-bottom:14px;">
                <div class="waf-scan-progress-fill" id="wafScanProgressFill" style="width:2%;height:100%;background:linear-gradient(90deg,#1d4ed8,#7c3aed);border-radius:999px;transition:width 0.4s ease;"></div>
            </div>
            <div style="background:#0f172a;border-radius:8px;padding:12px 16px;color:#94a3b8;font-family:monospace;font-size:12px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
                <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#38bdf8;text-align:left;">
                    <span id="wafStreamPrefix">&gt;&gt;</span> <span id="wafStageDetailDesc">Preparing security scanner environment...</span>
                </div>
                <div style="white-space:nowrap;color:#64748b;font-size:11px;">
                    <span id="wafScannedFileCount">0</span> / <span id="wafTotalFileCount">0</span> files &bull; Elapsed: <span id="wafScanElapsed">0s</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Scan Results Card (Shown after scan completes) -->
    <div id="wafScanResults" style="display:none;">
        <!-- Completed header info -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #cbd5e1;padding-bottom:12px;margin-top:20px;">
            <span style="font-size:13px;color:#475569;font-weight:500;">Scan completed on <span id="wafScanDate">August 27, 2026 2:37 pm</span></span>
            <div style="display:flex;gap:16px;font-size:12px;font-weight:600;">
                <a href="#" style="color:#0284c7;text-decoration:none;">EMAIL ACTIVITY LOG</a>
                <a href="#" style="color:#0284c7;text-decoration:none;">VIEW FULL LOG</a>
                <a href="#" style="color:#0284c7;text-decoration:none;" id="wafShowLogBtn">SHOW LOG</a>
            </div>
        </div>

        <!-- Tab bar row -->
        <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid #cbd5e1;padding-bottom:0;margin-bottom:16px;">
            <div style="display:flex;gap:4px;margin-bottom:-1px;">
                <button type="button" class="waf-scan-tab active" data-tab="all" style="background:#ffffff;border:1px solid #cbd5e1;border-bottom:none;border-top-left-radius:6px;border-top-right-radius:6px;padding:10px 20px;font-weight:700;font-size:13.5px;color:#0284c7;cursor:pointer;outline:none;">Results Found (<span id="wafResultsFoundCount">1</span>)</button>
                <button type="button" class="waf-scan-tab" data-tab="ignored" style="background:#f1f5f9;border:1px solid #cbd5e1;border-top-left-radius:6px;border-top-right-radius:6px;padding:10px 20px;font-weight:600;font-size:13.5px;color:#475569;cursor:pointer;outline:none;border-bottom:1px solid #cbd5e1;">Ignored Results (0)</button>
            </div>
            <div style="display:flex;gap:10px;margin-bottom:8px;">
                <button type="button" class="button" id="wafBulkCleanBtn" style="border-color:#cbd5e1;color:#0284c7;font-weight:700;font-size:11.5px;padding:2px 14px;height:30px;line-height:28px;text-transform:uppercase;background:#fff;">Delete All Deletable Files</button>
                <button type="button" class="button" id="wafBulkRestoreBtn" style="border-color:#cbd5e1;color:#0284c7;font-weight:700;font-size:11.5px;padding:2px 14px;height:30px;line-height:28px;text-transform:uppercase;background:#fff;">Repair All Repairable Files</button>
            </div>
        </div>

        <!-- Summary metrics bar -->
        <div style="display:grid;grid-template-columns:repeat(5, 1fr);border:1px solid #cbd5e1;border-radius:4px;background:#ffffff;margin-bottom:20px;overflow:hidden;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-right:1px solid #cbd5e1;font-size:13px;color:#475569;">
                <span>Posts, Comments, & Files</span>
                <strong style="color:#0f172a;font-size:14px;" id="wafSummaryFilesCount">0</strong>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-right:1px solid #cbd5e1;font-size:13px;color:#475569;">
                <span>Themes & Plugins</span>
                <strong style="color:#0f172a;font-size:14px;" id="wafSummaryThemesCount">0</strong>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-right:1px solid #cbd5e1;font-size:13px;color:#475569;">
                <span>Users Checked</span>
                <strong style="color:#0f172a;font-size:14px;" id="wafSummaryUsersCount">0</strong>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-right:1px solid #cbd5e1;font-size:13px;color:#475569;">
                <span>URLs Checked</span>
                <strong style="color:#0f172a;font-size:14px;" id="wafSummaryUrlsCount">0</strong>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;font-size:13px;color:#475569;">
                <span>Results Found</span>
                <strong style="color:#0f172a;font-size:14px;" id="wafSummaryResultsCount">1</strong>
            </div>
        </div>

        <!-- Scan Findings List -->
        <div id="wafScanDetails" style="text-align:left;"></div>
    </div>

    <!-- Backups & Restore Card -->
    <div class="war-card" style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;margin-bottom:20px;">
        <div class="war-card-header" style="background:#f8fafc;padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:10px;">
                <span class="dashicons dashicons-backup" style="color:#2563eb;font-size:20px;width:20px;height:20px;margin-top:2px;"></span>
                <h3 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">Malware Backups (Restore)</h3>
                <span class="war-card-badge war-card-badge-blue" id="wafBackupCount">0 Backups</span>
            </div>
        </div>
        <div class="war-card-body war-card-body-no-pad" style="padding:0;">
            <table class="war-table war-r-table" style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr style="background:#f1f5f9;border-bottom:1px solid #e2e8f0;text-align:left;">
                        <th style="padding:12px 16px;font-size:12px;font-weight:600;color:#475569;">Original File Path</th>
                        <th style="padding:12px 16px;font-size:12px;font-weight:600;color:#475569;">Backup Date</th>
                        <th style="padding:12px 16px;font-size:12px;font-weight:600;color:#475569;">Size</th>
                        <th style="padding:12px 16px;font-size:12px;font-weight:600;color:#475569;text-align:right;">Actions</th>
                    </tr>
                </thead>
                <tbody id="wafBackupsBody">
                    <tr class="war-table-empty">
                        <td colspan="4" style="text-align:center;padding:30px;color:#64748b;">
                            No file backups created yet. Files are backed up automatically before cleaning.
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Scan History Card -->
    <div class="war-card" style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
        <div class="war-card-header" style="background:#f8fafc;padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:10px;">
                <h3 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">Scan History</h3>
                <span class="war-card-badge" style="font-size:11px;padding:3px 8px;">Recent 10 Scans</span>
            </div>
            <button class="button button-small" id="wafClearHistory" style="color:#ef4444;border-color:#fca5a5;">Clear History</button>
        </div>
        <div class="war-card-body war-card-body-no-pad" style="padding:0;">
            <table class="war-table war-r-table" style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr style="background:#f1f5f9;border-bottom:1px solid #e2e8f0;text-align:left;">
                        <th style="padding:12px 16px;font-size:12px;font-weight:600;color:#475569;">Date & Time</th>
                        <th style="padding:12px 16px;font-size:12px;font-weight:600;color:#475569;">Scan Type</th>
                        <th style="padding:12px 16px;font-size:12px;font-weight:600;color:#475569;">Score</th>
                        <th style="padding:12px 16px;font-size:12px;font-weight:600;color:#475569;">Issues</th>
                        <th style="padding:12px 16px;font-size:12px;font-weight:600;color:#475569;">Duration</th>
                        <th style="padding:12px 16px;font-size:12px;font-weight:600;color:#475569;">Status</th>
                        <th style="padding:12px 16px;font-size:12px;font-weight:600;color:#475569;text-align:right;">Actions</th>
                    </tr>
                </thead>
                <tbody id="wafScanHistoryBody">
                    <tr class="war-table-empty">
                        <td colspan="7" style="text-align:center;padding:30px;color:#64748b;">
                            No scans yet. Run your first scan above.
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Schedule Modal -->
<div id="wafScheduleModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.65);backdrop-filter:blur(4px);z-index:99999;align-items:center;justify-content:center;">
    <div style="background:#fff;border-radius:14px;padding:24px;width:440px;max-width:92%;box-shadow:0 25px 60px rgba(0,0,0,0.3);border:1px solid #e2e8f0;">
        <h3 style="margin:0 0 6px;font-size:18px;font-weight:700;color:#0f172a;">Automated Scan Scheduling</h3>
        <p style="font-size:13px;color:#64748b;margin:0 0 16px;">Configure periodic background security scans powered by WP-Cron.</p>
        
        <div style="margin-bottom:14px;">
            <label style="display:flex;align-items:center;gap:8px;font-weight:600;font-size:13px;color:#0f172a;cursor:pointer;">
                <input type="checkbox" id="wafScheduledScanEnabled" value="yes" <?php checked(get_option('waf_fw_scheduled_scan_enabled', 'yes'), 'yes'); ?>>
                Enable Automated Background Scanning
            </label>
        </div>

        <div style="margin-bottom:14px;">
            <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Frequency:</label>
            <select id="wafScheduledScanInterval" style="width:100%;height:36px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;">
                <option value="daily" <?php selected(get_option('waf_fw_scheduled_scan_interval', 'weekly'), 'daily'); ?>>Daily Scan</option>
                <option value="weekly" <?php selected(get_option('waf_fw_scheduled_scan_interval', 'weekly'), 'weekly'); ?>>Weekly Scan (Recommended)</option>
                <option value="monthly" <?php selected(get_option('waf_fw_scheduled_scan_interval', 'weekly'), 'monthly'); ?>>Monthly Scan</option>
            </select>
        </div>

        <div style="margin-bottom:18px;">
            <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Email Security Report to:</label>
            <input type="email" id="wafScheduledScanEmail" value="<?php echo esc_attr(get_option('waf_fw_scheduled_scan_email', get_option('admin_email'))); ?>" placeholder="admin@example.com" style="width:100%;height:36px;border-radius:6px;border:1px solid #cbd5e1;padding:0 12px;font-size:13px;">
        </div>

        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button type="button" class="button" id="wafScheduleCancel">Cancel</button>
            <button type="button" class="button button-primary" id="wafScheduleSave">Save Schedule</button>
        </div>
    </div>
</div>

<!-- Email Report Modal -->
<div id="wafEmailModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.65);backdrop-filter:blur(4px);z-index:99999;align-items:center;justify-content:center;">
    <div style="background:#fff;border-radius:14px;padding:24px;width:400px;max-width:92%;box-shadow:0 25px 60px rgba(0,0,0,0.3);border:1px solid #e2e8f0;">
        <h3 style="margin:0 0 6px;font-size:18px;font-weight:700;color:#0f172a;">Email Scan Report</h3>
        <p style="font-size:13px;color:#64748b;margin:0 0 16px;">Send the full scan assessment to your email.</p>
        <input type="email" id="wafReportEmail" value="<?php echo esc_attr(get_option('admin_email')); ?>" style="width:100%;height:36px;border-radius:6px;border:1px solid #cbd5e1;padding:0 12px;font-size:13px;box-sizing:border-box;margin-bottom:16px;">
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button type="button" class="button" id="wafEmailCancel">Cancel</button>
            <button type="button" class="button button-primary" id="wafEmailSend">Send Report</button>
        </div>
    </div>
</div>

<!-- Code Preview Modal -->
<div id="wafCodeModal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.75);backdrop-filter:blur(4px);z-index:999999;align-items:center;justify-content:center;">
    <div style="background:#fff;border-radius:12px;width:92%;max-width:900px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.4);border:1px solid #e2e8f0;">
        <div style="background:#0f172a;padding:14px 20px;border-bottom:1px solid #1e293b;display:flex;justify-content:space-between;align-items:center;color:#fff;">
            <div style="display:flex;align-items:center;gap:10px;">
                <span class="dashicons dashicons-media-code" style="color:#38bdf8;font-size:20px;width:20px;height:20px;"></span>
                <strong id="wafCodeModalTitle" style="font-size:14px;color:#f8fafc;word-break:break-all;">File Source Code</strong>
            </div>
            <button type="button" class="button button-small" id="wafCloseCodeModalBtn" style="background:transparent;border:1px solid #475569;color:#94a3b8;cursor:pointer;">&times; Close</button>
        </div>
        <div style="padding:10px 16px;background:#1e293b;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #334155;">
            <span id="wafCodeModalMeta" style="font-size:12px;color:#94a3b8;font-family:monospace;">Loading...</span>
            <div style="display:flex;gap:8px;">
                <button type="button" class="button button-small button-primary" id="wafCodeModalCleanBtn" style="background:#ef4444;border-color:#ef4444;color:#fff;font-weight:600;display:none;">Quarantine & Clean File</button>
            </div>
        </div>
        <pre id="wafModalCode" style="background:#090d16;color:#e2e8f0;padding:20px;margin:0;overflow:auto;flex:1;font-family:Consolas, Monaco, 'Courier New', monospace;font-size:12.5px;line-height:1.6;white-space:pre;"></pre>
    </div>
</div>

<!-- Wordfence-Grade Visual Diff Viewer Modal -->
<div id="wafDiffModal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.8);backdrop-filter:blur(5px);z-index:999999;align-items:center;justify-content:center;">
    <div style="background:#ffffff;border-radius:12px;width:95%;max-width:1250px;height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 30px 70px rgba(0,0,0,0.5);border:1px solid #e2e8f0;">
        <!-- Diff Header -->
        <div style="background:#0f172a;padding:16px 24px;border-bottom:1px solid #1e293b;display:flex;justify-content:space-between;align-items:center;color:#fff;">
            <div style="display:flex;align-items:center;gap:12px;">
                <span class="dashicons dashicons-randomize" style="color:#38bdf8;font-size:22px;width:22px;height:22px;"></span>
                <div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <strong id="wafDiffFileName" style="font-size:15px;color:#f8fafc;word-break:break-all;">wp-includes/version.php</strong>
                        <span id="wafDiffWpVersion" style="background:#1e293b;border:1px solid #334155;color:#38bdf8;font-size:11px;padding:2px 8px;border-radius:4px;font-weight:600;">WordPress Core</span>
                    </div>
                    <div style="font-size:12px;color:#94a3b8;margin-top:2px;">Compare local modified file against pristine official WordPress.org repository version</div>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:16px;">
                <!-- View Mode Switch -->
                <div style="display:flex;background:#1e293b;border-radius:6px;padding:3px;border:1px solid #334155;">
                    <button type="button" class="waf-diff-mode-btn active" data-mode="split" style="background:#2563eb;color:#fff;border:none;border-radius:4px;padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer;">Side-by-Side</button>
                    <button type="button" class="waf-diff-mode-btn" data-mode="unified" style="background:transparent;color:#94a3b8;border:none;border-radius:4px;padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer;">Unified</button>
                </div>
                <button type="button" id="wafCloseDiffModalBtn" style="background:transparent;border:1px solid #475569;color:#cbd5e1;border-radius:6px;width:32px;height:32px;font-size:18px;line-height:28px;cursor:pointer;">&times;</button>
            </div>
        </div>

        <!-- Diff Stats Bar -->
        <div style="background:#f8fafc;padding:10px 24px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;font-size:12px;">
            <div style="display:flex;gap:20px;align-items:center;">
                <span style="color:#475569;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;margin-right:6px;"></span>Original (WordPress.org): <strong id="wafDiffOriginalMeta">Loading...</strong></span>
                <span style="color:#475569;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;margin-right:6px;"></span>Local (Server Disk): <strong id="wafDiffLocalMeta">Loading...</strong></span>
            </div>
            <div id="wafDiffLineStats" style="font-weight:600;font-family:monospace;">
                <span style="color:#10b981;">+0 additions</span> &bull; <span style="color:#ef4444;">-0 deletions</span>
            </div>
        </div>

        <!-- Diff Viewer Body -->
        <div id="wafDiffContainer" style="flex:1;overflow:auto;background:#0d1117;position:relative;">
            <div id="wafDiffLoading" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#94a3b8;gap:12px;">
                <span class="waf-spinner-radar" style="width:24px;height:24px;border-width:3px;"></span>
                <span>Fetching pristine file from official WordPress.org repository...</span>
            </div>
            <div id="wafDiffContent" style="display:none;min-height:100%;">
                <!-- Split View Container -->
                <div id="wafDiffSplitView" style="display:flex;min-height:100%;font-family:Consolas, Monaco, monospace;font-size:12px;">
                    <div style="flex:1;border-right:1px solid #30363d;overflow-x:auto;">
                        <div style="background:#161b22;padding:8px 14px;border-bottom:1px solid #30363d;color:#10b981;font-weight:700;font-size:11px;display:flex;align-items:center;gap:6px;position:sticky;top:0;z-index:10;">
                            <span class="dashicons dashicons-yes-alt" style="font-size:16px;width:16px;height:16px;"></span>
                            ORIGINAL WORDPRESS.ORG FILE (PRISTINE)
                        </div>
                        <table class="waf-diff-table" id="wafDiffLeftTable" style="width:100%;border-collapse:collapse;"></table>
                    </div>
                    <div style="flex:1;overflow-x:auto;">
                        <div style="background:#161b22;padding:8px 14px;border-bottom:1px solid #30363d;color:#f87171;font-weight:700;font-size:11px;display:flex;align-items:center;gap:6px;position:sticky;top:0;z-index:10;">
                            <span class="dashicons dashicons-warning" style="font-size:16px;width:16px;height:16px;"></span>
                            MODIFIED LOCAL FILE (CURRENT SERVER)
                        </div>
                        <table class="waf-diff-table" id="wafDiffRightTable" style="width:100%;border-collapse:collapse;"></table>
                    </div>
                </div>

                <!-- Unified View Container -->
                <div id="wafDiffUnifiedView" style="display:none;font-family:Consolas, Monaco, monospace;font-size:12px;overflow-x:auto;">
                    <table class="waf-diff-table" id="wafDiffUnifiedTable" style="width:100%;border-collapse:collapse;"></table>
                </div>
            </div>
        </div>

        <!-- Diff Modal Action Footer -->
        <div style="background:#ffffff;padding:16px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:16px;box-shadow:0 -4px 12px rgba(0,0,0,0.03);">
            <div style="font-size:12.5px;color:#64748b;display:flex;align-items:center;gap:8px;">
                <span class="dashicons dashicons-shield" style="color:#2563eb;font-size:18px;width:18px;height:18px;"></span>
                <span>Restoring will safely backup this file to <code>wp-content/mdefender-backups/</code> and replace it with official code.</span>
            </div>
            <div style="display:flex;gap:10px;align-items:center;">
                <button type="button" class="button" id="wafDiffCancelBtn" style="font-weight:600;height:36px;padding:0 16px;">Close</button>
                <button type="button" class="button" id="wafDiffIgnoreBtn" style="color:#64748b;border-color:#cbd5e1;font-weight:600;height:36px;padding:0 16px;">Ignore This Issue</button>
                <button type="button" class="button button-primary" id="wafDiffRestoreBtn" style="background:#059669;border-color:#059669;font-weight:700;height:36px;padding:0 20px;display:flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(5,150,105,0.3);">
                    <span class="dashicons dashicons-update" style="font-size:16px;width:16px;height:16px;margin-top:2px;"></span>
                    Restore to Original WordPress.org Version
                </button>
            </div>
        </div>
    </div>
</div>

<style>
.waf-scan-profile-card {
    border: 2px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: #fff;
}
.waf-scan-profile-card:hover {
    border-color: #93c5fd;
    background: #f8fafc;
}
.waf-scan-profile-card.active {
    border-color: #2563eb;
    background: #eff6ff;
}
.waf-spinner-radar {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(37,99,235,0.2);
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: wafSpin 0.7s infinite linear;
    display: inline-block;
}
@keyframes wafSpin {
    to { transform: rotate(360deg); }
}
.waf-scan-tab {
    padding: 6px 14px;
    border: 1px solid #cbd5e1;
    background: #fff;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    transition: all .15s;
}
.waf-scan-tab:hover {
    border-color: #2563eb;
    color: #2563eb;
}
.waf-scan-tab.active {
    background: #2563eb;
    color: #fff;
    border-color: #2563eb;
}
.waf-finding-card {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    margin-bottom: 14px;
    background: #fff;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    transition: box-shadow 0.2s;
}
.waf-finding-card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}
.waf-diff-table {
    border-collapse: collapse;
    width: 100%;
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
    padding-right: 12px !important;
    border-right: 1px solid #30363d;
    background: #0d1117;
}
.waf-diff-row-added {
    background: rgba(46, 160, 67, 0.18) !important;
    color: #7ee787 !important;
}
.waf-diff-row-added .waf-diff-ln {
    background: rgba(46, 160, 67, 0.25) !important;
    color: #7ee787 !important;
}
.waf-diff-row-deleted {
    background: rgba(248, 81, 73, 0.18) !important;
    color: #ffa198 !important;
}
.waf-diff-row-deleted .waf-diff-ln {
    background: rgba(248, 81, 73, 0.25) !important;
    color: #ffa198 !important;
}
.waf-diff-row-modified {
    background: rgba(210, 153, 34, 0.18) !important;
    color: #e3b341 !important;
}
.waf-diff-row-modified .waf-diff-ln {
    background: rgba(210, 153, 34, 0.25) !important;
    color: #e3b341 !important;
}
.waf-diff-empty-line {
    background: #161b22;
    color: #484f58;
}
</style>

<script>
jQuery(document).ready(function($) {
    // Profile card selector
    $('.waf-scan-profile-card').on('click', function() {
        $('.waf-scan-profile-card').removeClass('active');
        $(this).addClass('active');
        var type = $(this).data('type');
        if (type === 'custom') {
            $('#wafCustomSelectWrap').slideDown(150);
        } else {
            $('#wafCustomSelectWrap').slideUp(150);
            $('#wafScanType').val(type);
        }
    });

    // Schedule modal controls
    $('#wafOpenScheduleBtn').on('click', function(e) {
        e.preventDefault();
        $('#wafScheduleModal').css('display', 'flex');
    });

    $('#wafScheduleCancel').on('click', function() {
        $('#wafScheduleModal').hide();
    });

    $('#wafScheduleSave').on('click', function() {
        var enabled = $('#wafScheduledScanEnabled').is(':checked') ? 'yes' : 'no';
        var interval = $('#wafScheduledScanInterval').val();
        var email = $('#wafScheduledScanEmail').val();

        $.post(ajaxurl + '?action=waf_fw_save_scheduled_scan_settings', {
            enabled: enabled,
            interval: interval,
            email: email
        }, function(r) {
            if (r.success) {
                alert('Scan schedule saved successfully!');
                $('#wafScheduleModal').hide();
            } else {
                alert('Failed to save schedule: ' + (r.data ? r.data.message : 'Unknown error'));
            }
        });
    });
});
</script>