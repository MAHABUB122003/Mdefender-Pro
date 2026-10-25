# -*- coding: utf-8 -*-
"""
Script to refactor scan-website.php and scan.js with Wordfence-grade findings,
collapsible 18 Domain Sentinels, horizontal scan pipeline, and authentic MDefender Pro branding.
"""

import sys
import re

scan_php_path = r"d:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\plugin_source\mdefender-pro\admin\partials\scan-website.php"
scan_js_path = r"d:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\plugin_source\mdefender-pro\assets\js\scan.js"

print("Reading scan-website.php...")
with open(scan_php_path, 'r', encoding='utf-8') as f:
    php_content = f.read()

# 1. Extract #wafScanResults from its current position
findings_marker_start = '    <!-- EVIDENCE-DRIVEN THREAT FINDINGS CENTER -->'
findings_marker_end = '    <!-- SECURITY TIMELINE & SCAN HISTORY DUAL GRID -->'

start_idx = php_content.find(findings_marker_start)
end_idx = php_content.find(findings_marker_end)

if start_idx == -1 or end_idx == -1:
    print(f"Error: Could not locate findings markers. start_idx={start_idx}, end_idx={end_idx}")
    sys.exit(1)

waf_scan_results_html = php_content[start_idx:end_idx].strip()

# Remove findings from old position
php_content_without_findings = php_content[:start_idx] + php_content[end_idx:]

# 2. Extract 18 domains section
domain_marker_start = '    <!-- 18 SECURITY DOMAINS RADAR MATRIX -->'
domain_marker_end = '    <!-- SECURITY TIMELINE & SCAN HISTORY DUAL GRID -->'

d_start = php_content_without_findings.find(domain_marker_start)
d_end = php_content_without_findings.find(domain_marker_end)

if d_start == -1 or d_end == -1:
    print(f"Error: Could not locate domain markers. d_start={d_start}, d_end={d_end}")
    sys.exit(1)

# Extract just the grid inside
domains_section = php_content_without_findings[d_start:d_end]

# Find where <div class="mdf-domains-grid" id="mdfDomainsGrid"> starts
grid_start = domains_section.find('<div class="mdf-domains-grid" id="mdfDomainsGrid">')
if grid_start == -1:
    print("Error: Could not locate mdfDomainsGrid")
    sys.exit(1)

domains_grid_inner = domains_section[grid_start:]

# Build the new sequence:
# 1. Pipeline Bar
# 2. Threat Findings Center (#wafScanResults)
# 3. Collapsible 18 Domains Sentinel Matrix
new_middle_section = '''    <!-- WORDFENCE-GRADE COMPACT SCAN PIPELINE -->
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
''' + waf_scan_results_html.replace('    <!-- EVIDENCE-DRIVEN THREAT FINDINGS CENTER -->\n', '') + '''

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

    ''' + domains_grid_inner.replace('<div class="mdf-domains-grid" id="mdfDomainsGrid">', '<div class="mdf-domains-grid" id="mdfDomainsGrid" style="display:none;">') + '''
'''

# Replace the old section with new_middle_section
reordered_php = php_content_without_findings[:d_start] + new_middle_section + php_content_without_findings[d_end:]

print("Reordered HTML successfully.")

# Now replace the <style> section with the modern MDefender Pro design tokens and styles
style_marker = '<style>'
style_pos = reordered_php.find(style_marker)
if style_pos == -1:
    print("Error: Could not find <style>")
    sys.exit(1)

html_part = reordered_php[:style_pos]

new_css = '''<style>
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
</style>
'''

final_php = html_part + new_css

with open(scan_php_path, 'w', encoding='utf-8') as f:
    f.write(final_php)

print(f"Updated {scan_php_path} successfully!")
