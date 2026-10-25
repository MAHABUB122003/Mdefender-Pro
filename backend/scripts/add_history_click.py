# -*- coding: utf-8 -*-
"""
Add click-to-load-findings to scan history rows in scan.js.
"""

import sys

scan_js_path = r"d:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\plugin_source\mdefender-pro\assets\js\scan.js"

with open(scan_js_path, 'r', encoding='utf-8') as f:
    js = f.read()

target1 = "html += '<tr>';"
replacement1 = "html += '<tr class=\"mdf-history-clickable-row\" data-id=\"' + scan.id + '\" style=\"cursor:pointer;\" title=\"Click to view complete findings from this scan\">';"

if target1 in js:
    js = js.replace(target1, replacement1, 1)

target2 = "// View Code Modal"
handler = """        // Click history row to load findings
        $(document).on('click', '.mdf-history-clickable-row', function() {
            var scanId = $(this).data('id');
            $('.mdf-history-clickable-row').css('background', '');
            $(this).css('background', '#eff6ff');
            $.get(ajaxurl + '?action=waf_fw_get_active_or_last_scan&scan_id=' + scanId, function(r) {
                if (r.success && r.data) {
                    displayScanResults(r.data);
                    if ($('#wafScanResults').length) {
                        $('html, body').animate({
                            scrollTop: $('#wafScanResults').offset().top - 40
                        }, 250);
                    }
                }
            });
        });

        // View Code Modal"""

if target2 in js and "mdf-history-clickable-row" not in js[js.find(target2):]:
    js = js.replace(target2, handler, 1)

with open(scan_js_path, 'w', encoding='utf-8') as f:
    f.write(js)

print("Added history row click handler to scan.js!")
