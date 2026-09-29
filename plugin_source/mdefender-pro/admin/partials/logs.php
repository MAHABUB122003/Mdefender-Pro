<?php
defined('ABSPATH') || exit;

if (!function_exists('waf_get_country_name')) {
    function waf_get_country_name($code) {
        $countries = [
            'BD' => 'Bangladesh', 'US' => 'United States', 'RO' => 'Romania', 'IN' => 'India',
            'PK' => 'Pakistan', 'GB' => 'United Kingdom', 'CA' => 'Canada', 'DE' => 'Germany',
            'FR' => 'France', 'CN' => 'China', 'RU' => 'Russia', 'JP' => 'Japan',
            'BR' => 'Brazil', 'AU' => 'Australia', 'IT' => 'Italy', 'NL' => 'Netherlands',
            'ES' => 'Spain', 'SG' => 'Singapore', 'MY' => 'Malaysia', 'TH' => 'Thailand',
            'ID' => 'Indonesia', 'TR' => 'Turkey', 'UA' => 'Ukraine', 'SA' => 'Saudi Arabia',
            'AE' => 'United Arab Emirates', 'ZA' => 'South Africa', 'KR' => 'South Korea',
            'IR' => 'Iran', 'KP' => 'North Korea', 'VN' => 'Vietnam', 'PH' => 'Philippines',
            'LOCAL' => 'Local / Private Network'
        ];
        $code = strtoupper(trim((string)$code));
        if ($code === 'LOCAL' || $code === '127.0.0.1' || $code === '::1') return 'Local / Private Network';
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
    .waf-log-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        text-decoration: none;
        transition: all 0.2s;
        border: 1px solid #e2e8f0;
        background: #fff;
        color: #475569;
    }
    .waf-log-pill:hover {
        border-color: #2563eb;
        color: #2563eb;
    }
    .waf-log-pill.active {
        background: #2563eb;
        color: #fff;
        border-color: #2563eb;
    }

    @media (max-width: 782px) {
        .war-r-table thead {
            display: none !important;
        }
        .war-r-table, .war-r-table tbody, .war-r-table tr.waf-log-row {
            display: block !important;
            width: 100% !important;
        }
        .war-r-table tr.waf-log-row {
            margin-bottom: 12px !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            background: #fff !important;
            padding: 10px 14px !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.03) !important;
        }
        .war-r-table tr.waf-log-row td {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 6px 0 !important;
            border: none !important;
            border-bottom: 1px solid #f1f5f9 !important;
            font-size: 12.5px !important;
            text-align: right !important;
        }
        .war-r-table tr.waf-log-row td:last-child {
            border-bottom: none !important;
        }
        .war-r-table tr.waf-log-row td::before {
            content: attr(data-label);
            font-weight: 700;
            color: #64748b;
            text-align: left;
            margin-right: 12px;
            font-size: 11.5px;
            text-transform: uppercase;
        }
    }
</style>

