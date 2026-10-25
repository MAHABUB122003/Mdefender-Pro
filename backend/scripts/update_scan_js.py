# -*- coding: utf-8 -*-
"""
Script to upgrade scan.js renderFindingCards and event handlers.
"""

import sys

scan_js_path = r"d:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\plugin_source\mdefender-pro\assets\js\scan.js"

with open(scan_js_path, 'r', encoding='utf-8') as f:
    js_content = f.read()

# Replace renderFindingCards
old_render_start = "    function renderFindingCards(findings) {"
old_render_end = "    function parseFindingsFromScanData(scanData) {"

s_idx = js_content.find(old_render_start)
e_idx = js_content.find(old_render_end)

if s_idx == -1 or e_idx == -1:
    print(f"Error: could not find renderFindingCards boundaries: {s_idx}, {e_idx}")
    sys.exit(1)

new_render_code = '''    function renderFindingCards(findings) {
        if (!findings || findings.length === 0) {
            $('#wafScanDetails').html(
                '<div class="mdf-empty-state" id="mdfNoFindingsState">' +
                '    <div class="mdf-empty-icon">' +
                '        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>' +
                '    </div>' +
                '    <h4>Zero Threats Detected</h4>' +
                '    <p>Your WordPress files, core checksums, database and server configuration match pristine baseline integrity.</p>' +
                '</div>'
            );
            return;
        }

        var html = '';
        findings.forEach(function(f, idx) {
            var sev = f.severity || 'warning';
            var sevLabel = (f.severityLabel || sev).toUpperCase();
            var sevClass = 'sev-pill-' + (sev === 'critical' ? 'critical' : (sev === 'safe' ? 'safe' : 'warning'));
            var cardClass = 'severity-' + (sev === 'critical' ? 'critical' : (sev === 'safe' ? 'safe' : 'warning'));
            var filePath = f.file || '';
            var typeLabel = f.type || 'System Audit';
            var isCore = isCoreFile(filePath);

            html += '<div class="mdf-finding-item ' + cardClass + '" data-severity="' + escapeHtml(sev) + '" id="finding-' + idx + '">';
            
            // 1. Header Summary Row (Wordfence-Grade Clean Layout)
            html += '    <div class="mdf-finding-header">';
            html += '        <div class="mdf-finding-header-left">';
            html += '            <span class="mdf-finding-sev-pill ' + sevClass + '">' + escapeHtml(sevLabel) + '</span>';
            html += '            <span class="mdf-finding-type-badge">' + escapeHtml(typeLabel) + '</span>';
            html += '            <span class="mdf-finding-title-text">' + escapeHtml(f.title) + '</span>';
            if (filePath) {
                html += '        <span class="mdf-path-pill" title="' + escapeHtml(filePath) + '">';
                html += '            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
                html += '            <code class="mdf-code-path">' + escapeHtml(filePath) + '</code>';
                html += '            <button type="button" class="mdf-copy-path-btn" data-path="' + escapeHtml(filePath) + '" title="Copy file path">';
                html += '                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
                html += '            </button>';
                html += '        </span>';
            }
            html += '        </div>';

            // Right-aligned Action Buttons on Header
            html += '        <div class="mdf-finding-header-actions">';
            if (isCore && filePath.indexOf('wp-config.php') === -1) {
                html += '        <button type="button" class="mdf-quick-btn btn-quick-repair waf-btn-restore-file" data-file="' + escapeHtml(filePath) + '" title="Restore pristine file from official WordPress.org release">';
                html += '            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>';
                html += '            <span>Repair File</span>';
                html += '        </button>';
            } else if (filePath && !isCore) {
                html += '        <button type="button" class="mdf-quick-btn btn-quick-quarantine waf-btn-clean-file" data-file="' + escapeHtml(filePath) + '" title="Safely neutralize and quarantine threat">';
                html += '            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
                html += '            <span>Quarantine</span>';
                html += '        </button>';
            }

            if (filePath) {
                html += '        <button type="button" class="mdf-quick-btn btn-quick-ignore waf-btn-ignore-file" data-file="' + escapeHtml(filePath) + '" title="Whitelist / Ignore issue">';
                html += '            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
                html += '            <span>Ignore</span>';
                html += '        </button>';
            }

            html += '            <button type="button" class="mdf-quick-btn btn-quick-details mdf-btn-details-toggle">';
            html += '                <span>Details</span>';
            html += '                <svg class="mdf-details-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';
            html += '            </button>';
            html += '        </div>';
            html += '    </div>';

            // 2. Expandable Forensic Details Drawer
            html += '    <div class="mdf-finding-drawer">';
            html += '        <div class="mdf-finding-desc-box">' + f.details + '</div>';

            // Forensic Telemetry & Evidence indicators
            html += '        <div class="mdf-forensic-box">';
            html += '            <div class="mdf-forensic-header">';
            html += '                <span>FORENSIC TELEMETRY & EVIDENCE INDICATORS</span>';
            html += '                <span class="mdf-forensic-status">ACTION REQUIRED</span>';
            html += '            </div>';

            if (f.evidence && f.evidence.length > 0) {
                html += '        <div class="mdf-forensic-list">';
                f.evidence.forEach(function(ev) {
                    html += '        <div class="mdf-evidence-item"><span class="mdf-evidence-bullet">&bull;</span><span>' + escapeHtml(ev) + '</span></div>';
                });
                html += '        </div>';
            }

            // Code Snippet Box (if snippet / line number available in evidence or attributes)
            var snippetCode = f.code_snippet || '';
            var lineNum = f.line_number || '';
            if (f.evidence) {
                f.evidence.forEach(function(ev) {
                    var mLine = ev.match(/on line\s+(\d+)/i) || ev.match(/line\s+(\d+):/i);
                    if (mLine && !lineNum) lineNum = mLine[1];
                    var mCode = ev.match(/(eval\(|base64_decode|assert\(|system\(|passthru\(|exec\(|preg_replace\(|file_put_contents|curl_exec|shell_exec)[^<]*/i);
                    if (mCode && !snippetCode) snippetCode = mCode[0];
                });
            }

            if (snippetCode || lineNum) {
                html += '        <div class="mdf-code-snippet-box">';
                if (lineNum) {
                    html += '        <span class="mdf-code-line-num">Line ' + escapeHtml(lineNum) + ':</span>';
                }
                html += '            <span class="mdf-code-line-content">' + escapeHtml(snippetCode || 'Signature pattern trigger: dynamic payload or obfuscated sink identified.') + '</span>';
                html += '        </div>';
            }

            html += '        </div>'; // end mdf-forensic-box

            // Drawer Remediation Action Toolbar
            html += '        <div class="mdf-drawer-remediation-bar">';
            if (filePath) {
                html += '        <button type="button" class="mdf-remedy-btn waf-btn-view-file" data-file="' + escapeHtml(filePath) + '" style="background:#ffffff;border:1px solid #cbd5e1;color:#1e293b;">';
                html += '            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>';
                html += '            <span>View File Source</span>';
                html += '        </button>';
            }

            if (isCore && filePath.indexOf('wp-config.php') === -1) {
                html += '        <button type="button" class="mdf-remedy-btn waf-btn-view-diff" data-file="' + escapeHtml(filePath) + '" style="background:#eff6ff;border:1px solid #93c5fd;color:#1d4ed8;">';
                html += '            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>';
                html += '            <span>Compare with Official (Visual Diff)</span>';
                html += '        </button>';

                html += '        <button type="button" class="mdf-remedy-btn waf-btn-restore-file" data-file="' + escapeHtml(filePath) + '" style="background:#10b981;border:none;color:#ffffff;">';
                html += '            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>';
                html += '            <span>Restore Original File</span>';
                html += '        </button>';
            } else if (filePath && !isCore) {
                html += '        <button type="button" class="mdf-remedy-btn waf-btn-clean-file" data-file="' + escapeHtml(filePath) + '" style="background:#ef4444;border:none;color:#ffffff;">';
                html += '            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
                html += '            <span>Quarantine &amp; Clean</span>';
                html += '        </button>';
            }

            if (filePath) {
                html += '        <button type="button" class="mdf-remedy-btn waf-btn-ignore-file" data-file="' + escapeHtml(filePath) + '" style="background:#ffffff;border:1px solid #cbd5e1;color:#64748b;">';
                html += '            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
                html += '            <span>Ignore Finding</span>';
                html += '        </button>';
            }

            html += '        </div>'; // end remediation bar
            html += '    </div>'; // end drawer
            html += '</div>'; // end item
        });

        $('#wafScanDetails').html(html);
    }
'''

