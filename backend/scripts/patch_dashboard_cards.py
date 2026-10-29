import os

dashboard_file = os.path.join(os.path.dirname(__file__), '..', '..', 'plugin_source', 'mdefender-pro', 'admin', 'partials', 'dashboard.php')
with open(dashboard_file, 'r', encoding='utf-8') as f:
    code = f.read()

code_norm = code.replace('\r\n', '\n')

old_card4 = '''            <span class="mdf-card-metric-label">Blacklisted IPs</span>
            <div class="mdf-card-metric-row">
                <span class="mdf-card-metric-num" id="statBlacklistCount"><?php echo esc_html($formatted_blacklist); ?></span>
                <span class="mdf-badge-trend mdf-trend-green"><?php echo $total_blacklisted_real > 0 ? 'Enforced' : 'Clean'; ?></span>
            </div>
            <span class="mdf-card-metric-sub" id="subBlacklistCount"><?php echo $total_blacklisted_real > 0 ? number_format($total_blacklisted_real) . ' perimeter blocks active' : 'Zero active perimeter IP blocks'; ?></span>'''

new_card4 = '''            <span class="mdf-card-metric-label">Quarantined IPs &amp; Countries</span>
            <div class="mdf-card-metric-row">
                <span class="mdf-card-metric-num" id="statBlacklistCount"><?php echo esc_html(number_format($total_restrictions)); ?></span>
                <span class="mdf-badge-trend mdf-trend-green"><?php echo $total_restrictions > 0 ? 'Restricted' : 'Clean'; ?></span>
            </div>
            <span class="mdf-card-metric-sub" id="subBlacklistCount"><?php echo number_format($total_blacklisted_real) . ' IPs &bull; ' . count($blocked_countries_array) . ' Geo-restrictions'; ?></span>'''

if old_card4 in code_norm:
    code_norm = code_norm.replace(old_card4, new_card4)
    print("SUCCESS: Updated Card 4 in dashboard.php")
    with open(dashboard_file, 'w', encoding='utf-8') as f:
        f.write(code_norm)
else:
    print("FAILED: old_card4 pattern not found in dashboard.php")
