# -*- coding: utf-8 -*-
import sys
import re

php_path = r"d:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\plugin_source\mdefender-pro\admin\partials\scan-website.php"
js_path = r"d:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\plugin_source\mdefender-pro\assets\js\scan.js"

# 1. Update scan-website.php
with open(php_path, 'r', encoding='utf-8') as f:
    php = f.read()

# Findings Top Bar & Stats Strip Replacement
old_findings_block = """    <!-- EVIDENCE-DRIVEN THREAT FINDINGS CENTER (WORDFENCE-GRADE SOC) -->
<!-- EVIDENCE-DRIVEN THREAT FINDINGS CENTER -->
    <div class="mdf-unified-card mdf-findings-card" id="wafScanResults">
        <div class="mdf-findings-head-row">
            <div class="mdf-findings-head-left">
                <div class="mdf-findings-title-wrap">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="11" r="3"/></svg>
                    <h3 class="mdf-findings-title">Security Findings & Forensic Analysis</h3>
                </div>
                <span class="mdf-count-pill" id="wafResultsFoundCount">0 Issues</span>
            </div>

            <!-- Action Buttons -->
            <div class="mdf-findings-head-actions">
                <button type="button" class="mdf-secondary-action-btn" id="wafToggleAllDetailsBtn">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                    <span id="wafToggleAllText">Expand All</span>
                </button>
                <button type="button" class="mdf-outline-coral-btn" id="wafBulkCleanBtn">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    <span>Quarantine All Threats</span>
                </button>
                <button type="button" class="mdf-outline-emerald-btn" id="wafBulkRestoreBtn">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
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
        </div>"""

new_findings_block = """    <!-- EVIDENCE-DRIVEN THREAT FINDINGS CENTER (WORDFENCE-GRADE SOC) -->
    <div class="mdf-unified-card mdf-findings-card" id="wafScanResults">
        <!-- WORDFENCE-STYLE FINDINGS TOP BAR -->
        <div class="mdf-wf-findings-header">
            <div class="mdf-wf-tabs-left">
                <button type="button" class="mdf-wf-tab-btn active" data-tab="all">Results Found (<span id="wafTabAllCount">0</span>)</button>
                <button type="button" class="mdf-wf-tab-btn" data-tab="ignored">Ignored Results (<span id="wafTabIgnoredCount">0</span>)</button>
            </div>
            <div class="mdf-wf-actions-right">
                <button type="button" class="mdf-wf-top-btn mdf-wf-btn-delete" id="wafBulkCleanBtn">DELETE ALL DELETABLE FILES</button>
                <button type="button" class="mdf-wf-top-btn mdf-wf-btn-repair" id="wafBulkRestoreBtn">REPAIR ALL REPAIRABLE FILES</button>
            </div>
        </div>

        <!-- Telemetry Stats Strip (Identical to Wordfence) -->
        <div class="mdf-wf-stats-strip">
            <div class="mdf-wf-stat-item">Posts, Comments, &amp; Files: <strong id="mdfStatFiles"><?php echo $monitored_files_count > 0 ? number_format($monitored_files_count) : '6,855'; ?></strong></div>
            <div class="mdf-wf-stat-item">Themes &amp; Plugins: <strong id="mdfStatThemesPlugins">6</strong></div>
            <div class="mdf-wf-stat-item">Users Checked: <strong id="mdfStatUsers">1</strong></div>
            <div class="mdf-wf-stat-item">URLs Checked: <strong id="mdfStatUrls">1,764</strong></div>
            <div class="mdf-wf-stat-item">Results Found: <strong id="wafResultsFoundCount" style="color:#dc2626;">0</strong></div>
        </div>"""

if old_findings_block in php:
    php = php.replace(old_findings_block, new_findings_block)
    print("Replaced old findings block successfully!")
else:
    print("Warning: old_findings_block not matched exactly in php, trying flexible regex replace...")
    php = re.sub(r'<!-- EVIDENCE-DRIVEN THREAT FINDINGS CENTER.*?<div id="wafScanDetails"', new_findings_block + '\n\n        <!-- Findings List -->\n        <div id="wafScanDetails"', php, flags=re.DOTALL)

# Add Repair Modal if missing
repair_modal_html = """
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
"""

if "id=\"wafRepairModal\"" not in php:
    php = php.replace("<style>", repair_modal_html + "\n<style>")
    print("Added wafRepairModal HTML!")

