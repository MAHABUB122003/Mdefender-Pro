<?php
defined('ABSPATH') || exit;

if (!function_exists('waf_get_country_name')) {
    function waf_get_country_name($code) {
        $countries = [
            'BD' => 'Bangladesh',
            'US' => 'United States',
            'RO' => 'Romania',
            'IN' => 'India',
            'PK' => 'Pakistan',
            'GB' => 'United Kingdom',
            'CA' => 'Canada',
            'DE' => 'Germany',
            'FR' => 'France',
            'CN' => 'China',
            'RU' => 'Russia',
            'JP' => 'Japan',
            'BR' => 'Brazil',
            'AU' => 'Australia',
            'IT' => 'Italy',
            'NL' => 'Netherlands',
            'ES' => 'Spain',
            'SG' => 'Singapore',
            'MY' => 'Malaysia',
            'TH' => 'Thailand',
            'ID' => 'Indonesia',
            'TR' => 'Turkey',
            'UA' => 'Ukraine',
            'SA' => 'Saudi Arabia',
            'AE' => 'United Arab Emirates',
            'ZA' => 'South Africa',
            'KR' => 'South Korea',
            'IR' => 'Iran',
            'KP' => 'North Korea',
            'VN' => 'Vietnam',
            'PH' => 'Philippines',
        ];
        $code = strtoupper($code);
        return $countries[$code] ?? $code;
    }
}

$logger = WAF_FW_Logger::instance();
$logs = $logger->get_logs($_GET);
?>

<style>
    .war-r-table tbody tr.waf-log-row:hover {
        background: #f8fafc !important;
        cursor: pointer;
    }
</style>

