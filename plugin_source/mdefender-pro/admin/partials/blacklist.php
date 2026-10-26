<?php
/**
 * MDefender-Pro IP Access & Blacklist
 * Clean, modern dashboard theme matching the master UI specification.
 *
 * @package MDefender-Pro
 */

if (!defined('ABSPATH')) exit;

$current_user = wp_get_current_user();
$user_initials = $current_user && $current_user->display_name ? strtoupper(substr($current_user->display_name, 0, 2)) : 'AR';

$total_blacklisted = is_array($blacklist) ? count($blacklist) : 0;
$perm_count = 0;
$auto_count = 0;

if (is_array($blacklist)) {
    foreach ($blacklist as $b) {
        if (($b->type ?? '') === 'permanent') $perm_count++;
        if (!empty($b->auto_blocked)) $auto_count++;
    }
}
?>

<div class="mdf-canvas-wrap">

    <!-- 1. Top Platform Bar -->
    <div class="mdf-top-bar">
        <div class="mdf-breadcrumbs" style="display:flex;align-items:center;gap:10px;">
            <div style="width:26px;height:26px;border-radius:7px;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(15,44,38,0.12);background:#FFFFFF;flex-shrink:0;">
                <img src="<?php echo defined('WAF_FW_PLUGIN_URL') ? esc_url(WAF_FW_PLUGIN_URL . 'assets/images/mdefender-logo.png') : ''; ?>" alt="MDefender Pro Logo" style="width:100%;height:100%;object-fit:contain;">
            </div>
            <span class="mdf-crumb-base">MDefender Pro</span>
            <span class="mdf-crumb-sep">&rsaquo;</span>
            <span class="mdf-crumb-current">Blacklist</span>
        </div>
        <div class="mdf-top-right">
            <div class="mdf-sys-status">
                <span class="mdf-dot-green"></span>
                <span>All systems operational</span>
            </div>
            <button type="button" class="mdf-icon-btn" title="Search" aria-label="Search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <button type="button" class="mdf-icon-btn" title="Filter" aria-label="Filter">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
            </button>
            <div class="mdf-avatar-chip"><?php echo esc_html($user_initials); ?></div>
        </div>
    </div>

    <!-- 2. Hero Header -->
    <div class="mdf-hero-header">
        <div class="mdf-hero-left">
            <div class="mdf-tag-pill">
                <span class="mdf-tag-square"></span>
                <span>ACCESS CONTROL &nbsp;/&nbsp; PERIMETER MITIGATION</span>
            </div>
            <h1 class="mdf-hero-title">IP Access &amp; <span class="mdf-orange-text">Blacklist.</span></h1>
            <p class="mdf-hero-subtitle">Enforce instantaneous perimeter blocks, CIDR rate limits, and automated threat containment.</p>
        </div>
        <div class="mdf-hero-actions">
            <button type="button" class="mdf-btn-scan" onclick="wafFwShowBlacklistModal()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                Block IP Address
            </button>
        </div>
    </div>

    <!-- 3. Telemetry Bento Cards -->
    <div class="mdf-bento-grid-4" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 24px;">
        <div class="mdf-bento-card">
            <div class="mdf-card-top">
                <div class="mdf-card-icon-circle mdf-circle-mint">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                </div>
                <span class="mdf-badge-trend mdf-trend-green">PERIMETER</span>
            </div>
            <span class="mdf-card-metric-label">Total Blacklisted IPs</span>
            <div class="mdf-card-metric-row">
                <span class="mdf-card-metric-num"><?php echo number_format($total_blacklisted); ?></span>
            </div>
            <span class="mdf-card-metric-sub">Blocked from accessing web applications</span>
        </div>

        <div class="mdf-bento-card">
            <div class="mdf-card-top">
                <div class="mdf-card-icon-circle mdf-circle-mint">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                </div>
                <span class="mdf-badge-trend mdf-trend-green">PERMANENT</span>
            </div>
            <span class="mdf-card-metric-label">Permanent Mitigations</span>
            <div class="mdf-card-metric-row">
                <span class="mdf-card-metric-num"><?php echo number_format($perm_count); ?></span>
            </div>
            <span class="mdf-card-metric-sub">Manual administrator perimeter bans</span>
        </div>

        <div class="mdf-bento-card">
            <div class="mdf-card-top">
                <div class="mdf-card-icon-circle mdf-circle-mint">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                </div>
                <span class="mdf-badge-trend mdf-trend-green">AUTOMATED</span>
            </div>
            <span class="mdf-card-metric-label">Rate Limiter &amp; Bot Traps</span>
            <div class="mdf-card-metric-row">
                <span class="mdf-card-metric-num"><?php echo number_format($auto_count); ?></span>
            </div>
            <span class="mdf-card-metric-sub">Automatically banned by AI engine</span>
        </div>
    </div>

    <!-- 4. Blacklist Table Card -->
    <div class="mdf-white-card mdf-table-container-card">
        <div class="mdf-card-header-flex">
            <div>
                <h3 class="mdf-chart-heading">Blacklisted IP Records</h3>
                <span class="mdf-chart-sub"><span id="wafBlacklistVisibleCount"><?php echo number_format($total_blacklisted); ?></span> IPs shown</span>
            </div>
            <div class="mdf-blacklist-toolbar">
                <label class="screen-reader-text" for="wafBlacklistSearch">Search blocked IPs</label>
                <input type="search" id="wafBlacklistSearch" placeholder="Search IP or reason">
                <label class="screen-reader-text" for="wafBlacklistType">Filter by block type</label>
                <select id="wafBlacklistType">
                    <option value="all">All block types</option>
                    <option value="permanent">Permanent</option>
                    <option value="temporary">Temporary</option>
                </select>
                <label class="screen-reader-text" for="wafBlacklistSource">Filter by source</label>
                <select id="wafBlacklistSource">
                    <option value="all">All sources</option>
                    <option value="manual">Manual</option>
                    <option value="automatic">Automatic</option>
                </select>
                <button type="button" class="mdf-btn-customize" id="wafBlacklistExport">Export CSV</button>
            </div>
        </div>

        <div class="mdf-table-responsive-box">
            <table class="mdf-events-data-table">
                <thead>
                    <tr>
                        <th style="width: 180px;">IP ADDRESS</th>
                        <th>REASON / EVENT</th>
                        <th style="width: 120px;">BLOCK TYPE</th>
                        <th style="width: 110px;">SOURCE</th>
                        <th style="width: 180px;">BLOCKED AT</th>
                        <th style="width: 110px; text-align: right;">ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($blacklist)): ?>
                        <tr>
                            <td colspan="6" style="text-align:center; padding: 40px; color: #7A8D87;">
                                No blacklisted IPs. Your site has no perimeter blocks.
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($blacklist as $entry): ?>
                            <tr data-blacklist-record="1" data-ip="<?php echo esc_attr($entry->ip); ?>" data-type="<?php echo esc_attr($entry->type); ?>" data-source="<?php echo !empty($entry->auto_blocked) ? 'automatic' : 'manual'; ?>">
                                <td>
                                    <div class="mdf-cell-origin">
                                        <span class="mdf-shield-icon-badge">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                        </span>
                                        <code style="font-family: 'JetBrains Mono', monospace; font-size: 11.5px; font-weight: 600; color: #111F1C;">
                                            <?php echo esc_html($entry->ip); ?>
                                        </code>
                                    </div>
                                </td>
                                <td>
                                    <span style="color: #637671; font-size: 11.5px;"><?php echo esc_html($entry->reason); ?></span>
                                </td>
                                <td>
                                    <?php if ($entry->type === 'permanent'): ?>
                                        <span class="mdf-pill-badge mdf-pill-critical">PERMANENT</span>
                                    <?php else: ?>
                                        <span class="mdf-pill-badge mdf-pill-warning">TEMPORARY</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <?php if ($entry->auto_blocked): ?>
                                        <span class="mdf-pill-badge mdf-pill-warning">AUTO (AI)</span>
                                    <?php else: ?>
                                        <span class="mdf-pill-badge mdf-pill-notice">MANUAL</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <span class="mdf-mono-time"><?php echo esc_html($entry->blocked_at); ?></span>
                                </td>
                                <td style="text-align: right;">
                                    <button type="button" class="mdf-btn-customize" style="padding: 5px 12px; font-size: 11px; color: #0D9488 !important;" onclick="wafFwUnblock('<?php echo esc_js($entry->ip); ?>')">
                                        Unblock
                                    </button>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                    <tr id="wafBlacklistNoMatches" style="display:none;">
                        <td colspan="6" style="text-align:center; padding: 28px; color: #66756d;">
                            No IPs match the current search and filters.
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- 5. Modal Dialog -->
    <div id="wafFwBlacklistModal" class="waf-fw-modal" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(15,44,38,0.5); z-index:99999; align-items:center; justify-content:center; padding:20px;">
        <div class="waf-fw-modal-content" style="background:#FFFFFF; border-radius:14px; max-width:480px; width:100%; padding:26px; box-shadow:0 12px 36px rgba(0,0,0,0.18); position:relative; margin:auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
                <h3 style="margin:0; font-size:17px; font-weight:700; color:#111F1C;">Block IP Address</h3>
                <button type="button" onclick="jQuery('#wafFwBlacklistModal').hide()" style="background:transparent; border:none; font-size:20px; color:#7A8D87; cursor:pointer;">&times;</button>
            </div>
            <form id="wafFwBlacklistForm">
                <div style="margin-bottom:14px;">
                    <label style="display:block; font-size:11.5px; font-weight:600; color:#637671; margin-bottom:6px;">IP Address</label>
                    <input type="text" id="wafFwBlockIP" style="width:100%; border:1px solid #D6DFDB; border-radius:8px; padding:8px 12px; font-size:12px; font-family:'JetBrains Mono', monospace; outline:none;" required placeholder="e.g. 192.168.1.100 or 45.148.10.19">
                </div>
                <div style="margin-bottom:14px;">
                    <label style="display:block; font-size:11.5px; font-weight:600; color:#637671; margin-bottom:6px;">Reason</label>
                    <input type="text" id="wafFwBlockReason" style="width:100%; border:1px solid #D6DFDB; border-radius:8px; padding:8px 12px; font-size:12px; font-family:inherit; outline:none;" required placeholder="e.g. Suspicious brute-force attempts">
                </div>
                <div style="margin-bottom:20px;">
                    <label style="display:block; font-size:11.5px; font-weight:600; color:#637671; margin-bottom:6px;">Block Type</label>
                    <select id="wafFwBlockType" style="width:100%; border:1px solid #D6DFDB; border-radius:8px; padding:8px 12px; font-size:12px; font-family:inherit; outline:none;">
                        <option value="permanent">Permanent Mitigation</option>
                        <option value="temporary">Temporary Block (24h)</option>
                    </select>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:10px;">
                    <button type="button" class="mdf-btn-customize" onclick="jQuery('#wafFwBlacklistModal').hide()">Cancel</button>
                    <button type="submit" class="mdf-btn-scan">Block IP</button>
                </div>
            </form>
        </div>
    </div>

