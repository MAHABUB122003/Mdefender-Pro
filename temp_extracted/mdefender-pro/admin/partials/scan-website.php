<div class="waf-scan-wrapper">
    <!-- Top Scanner Hero Card -->
    <div class="war-card" style="margin-bottom:20px;background:#ffffff;border:1px solid #cbd5e1;border-radius:6px;overflow:hidden;padding:24px;">
        <!-- Top row: Start Scan and Info columns -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:15px;margin-bottom:20px;background:#ffffff;gap:20px;flex-wrap:wrap;">
            <!-- Start Scan Button Column -->
            <div style="flex:1;min-width:200px;display:flex;flex-direction:column;align-items:flex-start;gap:8px;">
                <button class="button button-primary button-hero" id="wafStartScan" style="font-weight:700;font-size:14px;height:44px;line-height:42px;padding:0 24px;border-radius:4px;background:#007cba;border:none;box-shadow:none;text-transform:uppercase;cursor:pointer;">
                    Start New Scan
                </button>
                <div style="display:flex;gap:10px;">
                    <button class="button" id="wafPauseScan" style="display:none;height:36px;line-height:34px;padding:0 14px;border-radius:4px;background:#f59e0b;color:#fff;border-color:#f59e0b;font-weight:600;">Pause</button>
                    <button class="button" id="wafCancelScan" style="display:none;height:36px;line-height:34px;padding:0 14px;border-radius:4px;color:#ef4444;border-color:#ef4444;font-weight:600;">Cancel</button>
                </div>
            </div>
            <!-- Scan Options Column -->
            <div style="flex:1.5;min-width:280px;display:flex;align-items:flex-start;gap:12px;">
                <div style="color:#007cba;margin-top:2px;">
                    <span class="dashicons dashicons-admin-generic" style="font-size:24px;width:24px;height:24px;"></span>
                </div>
                <div style="text-align:left;">
                    <h4 style="margin:0;font-size:14px;font-weight:700;"><a href="#" style="color:#007cba;text-decoration:none;" id="wafOpenScheduleBtn">Scan Options and Scheduling</a></h4>
                    <p style="margin:2px 0 0;font-size:12.5px;color:#475569;line-height:1.4;">Manage your scan scheduling, custom paths, and sensitivity rules.</p>
                </div>
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
                <button type="button" class="button" style="border-color:#cbd5e1;color:#0284c7;font-weight:700;font-size:11.5px;padding:2px 14px;height:30px;line-height:28px;text-transform:uppercase;background:#fff;">Delete All Deletable Files</button>
                <button type="button" class="button" style="border-color:#cbd5e1;color:#0284c7;font-weight:700;font-size:11.5px;padding:2px 14px;height:30px;line-height:28px;text-transform:uppercase;background:#fff;">Repair All Repairable Files</button>
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
.waf-stage-step {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    transition: all 0.2s;
}
.waf-stage-step-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #cbd5e1;
    transition: all 0.2s;
}
.waf-stage-step.active {
    background: #eff6ff;
    border-color: #93c5fd;
    color: #1d4ed8;
}
.waf-stage-step.active .waf-stage-step-dot {
    background: #2563eb;
    box-shadow: 0 0 0 3px rgba(37,99,235,0.2);
}
.waf-stage-step.done {
    background: #f0fdf4;
    border-color: #bbf7d0;
    color: #166534;
}
.waf-stage-step.done .waf-stage-step-dot {
    background: #10b981;
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
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    margin-bottom: 12px;
    background: #fff;
    overflow: hidden;
    transition: box-shadow 0.2s;
}
.waf-finding-card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.04);
}
.waf-finding-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    cursor: pointer;
    background: #f8fafc;
    border-bottom: 1px solid #f1f5f9;
}
.waf-finding-body {
    padding: 16px 18px;
    display: none;
    background: #fff;
}
.waf-finding-body.open {
    display: block;
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
    $('#wafOpenScheduleBtn').on('click', function() {
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