<div class="wrap">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-top:10px;">
        <h1 style="margin:0;font-size:24px;font-weight:800;color:#0f172a;">🛡️ WAF Security Logs</h1>
        <button type="button" onclick="wafFwClearLogs()" class="button button-danger" style="background:#dc2626;color:#fff;border-color:#dc2626;height:36px;font-weight:600;">Clear All Logs</button>
    </div>

    <!-- Filter Bar Card -->
    <div class="war-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:20px;box-shadow:0 1px 3px rgba(15,23,42,0.04);">
        <form method="get" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0;">
            <input type="hidden" name="page" value="waf-firewall-logs">
            <div style="display:flex;align-items:center;gap:6px;">
                <label style="font-weight:600;font-size:13px;color:#475569;">Search IP/URL:</label>
                <input type="text" name="search" value="<?php echo esc_attr($_GET['search'] ?? ''); ?>" placeholder="e.g. 192.168.1.1" style="height:36px;border-radius:6px;border:1px solid #cbd5e1;padding:0 10px;font-size:13px;width:200px;">
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
                <label style="font-weight:600;font-size:13px;color:#475569;">Status:</label>
                <select name="status" style="height:36px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;padding:0 8px;">
                    <option value="">All Traffic</option>
                    <option value="blocked" <?php selected($_GET['status'] ?? '', 'blocked'); ?>>Blocked Attacks Only</option>
                    <option value="allowed" <?php selected($_GET['status'] ?? '', 'allowed'); ?>>Allowed Traffic Only</option>
                </select>
            </div>
            <button type="submit" class="button button-primary" style="height:36px;line-height:34px;padding:0 16px;background:var(--war-primary);border-color:var(--war-primary-dark);">Filter</button>
            <a href="<?php echo admin_url('admin.php?page=waf-firewall-logs'); ?>" class="button" style="height:36px;line-height:34px;padding:0 14px;">Reset</a>
        </form>

        <div style="overflow-x:auto;margin-top:20px;">
            <table class="wp-list-table widefat fixed striped war-r-table" style="border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;width:100%;">
                <thead>
                    <tr style="background:#f8fafc;">
                        <th style="width:65px;text-align:center;font-weight:700;color:#475569;">Type</th>
                        <th style="width:180px;font-weight:700;color:#475569;">Location</th>
                        <th style="font-weight:700;color:#475569;">Page Visited</th>
                        <th style="width:180px;font-weight:700;color:#475569;">Time</th>
                        <th style="width:150px;font-weight:700;color:#475569;">IP Address</th>
                        <th style="width:150px;font-weight:700;color:#475569;">Hostname</th>
                        <th style="width:90px;text-align:center;font-weight:700;color:#475569;">Response</th>
                        <th style="width:75px;text-align:center;font-weight:700;color:#475569;">View</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (!empty($logs['logs'])): ?>
                        <?php foreach ($logs['logs'] as $log): ?>
                            <tr class="waf-log-row" data-id="<?php echo esc_attr($log->id); ?>" style="vertical-align:middle;">
                                <!-- Type Status Indicator Dot -->
                                <td style="text-align:center;" data-label="Type">
                                    <?php if ($log->status === 'blocked'): ?>
                                        <span style="display:inline-block;width:10px;height:10px;background:#dc2626;border-radius:50%;" title="Blocked Action"></span>
                                    <?php else: ?>
                                        <span style="display:inline-block;width:10px;height:10px;background:#10b981;border-radius:50%;" title="Allowed Action"></span>
                                    <?php endif; ?>
                                </td>

                                <!-- Location Flag & Country Name -->
                                <td data-label="Location">
                                    <div style="display:flex;align-items:center;gap:6px;">
                                        <?php if (!empty($log->country_code)): ?>
                                            <img src="https://flagcdn.com/16x12/<?php echo strtolower($log->country_code); ?>.png" 
                                                 title="<?php echo esc_attr($log->country_code); ?>" 
                                                 alt="<?php echo esc_attr($log->country_code); ?>" 
                                                 style="border-radius:2px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); width: 16px; height: 12px; display:inline-block; vertical-align:middle;" />
                                            <span style="font-size:12.5px;font-weight:600;color:#334155;"><?php echo esc_html(waf_get_country_name($log->country_code)); ?></span>
                                        <?php else: ?>
                                            <span class="dashicons dashicons-admin-site" title="Unknown Location" style="font-size:16px;width:16px;height:16px;color:#94a3b8;display:inline-block;vertical-align:middle;"></span>
                                            <span style="font-size:12.5px;color:#64748b;">Unknown Location</span>
                                        <?php endif; ?>
                                    </div>
                                </td>

                                <!-- Page Visited URL -->
                                <td data-label="Page Visited">
                                    <span title="<?php echo esc_attr($log->url); ?>" style="font-family:monospace;font-size:12px;color:#1e293b;word-break:break-all;">
                                        <?php echo esc_html(strlen($log->url) > 60 ? substr($log->url, 0, 60) . '...' : $log->url); ?>
                                    </span>
                                </td>

                                <!-- Time -->
                                <td style="font-size:12px;color:#475569;" data-label="Time">
                                    <?php echo esc_html(date('M d, Y h:i:s A', strtotime($log->created_at))); ?>
                                </td>

                                <!-- IP Address -->
                                <td data-label="IP Address">
                                    <code style="font-size:12px;font-weight:600;color:#0f172a;"><?php echo esc_html($log->ip); ?></code>
                                </td>

                                <!-- Hostname -->
                                <td data-label="Hostname" style="font-size:12px;color:#64748b;">
                                    <code><?php echo esc_html($log->ip); ?></code>
                                </td>

                                <!-- Response HTTP Code -->
                                <td style="text-align:center;" data-label="Response">
                                    <span style="font-weight:700;color:<?php echo $log->status === 'blocked' ? '#b91c1c' : '#15803d'; ?>;">
                                        <?php echo $log->status === 'blocked' ? '403' : '200'; ?>
                                    </span>
                                </td>

                                <!-- View Inspect details -->
                                <td style="text-align:center;" data-label="View">
                                    <button type="button" class="waf-toggle-trigger" style="background:none;border:none;cursor:pointer;color:#475569;display:inline-flex;align-items:center;justify-content:center;padding:4px;" title="View Details">
                                        <span class="dashicons dashicons-visibility" style="font-size:18px;width:18px;height:18px;"></span>
                                    </button>
                                </td>
                            </tr>

                            <!-- Inline Accordion Detail Row (Wordfence-style inline details block) -->
                            <tr id="waf-log-detail-<?php echo esc_attr($log->id); ?>" class="waf-log-detail-row" style="display:none;background:#fcfdfe;">
                                <td colspan="8" style="padding:20px 24px;border-top:none;border-bottom:1.5px solid #cbd5e1;background:#f8fafc;">
                                    <div style="display:flex;gap:24px;align-items:start;">
                                        
                                        <!-- Left Side Circle Status Column -->
                                        <div style="text-align:center;flex:0 0 100px;display:flex;flex-direction:column;align-items:center;">
                                            <?php if ($log->status === 'blocked'): ?>
                                                <div style="width:56px;height:56px;border-radius:50%;background:#dc2626;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 3px 8px rgba(220,38,38,0.2);margin-bottom:8px;">
                                                    <span class="dashicons dashicons-no-alt" style="font-size:28px;width:28px;height:28px;line-height:28px;"></span>
                                                </div>
                                                <span style="font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#dc2626;">Type: Blocked</span>
                                            <?php else: ?>
                                                <div style="width:56px;height:56px;border-radius:50%;background:#10b981;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 3px 8px rgba(16,185,129,0.2);margin-bottom:8px;">
                                                    <span class="dashicons dashicons-yes" style="font-size:28px;width:28px;height:28px;line-height:28px;"></span>
                                                </div>
                                                <span style="font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#10b981;">Type: Allowed</span>
                                            <?php endif; ?>
                                        </div>

                                        <!-- Right Side Details Description Column -->
                                        <div style="flex:1;font-size:13.5px;color:#334155;line-height:1.6;text-align:left;">
                                            <div style="margin-bottom:14px;background:#fff;padding:14px 16px;border-radius:8px;border:1px solid #cbd5e1;color:#1e293b;box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                                                <?php
                                                $locName = waf_get_country_name($log->country_code);
                                                $flagHtml = !empty($log->country_code) ? '<img src="https://flagcdn.com/16x12/' . strtolower($log->country_code) . '.png" style="border-radius:2px;width:16px;height:12px;margin-right:6px;vertical-align:-1px;display:inline-block;" />' : '';
                                                $formattedTime = date('M d, Y h:i:s A', strtotime($log->created_at));
                                                
                                                if ($log->status === 'blocked') {
                                                    echo $flagHtml . '<strong>' . esc_html($locName) . '</strong> (' . esc_html($log->ip) . ') was blocked by firewall for <strong>' . esc_html($log->attack_type) . '</strong> in request: <code>' . esc_html($log->rule_matched) . '</code> at <a href="' . esc_url($log->url) . '" target="_blank">' . esc_html($log->url) . '</a> at ' . esc_html($formattedTime);
                                                } else {
                                                    echo $flagHtml . '<strong>' . esc_html($locName) . '</strong> (' . esc_html($log->ip) . ') visited the site and was allowed. Page: <a href="' . esc_url($log->url) . '" target="_blank">' . esc_html($log->url) . '</a> at ' . esc_html($formattedTime);
                                                }
                                                ?>
                                            </div>

                                            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px 16px;margin-bottom:14px;font-size:12.5px;">
                                                <div>
                                                    <strong style="color:#64748b;">IP Address:</strong>
                                                    <code style="font-weight:700;color:#0f172a;margin-left:4px;"><?php echo esc_html($log->ip); ?></code>
                                                </div>
                                                <div>
                                                    <strong style="color:#64748b;">Hostname:</strong>
                                                    <code style="font-weight:700;color:#0f172a;margin-left:4px;"><?php echo esc_html($log->ip); ?></code>
                                                </div>
                                                <div>
                                                    <strong style="color:#64748b;">Human/Bot:</strong>
                                                    <span style="font-weight:700;color:#0f172a;margin-left:4px;">
                                                        <?php
                                                        $ua = $log->user_agent ?? '';
                                                        $isBot = preg_match('/bot|crawl|spider|google|slurp|bing|yandex|duckduck/i', $ua);
                                                        echo $isBot ? 'Bot' : 'Human';
                                                        ?>
                                                    </span>
                                                </div>
                                                <div>
                                                    <strong style="color:#64748b;">Response Code:</strong>
                                                    <span style="font-weight:700;color:<?php echo $log->status === 'blocked' ? '#b91c1c' : '#15803d'; ?>;margin-left:4px;">
                                                        <?php echo $log->status === 'blocked' ? '403' : '200'; ?>
                                                    </span>
                                                </div>
                                            </div>

                                            <?php if (!empty($log->request_body)): ?>
                                            <div style="margin-bottom:14px;">
                                                <strong style="color:#64748b;display:block;margin-bottom:4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Payload / Request Body:</strong>
                                                <pre style="background:#0f172a;color:#f87171;padding:10px 12px;border-radius:8px;font-family:monospace;font-size:12px;white-space:pre-wrap;word-break:break-all;max-height:120px;overflow-y:auto;margin:0;border:1px solid #1e293b;"><?php echo esc_html($log->request_body); ?></pre>
                                            </div>
                                            <?php endif; ?>

                                            <div style="margin-bottom:16px;">
                                                <strong style="color:#64748b;display:block;margin-bottom:4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">User Agent:</strong>
                                                <div style="background:#fff;color:#475569;padding:6px 10px;border-radius:6px;border:1px solid #cbd5e1;font-size:11.5px;word-break:break-all;box-shadow:inset 0 1px 2px rgba(0,0,0,0.02);"><?php echo esc_html($log->user_agent ?: 'Not provided'); ?></div>
                                            </div>

                                            <!-- Action buttons matching Wordfence layout -->
                                            <div style="display:flex;gap:10px;flex-wrap:wrap;padding-top:12px;border-top:1px solid #e2e8f0;">
                                                <button type="button" onclick="event.stopPropagation(); wafFwActionBlockIp('<?php echo esc_js($log->ip); ?>')" class="button" style="border-color:#cbd5e1;color:#b91c1c;font-weight:600;height:32px;line-height:30px;font-size:11.5px;background:#fff;">BLOCK IP</button>
                                                <a href="<?php echo admin_url('admin.php?page=waf-firewall-tools&tab=whois&ip=' . urlencode($log->ip)); ?>" onclick="event.stopPropagation();" target="_blank" class="button" style="border-color:#cbd5e1;color:#0284c7;font-weight:600;height:32px;line-height:30px;font-size:11.5px;text-decoration:none;display:inline-flex;align-items:center;gap:4px;background:#fff;">RUN WHOIS</a>
                                                <button type="button" onclick="event.stopPropagation(); wafFwActionWhitelistIp('<?php echo esc_js($log->ip); ?>')" class="button" style="border-color:#cbd5e1;color:#15803d;font-weight:600;height:32px;line-height:30px;font-size:11.5px;background:#fff;">WHITELIST IP</button>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <tr>
                            <td colspan="8" style="text-align:center;padding:36px;color:#64748b;">
                                <div style="font-size:32px;margin-bottom:8px;">🛡️</div>
                                <p style="font-size:14px;font-weight:600;margin:0;">No attack logs found</p>
                                <p style="font-size:12px;color:#94a3b8;margin:4px 0 0;">All incoming requests are currently clean or matching filters.</p>
                            </td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>

        <?php if ($logs['total_pages'] > 1): ?>
            <div class="tablenav bottom" style="margin-top:16px;">
                <div class="tablenav-pages">
                    <span class="displaying-num"><?php echo number_format($logs['total']); ?> records</span>
                    <?php
                    $base = admin_url('admin.php') . '?page=waf-firewall-logs';
                    $search = $_GET;
                    unset($search['page']);
                    if (!empty($search)) {
                        $base .= '&' . http_build_query($search);
                    }
                    echo paginate_links([
                        'base' => str_replace('999999', '%#%', add_query_arg('paged', '999999', $base)),
                        'format' => '',
                        'prev_text' => '&laquo; Prev',
                        'next_text' => 'Next &raquo;',
                        'total' => $logs['total_pages'],
                        'current' => $logs['page'],
                    ]);
                    ?>
                </div>
            </div>
        <?php endif; ?>
    </div>
