    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <h1 style="margin:0;">Rules Management</h1>
        <button class="button button-primary" onclick="wafFwShowRuleModal()">+ Add New Rule</button>
    </div>

    <div style="overflow-x:auto;margin-top:15px;">
        <table class="wp-list-table widefat fixed striped war-r-table" style="min-width:760px;">
            <thead>
                <tr>
                    <th style="width:180px;">Name</th>
                    <th>Pattern</th>
                    <th style="width:90px;">Action</th>
                    <th style="width:100px;">Severity</th>
                    <th style="width:80px;">Status</th>
                    <th style="width:160px;">Actions</th>
                </tr>
            </thead>
        <tbody>
            <?php foreach ($rules as $rule): ?>
<tr>
                <td data-label="Name"><strong><?php echo esc_html($rule['name']); ?></strong></td>
                <td data-label="Pattern"><code><?php echo esc_html(substr($rule['pattern'], 0, 60)); ?></code></td>
                <td data-label="Action"><span class="waf-fw-badge waf-fw-badge-<?php echo $rule['action'] === 'block' ? 'danger' : 'warning'; ?>"><?php echo esc_html($rule['action']); ?></span></td>
                <td data-label="Severity"><span class="waf-fw-badge waf-fw-severity-<?php echo esc_attr($rule['severity']); ?>"><?php echo esc_html($rule['severity']); ?></span></td>
                <td data-label="Status">
                    <label class="waf-fw-switch">
                        <input type="checkbox" <?php checked($rule['enabled']); ?> onchange="wafFwToggleRule(<?php echo $rule['id']; ?>, this.checked)">
                        <span class="waf-fw-slider"></span>
                    </label>
                </td>
                <td data-label="Actions">
                    <button class="button button-small" onclick="wafFwEditRule(<?php echo $rule['id']; ?>)">Edit</button>
                    <button class="button button-small button-link-delete" onclick="wafFwDeleteRule(<?php echo $rule['id']; ?>)">Delete</button>
                </td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
    </div>

    <div id="wafFwRuleModal" class="waf-fw-modal" style="display:none;">
        <div class="waf-fw-modal-content">
            <span class="waf-fw-modal-close" onclick="wafFwCloseRuleModal()">&times;</span>
            <h2 id="wafFwModalTitle">Add New Rule</h2>
            <form id="wafFwRuleForm">
                <input type="hidden" id="wafFwRuleId">
                <p>
                    <label>Rule Name</label>
                    <input type="text" id="wafFwRuleName" class="widefat" required>
                </p>
                <p>
                    <label>Pattern (Regex)</label>
                    <input type="text" id="wafFwRulePattern" class="widefat" required placeholder="/(pattern)/i">
                </p>
                <p>
                    <label>Action</label>
                    <select id="wafFwRuleAction" class="widefat">
                        <option value="block">Block</option>
                        <option value="alert">Alert</option>
                    </select>
                </p>
                <p>
                    <label>Severity</label>
                    <select id="wafFwRuleSeverity" class="widefat">
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </p>
                <p>
                    <button type="submit" class="button button-primary">Save Rule</button>
                </p>
            </form>
        </div>
    </div>

    <script>
    function wafFwShowRuleModal() {
        jQuery('#wafFwModalTitle').text('Add New Rule');
        jQuery('#wafFwRuleForm')[0].reset();
        jQuery('#wafFwRuleId').val('');
        jQuery('#wafFwRuleModal').show();
    }
    function wafFwCloseRuleModal() { jQuery('#wafFwRuleModal').hide(); }
    function wafFwEditRule(id) {
        jQuery.get(ajaxurl, {action:'waf_fw_get_rules'}, function(r) {
            if (r.success) {
                var rule = r.data.find(function(rr) { return rr.id === id; });
                if (rule) {
                    jQuery('#wafFwModalTitle').text('Edit Rule');
                    jQuery('#wafFwRuleId').val(id);
                    jQuery('#wafFwRuleName').val(rule.name);
                    jQuery('#wafFwRulePattern').val(rule.pattern);
                    jQuery('#wafFwRuleAction').val(rule.action);
                    jQuery('#wafFwRuleSeverity').val(rule.severity);
                    jQuery('#wafFwRuleModal').show();
                }
            }
        });
    }
    jQuery('#wafFwRuleForm').on('submit', function(e) {
        e.preventDefault();
        var id = jQuery('#wafFwRuleId').val();
        var data = {
            name: jQuery('#wafFwRuleName').val(),
            pattern: jQuery('#wafFwRulePattern').val(),
            action: jQuery('#wafFwRuleAction').val(),
            severity: jQuery('#wafFwRuleSeverity').val()
        };
        var url = ajaxurl + '?action=' + (id ? 'waf_fw_update_rule&id=' + id : 'waf_fw_save_rule');
        jQuery.post(url, JSON.stringify(data), function(r) {
            if (r.success) location.reload();
        });
    });
    function wafFwDeleteRule(id) {
        if (confirm('Delete this rule?')) {
            jQuery.post(ajaxurl + '?action=waf_fw_delete_rule&id=' + id, function(r) {
                if (r.success) location.reload();
            });
        }
    }
    function wafFwToggleRule(id, enabled) {
        jQuery.post(ajaxurl + '?action=waf_fw_toggle_rule&id=' + id, JSON.stringify({enabled: enabled}));
    }
    jQuery('#wafFwRuleModal .waf-fw-modal-close').on('click', wafFwCloseRuleModal);
    jQuery(window).on('click', function(e) { if (e.target.id === 'wafFwRuleModal') wafFwCloseRuleModal(); });
    </script>