</div>

<script>
var wafNonce = (typeof waf_fw_ajax !== 'undefined' && waf_fw_ajax.nonce) ? waf_fw_ajax.nonce : '<?php echo wp_create_nonce("waf_fw_ajax"); ?>';

function wafFwShowBlacklistModal() {
    jQuery('#wafFwBlacklistForm')[0].reset();
    jQuery('#wafFwBlacklistModal').css('display', 'flex');
}
jQuery('#wafFwBlacklistForm').on('submit', function(e) {
    e.preventDefault();
    jQuery.ajax({
        url: ajaxurl + '?action=waf_fw_add_blacklist',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            ip: jQuery('#wafFwBlockIP').val(),
            reason: jQuery('#wafFwBlockReason').val(),
            type: jQuery('#wafFwBlockType').val(),
            nonce: wafNonce
        }),
        success: function(r) {
            if (r.success) {
                location.reload();
            } else {
                alert('Error: ' + ((r.data && r.data.message) ? r.data.message : 'Failed to add IP to blacklist'));
            }
        },
        error: function() {
            alert('Request failed. Please check network connection.');
        }
    });
});
function wafFwUnblock(ip) {
    if (confirm('Unblock IP ' + ip + '?')) {
        jQuery.post(ajaxurl + '?action=waf_fw_remove_blacklist', {
            ip: ip,
            nonce: wafNonce
        }, function(r) {
            if (r.success) {
                location.reload();
            } else {
                alert('Error: ' + ((r.data && r.data.message) ? r.data.message : 'Failed to unblock IP'));
            }
        });
    }
}
jQuery('#wafFwBlacklistModal').on('click', function(e) { if (e.target.id === 'wafFwBlacklistModal') jQuery('#wafFwBlacklistModal').hide(); });

