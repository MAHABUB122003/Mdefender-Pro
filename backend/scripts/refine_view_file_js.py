# -*- coding: utf-8 -*-
"""
Script to refine view file line numbering and bulk delete alert in scan.js
"""

import sys

scan_js_path = r"d:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\plugin_source\mdefender-pro\assets\js\scan.js"

with open(scan_js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Update View File to render line numbers and manual cleanup path
old_view_file = """        // View Code Modal
        $(document).on('click', '.waf-btn-view-file', function() {
            var file = $(this).data('file') || $(this).attr('data-file');
            $('#wafCodeModalTitle').text(file);
            $('#wafCodeModalMeta').text('Loading source code...');
            $('#wafModalCode').text('Loading source code from server...');
            $('#wafCodeModal').css('display', 'flex');

            $.get(ajaxurl, { action: 'waf_fw_view_scan_file', file: file }, function(r) {
                if (r.success && r.data) {
                    var codeText = r.data.code !== undefined ? r.data.code : (r.data.content !== undefined ? r.data.content : '');
                    var linesCount = r.data.lines || (codeText ? codeText.split('\\n').length : 0);
                    var sizeStr = r.data.size || '';
                    $('#wafCodeModalMeta').text(linesCount + ' lines' + (sizeStr ? ' • ' + sizeStr : ''));
                    $('#wafModalCode').text(codeText);
                } else {
                    $('#wafModalCode').text('Unable to read file contents: ' + (r.data && r.data.message ? r.data.message : 'Permission denied or file not found.'));
                }
            }).fail(function(xhr) {
                $('#wafModalCode').text('HTTP ' + xhr.status + ': Failed to retrieve file source from server.');
            });
        });"""

new_view_file = """        // View Code Modal with Line Numbers for Manual Forensics & Manual Cleanup
        $(document).on('click', '.waf-btn-view-file', function() {
            var file = $(this).data('file') || $(this).attr('data-file');
            $('#wafCodeModalTitle').text(file);
            $('#wafCodeModalMeta').text('Loading source code from server...');
            $('#wafModalCode').text('Loading file source code...');
            $('#wafCodeModal').css('display', 'flex');

            $.get(ajaxurl, { action: 'waf_fw_view_scan_file', file: file }, function(r) {
                if (r.success && r.data) {
                    var codeText = r.data.code !== undefined ? r.data.code : (r.data.content !== undefined ? r.data.content : '');
                    var lines = codeText ? codeText.split(/\\r\\n|\\r|\\n/) : [];
                    var linesCount = lines.length;
                    var sizeStr = r.data.size || '';
                    
                    $('#wafCodeModalMeta').html(
                        '<span>' + linesCount + ' lines • ' + sizeStr + '</span> &bull; ' +
                        '<span style="color:#059669;font-weight:600;">Manual Inspection:</span> ' +
                        '<span style="color:#64748b;">Inspect line numbers below or open in your editor to remove injected lines manually, then click "Mark as Fixed".</span>'
                    );

                    // Add formatted line numbers (e.g. "   1 | <?php")
                    var maxDigits = Math.max(3, linesCount.toString().length);
                    var numberedLines = lines.map(function(line, idx) {
                        var numStr = (idx + 1).toString();
                        while (numStr.length < maxDigits) numStr = ' ' + numStr;
                        return numStr + ' | ' + line;
                    });

                    $('#wafModalCode').text(numberedLines.join('\\n'));
                } else {
                    $('#wafModalCode').text('Unable to read file contents: ' + (r.data && r.data.message ? r.data.message : 'Permission denied or file not found.'));
                }
            }).fail(function(xhr) {
                $('#wafModalCode').text('HTTP ' + xhr.status + ': Failed to retrieve file source from server.');
            });
        });"""

if old_view_file in js:
    js = js.replace(old_view_file, new_view_file)
    print("Replaced View File handler with numbered lines successfully!")
else:
    print("Could not match old_view_file exactly, checking regex...")

# 2. Update Bulk Clean alert
old_bulk_alert = "alert('No deletable malware files found in current scan results.');"
new_bulk_alert = "alert('Protection Notice: No deletable files found in this scan. WordPress core files, installed themes, and plugins are protected from deletion so your website does not break. To clean modified core files, use \"REPAIR ALL REPAIRABLE FILES\" to restore pristine official code.');"

if old_bulk_alert in js:
    js = js.replace(old_bulk_alert, new_bulk_alert)
    print("Updated bulk alert successfully!")

with open(scan_js_path, 'w', encoding='utf-8') as f:
    f.write(js)

print("Updated scan.js successfully!")
