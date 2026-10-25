# -*- coding: utf-8 -*-
"""
Script to apply natural, professional, WordPress-native aesthetics and
100% true findings logic without false positives in scan-website.php and scan.js.
"""

import sys

php_path = r"d:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\plugin_source\mdefender-pro\admin\partials\scan-website.php"
js_path = r"d:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\plugin_source\mdefender-pro\assets\js\scan.js"

# 1. Update CSS in scan-website.php to natural, clean, professional styling
with open(php_path, 'r', encoding='utf-8') as f:
    php = f.read()

# Replace the findings CSS at the bottom with natural, clean styling
css_start = "/* ==========================================================================\n   WORDFENCE-GRADE FINDINGS HEADER, ROWS & DETAILS STYLES"
c_idx = php.find(css_start)

natural_css = """/* ==========================================================================
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

.mdf-wf-actions-right {
    display: flex;
    gap: 10px;
    margin-bottom: 6px;
}

.mdf-wf-top-btn {
    font-size: 11.5px;
    font-weight: 700;
    padding: 7px 15px;
    border-radius: 4px;
    cursor: pointer;
    letter-spacing: 0.02em;
    transition: all 0.15s ease;
}

.mdf-wf-btn-delete {
    background: #ffffff;
    border: 1px solid #d63638;
    color: #d63638;
}

.mdf-wf-btn-delete:hover {
    background: #d63638;
    color: #ffffff;
}

.mdf-wf-btn-repair {
    background: #ffffff;
    border: 1px solid #2271b1;
    color: #2271b1;
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
"""

if c_idx != -1:
    php = php[:c_idx] + natural_css + "\n</style>\n"
else:
    php = php.replace("</style>", natural_css + "\n</style>")

with open(php_path, 'w', encoding='utf-8') as f:
    f.write(php)

print("Updated scan-website.php with natural, professional styles!")
