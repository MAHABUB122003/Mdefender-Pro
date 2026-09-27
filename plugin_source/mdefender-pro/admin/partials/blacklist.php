    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <h1 style="margin:0;">Blacklist Management</h1>
        <button class="button button-primary" onclick="wafFwShowBlacklistModal()">+ Block IP</button>
    </div>

    <div style="overflow-x:auto;margin-top:15px;">
        <table class="wp-list-table widefat fixed striped war-r-table" style="min-width:760px;">
            <thead>
                <tr>
                    <th style="width:140px;">IP Address</th>
                    <th>Reason</th>
                    <th style="width:110px;">Type</th>
                    <th style="width:90px;">Source</th>
                    <th style="width:160px;">Blocked At</th>
                    <th style="width:90px;">Actions</th>
                </tr>
            </thead>
        <tbody>
            <?php foreach ($blacklist as $entry): ?>
                <tr>
                    <td data-label="IP Address"><code><?php echo esc_html($entry->ip); ?></code></td>
                    <td data-label="Reason"><?php echo esc_html($entry->reason); ?></td>
                    <td data-label="Type"><span class="waf-fw-badge waf-fw-badge-<?php echo $entry->type === 'permanent' ? 'danger' : 'warning'; ?>"><?php echo esc_html($entry->type); ?></span></td>
                    <td data-label="Source"><span class="waf-fw-badge waf-fw-badge-<?php echo $entry->auto_blocked ? 'warning' : 'success'; ?>"><?php echo $entry->auto_blocked ? 'Auto' : 'Manual'; ?></span></td>
                    <td data-label="Blocked At"><?php echo esc_html($entry->blocked_at); ?></td>
                    <td data-label="Actions"><button class="button button-small button-link-delete" onclick="wafFwUnblock('<?php echo esc_js($entry->ip); ?>')">Unblock</button></td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
    </div>

    <div id="wafFwBlacklistModal" class="waf-fw-modal" style="display:none;">
        <div class="waf-fw-modal-content">
            <span class="waf-fw-modal-close" onclick="jQuery('#wafFwBlacklistModal').hide()">&times;</span>
            <h2>Block IP Address</h2>
            <form id="wafFwBlacklistForm">
                <p>
                    <label>IP Address</label>
                    <input type="text" id="wafFwBlockIP" class="widefat" required placeholder="192.168.1.100">
                </p>
                <p>
                    <label>Reason</label>
                    <input type="text" id="wafFwBlockReason" class="widefat" required placeholder="Suspicious activity">
                </p>
                <p>
                    <label>Block Type</label>
                    <select id="wafFwBlockType" class="widefat">
                        <option value="permanent">Permanent</option>
                        <option value="temporary">Temporary</option>
                    </select>
                </p>
                <p><button type="submit" class="button button-primary">Block IP</button></p>
            </form>
        </div>
    </div>

    <script>
    function wafFwShowBlacklistModal() {
        jQuery('#wafFwBlacklistForm')[0].reset();
        jQuery('#wafFwBlacklistModal').show();
    }
    jQuery('#wafFwBlacklistForm').on('submit', function(e) {
        e.preventDefault();
        jQuery.post(ajaxurl + '?action=waf_fw_add_blacklist', JSON.stringify({
            ip: jQuery('#wafFwBlockIP').val(),
            reason: jQuery('#wafFwBlockReason').val(),
            type: jQuery('#wafFwBlockType').val()
        }), function(r) { if (r.success) location.reload(); });
    });
    function wafFwUnblock(ip) {
        if (confirm('Unblock IP ' + ip + '?')) {
            jQuery.post(ajaxurl + '?action=waf_fw_remove_blacklist&ip=' + encodeURIComponent(ip), function(r) {
                if (r.success) location.reload();
            });
        }
    }
    </script>