<div class="wrap" style="max-width: 1400px; margin: 0 auto;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-top:10px;flex-wrap:wrap;gap:12px;">
        <div>
            <h1 style="margin:0;font-size:24px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:8px;">
                <span class="dashicons dashicons-shield" style="font-size:28px;width:28px;height:28px;color:#2563eb;"></span>
                Security Traffic & Attack Logs
            </h1>
            <p style="margin:4px 0 0;font-size:13px;color:#64748b;">Unified live inspection of all incoming HTTP requests, blocked attacks, and normal visitor traffic.</p>
        </div>
        <div style="display:flex;gap:10px;align-items:center;">
            <a href="<?php echo admin_url('admin.php?page=waf-firewall-settings'); ?>" class="button" style="height:36px;line-height:34px;font-weight:600;">WAF Settings</a>
            <button type="button" onclick="wafFwClearLogs()" class="button button-danger" style="background:#dc2626;color:#fff;border-color:#dc2626;height:36px;font-weight:600;">Clear All Logs</button>
        </div>
    </div>

    <!-- Quick Filter Pills -->
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:16px;">
        <a href="<?php echo admin_url('admin.php?page=waf-firewall-logs'); ?>" class="waf-log-pill <?php echo empty($_GET['status']) ? 'active' : ''; ?>">
            <span>All Traffic</span>
            <span style="background:rgba(0,0,0,0.08);padding:1px 6px;border-radius:999px;font-size:11px;"><?php echo number_format($logs['total']); ?></span>
        </a>
        <a href="<?php echo admin_url('admin.php?page=waf-firewall-logs&status=blocked'); ?>" class="waf-log-pill <?php echo ($_GET['status'] ?? '') === 'blocked' ? 'active' : ''; ?>">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;"></span>
            <span>Blocked Attacks</span>
        </a>
        <a href="<?php echo admin_url('admin.php?page=waf-firewall-logs&status=allowed'); ?>" class="waf-log-pill <?php echo ($_GET['status'] ?? '') === 'allowed' ? 'active' : ''; ?>">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;"></span>
            <span>Allowed Normal Traffic</span>
        </a>
    </div>

    <!-- Filter Bar Card -->
    <div class="war-card" style="background:#ffffff;border:1px solid #cbd5e1;border-radius:8px;padding:16px 20px;margin-bottom:20px;box-shadow:0 1px 3px rgba(15,23,42,0.03);">
        <form method="get" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:0;">
            <input type="hidden" name="page" value="waf-firewall-logs">
            <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:220px;">
                <label style="font-weight:600;font-size:12.5px;color:#475569;white-space:nowrap;">Search IP / URL / Rule:</label>
                <input type="text" name="search" value="<?php echo esc_attr($_GET['search'] ?? ''); ?>" placeholder="e.g. 192.168.1.1 or wp-login.php" style="height:36px;border-radius:6px;border:1px solid #cbd5e1;padding:0 12px;font-size:13px;width:100%;">
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
                <label style="font-weight:600;font-size:12.5px;color:#475569;white-space:nowrap;">Status Filter:</label>
                <select name="status" style="height:36px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;padding:0 10px;">
                    <option value="">All Traffic</option>
                    <option value="blocked" <?php selected($_GET['status'] ?? '', 'blocked'); ?>>Blocked Attacks Only</option>
                    <option value="allowed" <?php selected($_GET['status'] ?? '', 'allowed'); ?>>Allowed Traffic Only</option>
                </select>
            </div>
            <div style="display:flex;gap:8px;">
                <button type="submit" class="button button-primary" style="height:36px;line-height:34px;padding:0 18px;background:#2563eb;border-color:#1d4ed8;font-weight:600;">Filter Logs</button>
                <a href="<?php echo admin_url('admin.php?page=waf-firewall-logs'); ?>" class="button" style="height:36px;line-height:34px;padding:0 14px;">Reset</a>
            </div>
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
                                <td data-label="Location" class="waf-geo-cell" data-ip="<?php echo esc_attr($log->ip); ?>" data-cc="<?php echo esc_attr($log->country_code); ?>">
                                    <div style="display:flex;align-items:center;gap:6px;">
                                        <?php if (!empty($log->country_code) && $log->country_code !== 'LOCAL'): ?>
                                            <img src="https://flagcdn.com/16x12/<?php echo strtolower($log->country_code); ?>.png" 
                                                 title="<?php echo esc_attr($log->country_code); ?>" 
                                                 alt="<?php echo esc_attr($log->country_code); ?>" 
                                                 class="waf-flag-img"
                                                 style="border-radius:2px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); width: 16px; height: 12px; display:inline-block; vertical-align:middle;" />
                                            <span class="waf-country-name" style="font-size:12.5px;font-weight:600;color:#334155;"><?php echo esc_html(waf_get_country_name($log->country_code)); ?></span>
                                        <?php elseif ($log->country_code === 'LOCAL' || in_array($log->ip, ['127.0.0.1', '::1', 'localhost'], true) || strpos($log->ip, '192.168.') === 0 || strpos($log->ip, '10.') === 0): ?>
                                            <img src="https://flagcdn.com/16x12/bd.png" 
                                                 title="Local Network" alt="Local" class="waf-flag-img"
                                                 style="border-radius:2px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); width: 16px; height: 12px; display:inline-block; vertical-align:middle;" />
                                            <span class="waf-country-name" style="font-size:12.5px;font-weight:600;color:#334155;">Local / Private Network</span>
                                        <?php else: ?>
                                            <span class="dashicons dashicons-admin-site waf-flag-icon" title="Resolving Location..." style="font-size:16px;width:16px;height:16px;color:#94a3b8;display:inline-block;vertical-align:middle;"></span>
                                            <span class="waf-country-name" style="font-size:12.5px;color:#64748b;">Loading Location...</span>
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
                                            <div class="waf-detail-narrative" data-ip="<?php echo esc_attr($log->ip); ?>" style="margin-bottom:14px;background:#fff;padding:14px 16px;border-radius:8px;border:1px solid #cbd5e1;color:#1e293b;box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                                                <?php
                                                $locName = waf_get_country_name($log->country_code);
                                                $flagHtml = (!empty($log->country_code) && $log->country_code !== 'LOCAL') ? '<img src="https://flagcdn.com/16x12/' . strtolower($log->country_code) . '.png" style="border-radius:2px;width:16px;height:12px;margin-right:6px;vertical-align:-1px;display:inline-block;" />' : '<img src="https://flagcdn.com/16x12/bd.png" style="border-radius:2px;width:16px;height:12px;margin-right:6px;vertical-align:-1px;display:inline-block;" />';
                                                $formattedTime = date('M d, Y h:i:s A', strtotime($log->created_at));
                                                
                                                if ($log->status === 'blocked') {
                                                    echo '<span class="waf-narrative-content">' . $flagHtml . '<strong>' . esc_html($locName) . '</strong> (' . esc_html($log->ip) . ') was blocked by firewall for <strong>' . esc_html($log->attack_type) . '</strong> in request: <code>' . esc_html($log->rule_matched) . '</code> at <a href="' . esc_url($log->url) . '" target="_blank">' . esc_html($log->url) . '</a> at ' . esc_html($formattedTime) . '</span>';
                                                } else {
                                                    echo '<span class="waf-narrative-content">' . $flagHtml . '<strong>' . esc_html($locName) . '</strong> (' . esc_html($log->ip) . ') visited the site and was allowed. Page: <a href="' . esc_url($log->url) . '" target="_blank">' . esc_html($log->url) . '</a> at ' . esc_html($formattedTime) . '</span>';
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
                                <div style="margin-bottom:8px;color:#94a3b8;"><span class="dashicons dashicons-shield-alt" style="font-size:36px;width:36px;height:36px;"></span></div>
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

    // Dynamic Client-side GeoIP Flag resolution (matching User Dashboard)
    var ipCache = {};
    $('.waf-geo-cell').each(function() {
        var $cell = $(this);
        var ip = $cell.data('ip');
        if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return;
        if (ip.indexOf('192.168.') === 0 || ip.indexOf('10.') === 0 || ip.indexOf('172.16.') === 0 || ip.indexOf('172.17.') === 0 || ip.indexOf('172.18.') === 0 || ip.indexOf('172.19.') === 0 || ip.indexOf('172.2') === 0 || ip.indexOf('172.30.') === 0 || ip.indexOf('172.31.') === 0) return;

        if (ipCache[ip]) {
            applyGeo(ip, ipCache[ip]);
            return;
        }

        fetch('https://ipwho.is/' + encodeURIComponent(ip))
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data && data.success && data.country_code) {
                    var geo = {
                        code: data.country_code.toLowerCase(),
                        name: data.country || data.country_code,
                        flag: data.flag && data.flag.img ? data.flag.img : ('https://flagcdn.com/16x12/' + data.country_code.toLowerCase() + '.png')
                    };
                    ipCache[ip] = geo;
                    applyGeo(ip, geo);
                } else {
                    fallbackGeo(ip);
                }
            })
            .catch(function() {
                fallbackGeo(ip);
            });
    });

    function fallbackGeo(ip) {
        fetch('https://freeipapi.com/api/json/' + encodeURIComponent(ip))
            .then(function(r) { return r.json(); })
            .then(function(data2) {
                if (data2 && data2.countryCode) {
                    var geo = {
                        code: data2.countryCode.toLowerCase(),
                        name: data2.countryName || data2.countryCode,
                        flag: 'https://flagcdn.com/16x12/' + data2.countryCode.toLowerCase() + '.png'
                    };
                    ipCache[ip] = geo;
                    applyGeo(ip, geo);
                }
            })
            .catch(function() {});
    }

    function applyGeo(ip, geo) {
        $('.waf-geo-cell[data-ip="' + ip + '"]').each(function() {
            var $c = $(this);
            $c.find('.waf-flag-icon').remove();
            var $img = $c.find('.waf-flag-img');
            if (!$img.length) {
                $img = $('<img class="waf-flag-img" style="border-radius:2px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); width: 16px; height: 12px; display:inline-block; vertical-align:middle; margin-right:4px;" />');
                $c.find('div').prepend($img);
            }
            $img.attr('src', geo.flag).attr('title', geo.name).attr('alt', geo.code);
            $c.find('.waf-country-name').text(geo.name);
        });
    }
});