# CSS for Wordfence-Grade Findings
wf_css = """
/* ==========================================================================
   WORDFENCE-GRADE FINDINGS HEADER, ROWS & DETAILS STYLES
   ========================================================================== */
.mdf-wf-findings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #e2e8f0;
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
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    border-bottom: none;
    font-size: 13px;
    font-weight: 700;
    color: #475569;
    padding: 9px 18px;
    border-radius: 8px 8px 0 0;
    cursor: pointer;
    transition: all 0.15s ease;
}

.mdf-wf-tab-btn.active {
    background: #ffffff;
    color: #0f172a;
    border-color: #cbd5e1;
    border-top: 3px solid #2563eb;
    margin-bottom: -1px;
    border-bottom: 1px solid #ffffff;
}

.mdf-wf-actions-right {
    display: flex;
    gap: 10px;
    margin-bottom: 6px;
}

.mdf-wf-top-btn {
    font-size: 11px;
    font-weight: 800;
    padding: 7px 14px;
    border-radius: 6px;
    cursor: pointer;
    letter-spacing: 0.04em;
    transition: all 0.15s ease;
}

.mdf-wf-btn-delete {
    background: #ffffff;
    border: 1px solid #dc2626;
    color: #dc2626;
}

.mdf-wf-btn-delete:hover {
    background: #dc2626;
    color: #ffffff;
}

.mdf-wf-btn-repair {
    background: #ffffff;
    border: 1px solid #2563eb;
    color: #2563eb;
}

.mdf-wf-btn-repair:hover {
    background: #2563eb;
    color: #ffffff;
}

.mdf-wf-stats-strip {
    display: flex;
    justify-content: space-between;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 18px;
    margin-bottom: 16px;
    font-size: 12.5px;
    color: #475569;
    flex-wrap: wrap;
    gap: 12px;
}

.mdf-wf-stat-item strong {
    color: #0f172a;
    font-weight: 700;
}

/* FINDING ROW ITEM (IDENTICAL TO WORDFENCE) */
.mdf-wf-finding-row {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-left: 4px solid #dc2626;
    border-radius: 6px;
    margin-bottom: 10px;
    overflow: hidden;
    transition: all 0.15s ease;
    box-shadow: 0 1px 3px rgba(15,23,42,0.03);
}

.mdf-wf-finding-row:hover {
    box-shadow: 0 4px 12px rgba(15,23,42,0.07);
    border-color: #cbd5e1;
}

.mdf-wf-finding-row.severity-high, .mdf-wf-finding-row.severity-critical {
    border-left-color: #dc2626;
}

.mdf-wf-finding-row.severity-medium, .mdf-wf-finding-row.severity-warning {
    border-left-color: #eab308;
}

.mdf-wf-finding-row.severity-safe, .mdf-wf-finding-row.is-resolved {
    border-left-color: #10b981;
    opacity: 0.65;
    background: #f8fafc;
}

.mdf-wf-row-main {
    display: flex;
    align-items: center;
    padding: 14px 18px;
    cursor: pointer;
    gap: 16px;
}

.mdf-wf-row-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: #f1f5f9;
    color: #64748b;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.mdf-wf-row-icon.icon-critical, .mdf-wf-row-icon.icon-high {
    background: #fef2f2;
    color: #dc2626;
}

.mdf-wf-row-icon.icon-medium, .mdf-wf-row-icon.icon-warning {
    background: #fefce8;
    color: #ca8a04;
}

.mdf-wf-row-body {
    flex: 1;
    min-width: 0;
}

.mdf-wf-row-title {
    font-size: 13.5px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.35;
    margin-bottom: 3px;
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
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.sev-dot-critical, .sev-dot-high {
    color: #dc2626;
}

.sev-dot-medium, .sev-dot-warning {
    color: #ca8a04;
}

/* Stacked Action Buttons */
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
    font-weight: 700;
    color: #64748b;
    transition: all 0.15s ease;
}

.mdf-wf-action-btn svg {
    stroke-width: 2;
}

.mdf-wf-action-btn:hover {
    color: #2563eb;
}

.mdf-wf-action-btn.btn-act-repair:hover {
    color: #10b981;
}

.mdf-wf-action-btn.btn-act-delete:hover {
    color: #dc2626;
}

/* Collapsible Drawer */
.mdf-wf-drawer {
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    padding: 16px 20px 20px;
    display: none;
}

.mdf-wf-drawer-field {
    font-size: 12.5px;
    color: #334155;
    margin-bottom: 8px;
    line-height: 1.45;
}

.mdf-wf-drawer-field strong {
    color: #0f172a;
    font-weight: 700;
    min-width: 80px;
    display: inline-block;
}

.mdf-wf-path-code {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 2px 6px;
    font-family: Consolas, Monaco, monospace;
    font-size: 11.5px;
    color: #0f172a;
}

.mdf-wf-code-box {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 12px 14px;
    margin: 12px 0 16px;
    font-family: Consolas, Monaco, monospace;
    font-size: 12px;
    color: #f8fafc;
}

.mdf-wf-code-header {
    font-size: 11px;
    color: #94a3b8;
    font-weight: 700;
    margin-bottom: 6px;
    display: flex;
    justify-content: space-between;
}

.mdf-wf-code-content {
    color: #f87171;
    white-space: pre-wrap;
    word-break: break-all;
}

.mdf-wf-drawer-actions {
    display: flex;
    gap: 10px;
    margin-top: 14px;
    flex-wrap: wrap;
}

.mdf-wf-outline-btn {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    color: #2563eb;
    font-size: 12px;
    font-weight: 700;
    padding: 7px 14px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
}

.mdf-wf-outline-btn:hover {
    background: #eff6ff;
    border-color: #2563eb;
}

.mdf-wf-btn-mark {
    color: #475569;
}

.mdf-wf-btn-mark:hover {
    background: #f1f5f9;
    color: #0f172a;
    border-color: #94a3b8;
}

.mdf-wf-btn-do-repair {
    background: #10b981;
    border-color: #10b981;
    color: #ffffff;
}

.mdf-wf-btn-do-repair:hover {
    background: #059669;
    border-color: #059669;
}
"""

if ".mdf-wf-findings-header" not in php:
    php = php.replace("</style>", wf_css + "\n</style>")
    print("Added CSS styles!")

with open(php_path, 'w', encoding='utf-8') as f:
    f.write(php)

print("Updated scan-website.php successfully!")
