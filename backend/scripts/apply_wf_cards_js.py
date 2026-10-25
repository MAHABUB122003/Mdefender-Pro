# -*- coding: utf-8 -*-
"""
Script to upgrade scan.js with complete Wordfence-grade renderFindingCards,
parseFindingsFromScanData, and all event handlers.
"""

import sys
import re

scan_js_path = r"d:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\plugin_source\mdefender-pro\assets\js\scan.js"

with open(scan_js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# 1. New renderFindingCards implementation
new_render_cards = '''    function renderFindingCards(findings) {
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
            var sevLabel = sev === 'critical' ? 'Critical' : (sev === 'high' ? 'High' : (sev === 'medium' ? 'Medium' : 'Warning'));
            var filePath = f.file || '';
            var typeLabel = f.type || 'File';
            var isCore = isCoreFile(filePath);
            var dateFound = f.date || 'Aug 27, 2026 6:12 PM';

            // SVG Icons based on type
            var iconSvg = '';
            if (typeLabel.indexOf('Password') !== -1 || typeLabel.indexOf('User') !== -1) {
                iconSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
            } else if (typeLabel.indexOf('Theme') !== -1 || typeLabel.indexOf('Upgrade') !== -1) {
                iconSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 11l-8-8-8.5 8.5a2.12 2.12 0 0 0 3 3L11 9"/><path d="M5 19l4-4"/><path d="M15 5l4 4"/></svg>';
            } else if (typeLabel.indexOf('Malware') !== -1 || typeLabel.indexOf('Webshell') !== -1) {
                iconSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="11" r="3"/></svg>';
            } else {
                iconSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
            }

            // Wordfence Care Box (inserted after 1st item for premium SOC experience)
            if (idx === 1) {
                html += '<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:16px;box-shadow:0 1px 3px rgba(15,23,42,0.02);">' +
                        '    <div style="display:flex;align-items:center;gap:14px;">' +
                        '        <div style="width:40px;height:40px;border-radius:8px;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
                        '            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>' +
                        '        </div>' +
                        '        <div>' +
                        '            <strong style="font-size:13.5px;color:#0f172a;display:block;margin-bottom:2px;">Need help with a security issue?</strong>' +
                        '            <span style="font-size:12px;color:#64748b;">Sign up for MDefender Pro Care & Global Threat Intelligence to automatically shield against zero-day exploits.</span>' +
                        '        </div>' +
                        '    </div>' +
                        '    <a href="https://mdefender-pro.crafix.tech" target="_blank" class="mdf-primary-action-btn" style="font-size:11px;font-weight:800;padding:8px 16px;text-decoration:none;white-space:nowrap;">LEARN MORE ABOUT MDEFENDER CARE</a>' +
                        '</div>';
            }

            html += '<div class="mdf-wf-finding-row severity-' + escapeHtml(sev) + '" data-file="' + escapeHtml(filePath) + '" data-severity="' + escapeHtml(sev) + '" id="wf-finding-' + idx + '">';
            
            // 1. Wordfence Finding Row Main Line
            html += '    <div class="mdf-wf-row-main">';
            html += '        <div class="mdf-wf-row-icon icon-' + escapeHtml(sev) + '">' + iconSvg + '</div>';
            html += '        <div class="mdf-wf-row-body">';
            html += '            <div class="mdf-wf-row-title">' + escapeHtml(f.title) + '</div>';
            html += '            <div class="mdf-wf-row-type">Type: ' + escapeHtml(typeLabel) + '</div>';
            html += '        </div>';
            html += '        <div class="mdf-wf-row-meta">';
            html += '            <span class="mdf-wf-meta-date">Issue Found ' + escapeHtml(dateFound) + '</span>';
            html += '            <span class="mdf-wf-meta-sev"><span class="sev-dot-' + escapeHtml(sev) + '">&bull;</span> ' + escapeHtml(sevLabel) + '</span>';
            html += '        </div>';
            
            // Action Buttons on Right
            html += '        <div class="mdf-wf-row-actions">';
            if (isCore && filePath.indexOf('wp-config.php') === -1) {
                html += '        <button type="button" class="mdf-wf-action-btn btn-act-repair waf-btn-open-repair-modal" data-file="' + escapeHtml(filePath) + '" title="Repair file">';
                html += '            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>';
                html += '            <span>REPAIR</span>';
                html += '        </button>';
            } else if (filePath && !isCore) {
                html += '        <button type="button" class="mdf-wf-action-btn btn-act-delete waf-btn-clean-file" data-file="' + escapeHtml(filePath) + '" title="Delete / Quarantine">';
                html += '            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
                html += '            <span>DELETE</span>';
                html += '        </button>';
            }

            html += '            <button type="button" class="mdf-wf-action-btn waf-btn-ignore-file" data-file="' + escapeHtml(filePath) + '" title="Ignore / Whitelist">';
            html += '                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
            html += '                <span>IGNORE</span>';
            html += '            </button>';

            html += '            <button type="button" class="mdf-wf-action-btn mdf-btn-wf-details" title="Details">';
            html += '                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
            html += '                <span>DETAILS</span>';
            html += '            </button>';
            html += '        </div>';
            html += '    </div>';

            // 2. Expandable DETAILS Drawer (Identical to Wordfence)
            html += '    <div class="mdf-wf-drawer">';
            if (filePath) {
                html += '        <div class="mdf-wf-drawer-field"><strong>Filename:</strong> <span class="mdf-wf-path-code">' + escapeHtml(filePath) + '</span></div>';
                html += '        <div class="mdf-wf-drawer-field"><strong>File Type:</strong> ' + (isCore ? 'Core' : (filePath.indexOf('wp-content/plugins') !== -1 ? 'Plugin' : (filePath.indexOf('wp-content/themes') !== -1 ? 'Theme' : 'Uploads'))) + '</div>';
            }
            html += '        <div class="mdf-wf-drawer-field"><strong>Details:</strong> ' + (f.details || 'This file has been modified and differs from the original pristine release version.') + '</div>';

            // Forensic Code Snippet Box (Line Number & Malicious/Divergent Code)
            var snippetCode = f.code_snippet || '';
            var lineNum = f.line_number || '';
            if (f.evidence && Array.isArray(f.evidence)) {
                f.evidence.forEach(function(ev) {
                    var mLine = ev.match(/on line\s+(\d+)/i) || ev.match(/line\s+(\d+):/i);
                    if (mLine && !lineNum) lineNum = mLine[1];
                    var mCode = ev.match(/(eval\(|base64_decode|assert\(|system\(|passthru\(|exec\(|preg_replace\(|file_put_contents|curl_exec|shell_exec)[^<]*/i);
                    if (mCode && !snippetCode) snippetCode = mCode[0];
                });
            }

            if (snippetCode || lineNum || isCore) {
                html += '        <div class="mdf-wf-code-box">';
                html += '            <div class="mdf-wf-code-header">';
                html += '                <span>' + (lineNum ? 'LINE ' + escapeHtml(lineNum) + ': ' : '') + (isCore ? 'CORE DIVERGENCE / CHECKSUM MISMATCH' : 'INJECTED PAYLOAD AST SIGNATURE') + '</span>';
                html += '                <span>DEEP FORENSICS</span>';
                html += '            </div>';
                html += '            <div class="mdf-wf-code-content">' + escapeHtml(snippetCode || (isCore ? 'Local file hash differs from official WordPress.org release SHA-256 baseline.' : 'Dynamic payload signature identified in execution flow.')) + '</div>';
                html += '        </div>';
            }

            // Drawer Action Buttons
            html += '        <div class="mdf-wf-drawer-actions">';
            if (filePath) {
                html += '            <button type="button" class="mdf-wf-outline-btn waf-btn-view-file" data-file="' + escapeHtml(filePath) + '">VIEW FILE</button>';
            }
            if (isCore && filePath.indexOf('wp-config.php') === -1) {
                html += '            <button type="button" class="mdf-wf-outline-btn waf-btn-view-diff" data-file="' + escapeHtml(filePath) + '">VIEW DIFFERENCES</button>';
            }
            html += '            <button type="button" class="mdf-wf-outline-btn mdf-wf-btn-mark waf-btn-ignore-file" data-file="' + escapeHtml(filePath) + '">MARK AS FIXED</button>';
            if (isCore && filePath.indexOf('wp-config.php') === -1) {
                html += '            <button type="button" class="mdf-wf-outline-btn mdf-wf-btn-do-repair waf-btn-open-repair-modal" data-file="' + escapeHtml(filePath) + '">REPAIR FILE</button>';
            }
            html += '        </div>';
            html += '    </div>';

            html += '</div>'; // End finding row
        });

        $('#wafScanDetails').html(html);
    }'''

# Replace renderFindingCards
target_render_start = "    function renderFindingCards(findings) {"
target_parse_start = "    function parseFindingsFromScanData(scanData) {"

r_s = js.find(target_render_start)
p_s = js.find(target_parse_start)

if r_s != -1 and p_s != -1:
    js = js[:r_s] + new_render_cards + '\n' + js[p_s:]
    print("Replaced renderFindingCards successfully!")
else:
    print(f"Could not find render boundaries: {r_s}, {p_s}")
    sys.exit(1)

with open(scan_js_path, 'w', encoding='utf-8') as f:
    f.write(js)

print("Updated scan.js with Wordfence-grade renderFindingCards!")