function wafFwActionBlockIp(ip) {
    if (!ip) return;
    if (!confirm('Are you sure you want to block IP ' + ip + ' permanently?')) return;
    var nonce = (typeof waf_fw_ajax !== 'undefined' && waf_fw_ajax.nonce) ? waf_fw_ajax.nonce : '<?php echo wp_create_nonce("waf_fw_ajax"); ?>';
    jQuery.post(ajaxurl, {
        action: 'waf_fw_block_ip',
        ip: ip,
        reason: 'Manual block from attack log inspector',
        nonce: nonce
    }, function(r) {
        if (r && r.success) {
            alert('IP ' + ip + ' blocked and added to Blacklist successfully.');
            location.reload();
        } else {
            alert('Error: ' + ((r && r.data && r.data.message) || 'Could not block IP'));
        }
    }).fail(function(xhr) {
        alert('Request failed: ' + (xhr.responseJSON && xhr.responseJSON.data && xhr.responseJSON.data.message ? xhr.responseJSON.data.message : 'Server error'));
    });
}

function wafFwActionWhitelistIp(ip) {
    if (!ip) return;
    if (!confirm('Add IP ' + ip + ' to Whitelist?')) return;
    var nonce = (typeof waf_fw_ajax !== 'undefined' && waf_fw_ajax.nonce) ? waf_fw_ajax.nonce : '<?php echo wp_create_nonce("waf_fw_ajax"); ?>';
    jQuery.post(ajaxurl, {
        action: 'waf_fw_whitelist_ip',
        ip: ip,
        reason: 'Whitelisted from attack log inspector',
        nonce: nonce
    }, function(r) {
        if (r && r.success) {
            alert('IP ' + ip + ' added to Whitelist successfully.');
            location.reload();
        } else {
            alert('Error: ' + ((r && r.data && r.data.message) || 'Could not whitelist IP'));
        }
    }).fail(function(xhr) {
        alert('Request failed: ' + (xhr.responseJSON && xhr.responseJSON.data && xhr.responseJSON.data.message ? xhr.responseJSON.data.message : 'Server error'));
    });
}

function wafFwClearLogs() {
    if (!confirm('Are you sure you want to delete ALL logs? This cannot be undone.')) return;
    var nonce = (typeof waf_fw_ajax !== 'undefined' && waf_fw_ajax.nonce) ? waf_fw_ajax.nonce : '<?php echo wp_create_nonce("waf_fw_ajax"); ?>';
    jQuery.post(ajaxurl, {
        action: 'waf_fw_clear_logs',
        nonce: nonce
    }, function(r) {
        if (r && r.success) {
            alert('All logs cleared successfully.');
            location.reload();
        } else {
            alert('Failed to clear logs: ' + ((r && r.data && r.data.message) || 'Unknown error'));
        }
    }).fail(function(xhr) {
        alert('Request failed');
    });
}
</script>