jQuery(function($) {
    function filterBlacklist() {
        var query = $('#wafBlacklistSearch').val().trim().toLowerCase();
        var type = $('#wafBlacklistType').val();
        var source = $('#wafBlacklistSource').val();
        var visibleCount = 0;

        $('tr[data-blacklist-record]').each(function() {
            var row = $(this);
            var matches = (!query || row.text().toLowerCase().indexOf(query) !== -1)
                && (type === 'all' || row.data('type') === type)
                && (source === 'all' || row.data('source') === source);
            row.toggle(matches);
            if (matches) visibleCount++;
        });

        $('#wafBlacklistVisibleCount').text(visibleCount);
        $('#wafBlacklistNoMatches').toggle(visibleCount === 0 && $('tr[data-blacklist-record]').length > 0);
    }

    $('#wafBlacklistSearch, #wafBlacklistType, #wafBlacklistSource').on('input change', filterBlacklist);

    $('#wafBlacklistExport').on('click', function() {
        var headers = [];
        $('.mdf-events-data-table thead th').slice(0, 5).each(function() {
            headers.push($(this).text().trim());
        });
        var rows = [headers.map(function(value) {
            return '"' + value.replace(/"/g, '""') + '"';
        }).join(',')];

        $('tr[data-blacklist-record]:visible').each(function() {
            var cells = [];
            $(this).find('td').slice(0, 5).each(function() {
                var value = $(this).text().trim().replace(/\s+/g, ' ');
                if (/^[\s]*[=+\-@]/.test(value)) value = "'" + value;
                cells.push('"' + value.replace(/"/g, '""') + '"');
            });
            rows.push(cells.join(','));
        });

        var blob = new Blob(['\uFEFF' + rows.join('\r\n')], {type: 'text/csv;charset=utf-8;'});
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = 'mdefender-blacklist.csv';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    });
});
</script>