</div>

<script>
jQuery(document).ready(function($) {
    // Toggle detail row on log row click
    $('.war-r-table tbody tr.waf-log-row').on('click', function(e) {
        // Exclude clicks on interactive elements inside the row (like buttons, links)
        if ($(e.target).closest('a, button').length) {
            return;
        }
        var id = $(this).data('id');
        var $detailRow = $('#waf-log-detail-' + id);
        
        // Toggle visibility with simple slide toggle or show/hide
        $detailRow.toggle();
        
        // Optional: Toggle the eye icon to closed-eye or toggle styling
        var $btn = $(this).find('.waf-toggle-trigger span');
        if ($detailRow.is(':visible')) {
            $btn.attr('class', 'dashicons dashicons-hidden');
            $(this).css('background', '#f1f5f9');
        } else {
            $btn.attr('class', 'dashicons dashicons-visibility');
            $(this).css('background', '');
        }
    });

    // Make trigger button inside row click also toggle the detail row
    $('.waf-toggle-trigger').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var id = $(this).closest('tr.waf-log-row').data('id');
        $('#waf-log-detail-' + id).toggle();
        
        var $btn = $(this).find('span');
        var $row = $(this).closest('tr.waf-log-row');
        if ($('#waf-log-detail-' + id).is(':visible')) {
            $btn.attr('class', 'dashicons dashicons-hidden');
            $row.css('background', '#f1f5f9');
        } else {
            $btn.attr('class', 'dashicons dashicons-visibility');
            $row.css('background', '');
        }
    });
});