js_content = js_content[:s_idx] + new_render_code + js_content[e_idx:]
print("Updated renderFindingCards in memory.")

# Add event listeners for details toggle, copy path button, and 18 domains toggle
# Let's locate the event listeners section in scan.js
handler_marker = "$(document).on('click', '.mdf-btn-toggle-evidence'"
h_pos = js_content.find(handler_marker)

if h_pos != -1:
    # Find the end of wafToggleAllDetailsBtn
    end_of_toggle = js_content.find("// View Code Modal", h_pos)
    if end_of_toggle != -1:
        new_handlers = '''        // Details Drawer Toggle (Wordfence-Grade Accordion)
        $(document).on('click', '.mdf-btn-details-toggle, .mdf-finding-header', function(e) {
            // If click was on an action button, don't toggle drawer
            if ($(e.target).closest('.mdf-quick-btn:not(.btn-quick-details), .mdf-copy-path-btn').length > 0) {
                return;
            }
            e.stopPropagation();
            var card = $(this).closest('.mdf-finding-item');
            var drawer = card.find('.mdf-finding-drawer');
            var chevron = card.find('.mdf-details-chevron');
            drawer.slideToggle(200, function() {
                if (drawer.is(':visible')) {
                    chevron.css('transform', 'rotate(180deg)');
                } else {
                    chevron.css('transform', 'rotate(0deg)');
                }
            });
        });

        // Expand All / Collapse All Details
        $('#wafToggleAllDetailsBtn').on('click', function() {
            var drawers = $('.mdf-finding-drawer');
            var chevrons = $('.mdf-details-chevron');
            var text = $('#wafToggleAllText');
            if (drawers.first().is(':visible')) {
                drawers.slideUp(200);
                chevrons.css('transform', 'rotate(0deg)');
                text.text('Expand All');
            } else {
                drawers.slideDown(200);
                chevrons.css('transform', 'rotate(180deg)');
                text.text('Collapse All');
            }
        });

        // Copy Path to Clipboard
        $(document).on('click', '.mdf-copy-path-btn', function(e) {
            e.stopPropagation();
            var path = $(this).attr('data-path');
            var btn = $(this);
            if (navigator.clipboard && path) {
                navigator.clipboard.writeText(path).then(function() {
                    var origHtml = btn.html();
                    btn.html('<span style="color:#10b981;font-size:10px;font-weight:700;">&check;</span>');
                    setTimeout(function() { btn.html(origHtml); }, 1500);
                });
            }
        });

        // Toggle 18 Domains Sentinel Drawer
        $('#mdfToggleDomainsBtn, #mdfDomainsHeaderToggle').on('click', function(e) {
            e.stopPropagation();
            var grid = $('#mdfDomainsGrid');
            var chevron = $('#mdfToggleDomainsBtn .mdf-chevron-icon');
            var text = $('#mdfToggleDomainsText');
            grid.slideToggle(240, function() {
                if (grid.is(':visible')) {
                    chevron.css('transform', 'rotate(180deg)');
                    text.text('Hide 18 Sentinels');
                } else {
                    chevron.css('transform', 'rotate(0deg)');
                    text.text('View 18 Sentinels');
                }
            });
        });

        // Category Filter Tabs
        $('.mdf-filter-tabs-row .mdf-tab-btn').on('click', function() {
            $('.mdf-filter-tabs-row .mdf-tab-btn').removeClass('active');
            $(this).addClass('active');
            var tab = $(this).data('tab');
            if (tab === 'all') {
                $('.mdf-finding-item').show();
            } else if (tab === 'critical') {
                $('.mdf-finding-item').hide();
                $('.mdf-finding-item[data-severity="critical"]').show();
            } else if (tab === 'warning') {
                $('.mdf-finding-item').hide();
                $('.mdf-finding-item[data-severity="warning"]').show();
            } else if (tab === 'ignored') {
                $('.mdf-finding-item').hide();
                $('.mdf-finding-item[data-severity="ignored"]').show();
            }
        });
'''
        js_content = js_content[:h_pos] + new_handlers + '\n        ' + js_content[end_of_toggle:]
        print("Updated event handlers.")

with open(scan_js_path, 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"Updated {scan_js_path} successfully!")
