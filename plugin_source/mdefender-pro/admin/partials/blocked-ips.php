<div class="war-card">
    <div class="war-card-header">
        <h3><span class="dashicons dashicons-block-default"></span> Blocked IPs</h3>
        <span class="war-card-badge war-card-badge-red">Auto-Blocked</span>
    </div>
    <div class="war-card-body">
        <p>IPs automatically blocked by the WAF attack rate limiter and login protection.</p>
        <button class="button" onclick="wafFwRefreshBlocked()">
            <span class="dashicons dashicons-update"></span> Refresh
        </button>
    </div>
    <div class="war-card-body war-card-body-no-pad">
        <table class="war-table war-r-table" id="wafBlockedIPsTable">
            <thead>
                <tr>
                    <th>IP Address</th>
                    <th>Reason</th>
                    <th>Type</th>
                    <th>Source</th>
                    <th>Blocked At</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="wafBlockedIPsBody">
                <tr class="war-table-empty">
                    <td colspan="6">
                        <span class="dashicons dashicons-shield"></span>
                        <p>No blocked IPs. Your site is secure.</p>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</div>

<script>
function wafFwRefreshBlocked() {
    jQuery.get(ajaxurl + '?action=waf_fw_get_blacklist', function(r) {
        if (r.success) {
            var html = '';
            var count = 0;
            jQuery.each(r.data, function(i, entry) {
                if (entry.auto_blocked) {
                    count++;
                    html += '<tr>';
                    html += '<td data-label="IP Address"><code>' + entry.ip + '</code></td>';
                    html += '<td data-label="Reason">' + entry.reason + '</td>';
                    html += '<td data-label="Type"><span class="waf-fw-badge waf-fw-badge-' + (entry.type === 'permanent' ? 'danger' : 'warning') + '">' + entry.type + '</span></td>';
                    html += '<td data-label="Source"><span class="waf-fw-badge waf-fw-badge-warning">Auto</span></td>';
                    html += '<td data-label="Blocked At">' + entry.blocked_at + '</td>';
                    html += '<td data-label="Actions"><button class="button button-small button-link-delete" onclick="wafFwUnblock(\'' + entry.ip + '\')">Unblock</button></td>';
                    html += '</tr>';
                }
            });
            if (count === 0) {
                html = '<tr class="war-table-empty"><td colspan="6"><span class="dashicons dashicons-shield"></span><p>No blocked IPs. Your site is secure.</p></td></tr>';
            }
            jQuery('#wafBlockedIPsBody').html(html);
        }
    });
}

function wafFwUnblock(ip) {
    if (confirm('Unblock IP ' + ip + '?')) {
        jQuery.post(ajaxurl + '?action=waf_fw_remove_blacklist&ip=' + encodeURIComponent(ip), function(r) {
            if (r.success) wafFwRefreshBlocked();
        });
    }
}

jQuery(document).ready(function() {
    wafFwRefreshBlocked();
});
</script>