function wafFwActionBlockIp(ip) {
    if (!ip) return;
    if (!confirm('Block IP ' + ip + ' permanently?')) return;
    jQuery.post(ajaxurl, {
        action: 'waf_fw_block_ip',
        ip: ip,
        reason: 'Manual block from attack log inspector'
    }, function(r) {
        if (r.success) {
            alert('IP ' + ip + ' blocked successfully.');
            location.reload();
        } else {
            alert('Error: ' + (r.data.message || 'Could not block IP'));
        }
    });
}

function wafFwActionWhitelistIp(ip) {
    if (!ip) return;
    if (!confirm('Add IP ' + ip + ' to Whitelist?')) return;
    jQuery.ajax({
        url: ajaxurl + '?action=waf_fw_add_blacklist',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ ip: ip, type: 'whitelist', reason: 'Whitelisted from attack log inspector' }),
        success: function(r) {
            if (r.success) {
                alert('IP ' + ip + ' whitelisted.');
                location.reload();
            } else {
                alert('Error: ' + (r.data.message || 'Could not whitelist IP'));
            }
        }
    });
}

function wafFwClearLogs() {
    if (!confirm('Are you sure you want to delete ALL logs? This cannot be undone.')) return;
    jQuery.post(ajaxurl + '?action=waf_fw_clear_logs', function(r) {
        if (r.success) {
            alert('All logs cleared successfully.');
            location.reload();
        } else {
            alert('Failed to clear logs: ' + (r.data.message || 'Unknown error'));
        }
    });
}
</script>
