<?php
/**
 * MDefender-Pro Firewall Rules
 * Clean, modern dashboard theme matching the master UI specification.
 *
 * @package MDefender-Pro
 */

if (!defined('ABSPATH')) exit;

$current_user = wp_get_current_user();
$user_initials = $current_user && $current_user->display_name ? strtoupper(substr($current_user->display_name, 0, 2)) : 'AR';

$total_rules_count = is_array($rules) ? count($rules) : 0;
$block_count = 0;
$alert_count = 0;
if (is_array($rules)) {
    foreach ($rules as $r) {
        if (($r['action'] ?? '') === 'block') $block_count++;
        else $alert_count++;
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
            <span class="mdf-crumb-current">Firewall Rules</span>
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
                <span>CORE ENGINE &nbsp;/&nbsp; RULE POLICIES</span>
            </div>
            <h1 class="mdf-hero-title">Firewall <span class="mdf-orange-text">Rules.</span></h1>
            <p class="mdf-hero-subtitle">Manage heuristic regex inspection, mitigation directives, and automated threat policies.</p>
        </div>
        <div class="mdf-hero-actions">
            <button type="button" class="mdf-btn-scan" onclick="wafFwShowRuleModal()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add New Rule
            </button>
        </div>
    </div>

    <!-- 3. Telemetry Bento Cards -->
    <div class="mdf-bento-grid-4" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 24px;">
        <div class="mdf-bento-card">
            <div class="mdf-card-top">
                <div class="mdf-card-icon-circle mdf-circle-mint">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
                    </svg>
                </div>
                <span class="mdf-badge-trend mdf-trend-green">ACTIVE</span>
            </div>
            <span class="mdf-card-metric-label">Total Configured Rules</span>
            <div class="mdf-card-metric-row">
                <span class="mdf-card-metric-num"><?php echo number_format($total_rules_count); ?></span>
            </div>
            <span class="mdf-card-metric-sub">Heuristic inspection signatures</span>
        </div>

        <div class="mdf-bento-card">
            <div class="mdf-card-top">
                <div class="mdf-card-icon-circle mdf-circle-mint">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="9"/><line x1="5.6" y1="5.6" x2="18.4" y2="18.4"/>
                    </svg>
                </div>
                <span class="mdf-badge-trend mdf-trend-green">ENFORCING</span>
            </div>
            <span class="mdf-card-metric-label">Immediate Block Directives</span>
            <div class="mdf-card-metric-row">
                <span class="mdf-card-metric-num"><?php echo number_format($block_count); ?></span>
            </div>
            <span class="mdf-card-metric-sub">Drops malicious requests with HTTP 403</span>
        </div>

        <div class="mdf-bento-card">
            <div class="mdf-card-top">
                <div class="mdf-card-icon-circle mdf-circle-mint">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                </div>
                <span class="mdf-badge-trend mdf-trend-green">MONITORING</span>
            </div>
            <span class="mdf-card-metric-label">Alert &amp; Log Policies</span>
            <div class="mdf-card-metric-row">
                <span class="mdf-card-metric-num"><?php echo number_format($alert_count); ?></span>
            </div>
            <span class="mdf-card-metric-sub">Flags activity for forensic review</span>
        </div>
    </div>

    <!-- 4. Rules Data Table -->
    <div class="mdf-white-card mdf-table-container-card">
        <div class="mdf-card-header-flex">
            <div>
                <h3 class="mdf-chart-heading">Inspection Rules &amp; Signatures</h3>
                <span class="mdf-chart-sub">Configured policies evaluated on every HTTP ingress</span>
            </div>
        </div>

        <div class="mdf-table-responsive-box">
            <table class="mdf-events-data-table">
                <thead>
                    <tr>
                        <th style="width: 220px;">RULE NAME</th>
                        <th>REGEX PATTERN</th>
                        <th style="width: 100px;">ACTION</th>
                        <th style="width: 110px;">SEVERITY</th>
                        <th style="width: 90px; text-align: center;">STATUS</th>
                        <th style="width: 140px; text-align: right;">ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($rules)): ?>
                        <tr>
                            <td colspan="6" style="text-align:center; padding: 40px; color: #7A8D87;">
                                No rules configured. Click "Add New Rule" above to create one.
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($rules as $rule): ?>
                            <tr>
                                <td>
                                    <strong style="color: #111F1C; font-weight: 700;"><?php echo esc_html($rule['name']); ?></strong>
                                </td>
                                <td>
                                    <code style="font-family: 'JetBrains Mono', monospace; font-size: 11px; background: #F1F4F1; padding: 3px 8px; border-radius: 4px; color: #0F2C26; border: 1px solid #E6ECE8;">
                                        <?php echo esc_html(substr($rule['pattern'], 0, 70)); ?>
                                    </code>
                                </td>
                                <td>
                                    <?php if ($rule['action'] === 'block'): ?>
                                        <span class="mdf-pill-badge mdf-pill-critical">BLOCK</span>
                                    <?php else: ?>
                                        <span class="mdf-pill-badge mdf-pill-warning">ALERT</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <?php
                                    $sev = strtolower($rule['severity'] ?? 'medium');
                                    $sev_class = 'mdf-pill-notice';
                                    if ($sev === 'critical') $sev_class = 'mdf-pill-critical';
                                    elseif ($sev === 'high') $sev_class = 'mdf-pill-high';
                                    elseif ($sev === 'medium') $sev_class = 'mdf-pill-warning';
                                    ?>
                                    <span class="mdf-pill-badge <?php echo esc_attr($sev_class); ?>"><?php echo esc_html(strtoupper($sev)); ?></span>
                                </td>
                                <td style="text-align: center;">
                                    <label class="mdf-switch-toggle" style="margin: 0 auto; display: inline-block;">
                                        <input type="checkbox" <?php checked($rule['enabled']); ?> onchange="wafFwToggleRule(<?php echo $rule['id']; ?>, this.checked)">
                                        <span class="mdf-switch-slider"></span>
                                    </label>
                                </td>
                                <td style="text-align: right;">
                                    <div style="display: inline-flex; gap: 6px;">
                                        <button type="button" class="mdf-btn-customize" style="padding: 5px 10px; font-size: 11px;" onclick="wafFwEditRule(<?php echo $rule['id']; ?>)">Edit</button>
                                        <button type="button" class="mdf-btn-customize" style="padding: 5px 10px; font-size: 11px; color: #DC2626 !important; border-color: #FEE2E2 !important;" onclick="wafFwDeleteRule(<?php echo $rule['id']; ?>)">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>

    <!-- 5. Modal Dialog -->
    <div id="wafFwRuleModal" class="waf-fw-modal" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(15,44,38,0.5); z-index:99999; align-items:center; justify-content:center; padding:20px;">
        <div class="waf-fw-modal-content" style="background:#FFFFFF; border-radius:14px; max-width:520px; width:100%; padding:26px; box-shadow:0 12px 36px rgba(0,0,0,0.18); position:relative; margin:auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
                <h3 id="wafFwModalTitle" style="margin:0; font-size:17px; font-weight:700; color:#111F1C;">Add New Rule</h3>
                <button type="button" onclick="wafFwCloseRuleModal()" style="background:transparent; border:none; font-size:20px; color:#7A8D87; cursor:pointer;">&times;</button>
            </div>
            <form id="wafFwRuleForm">
                <input type="hidden" id="wafFwRuleId">
                <div style="margin-bottom:14px;">
                    <label style="display:block; font-size:11.5px; font-weight:600; color:#637671; margin-bottom:6px;">Rule Name</label>
                    <input type="text" id="wafFwRuleName" style="width:100%; border:1px solid #D6DFDB; border-radius:8px; padding:8px 12px; font-size:12px; font-family:inherit; outline:none;" required placeholder="e.g. SQL Injection - Union Select">
                </div>
                <div style="margin-bottom:14px;">
                    <label style="display:block; font-size:11.5px; font-weight:600; color:#637671; margin-bottom:6px;">Regex Pattern</label>
                    <input type="text" id="wafFwRulePattern" style="width:100%; border:1px solid #D6DFDB; border-radius:8px; padding:8px 12px; font-size:12px; font-family:'JetBrains Mono', monospace; outline:none;" required placeholder="/(union.*select)/i">
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
                    <div>
                        <label style="display:block; font-size:11.5px; font-weight:600; color:#637671; margin-bottom:6px;">Action</label>
                        <select id="wafFwRuleAction" style="width:100%; border:1px solid #D6DFDB; border-radius:8px; padding:8px 12px; font-size:12px; font-family:inherit; outline:none;">
                            <option value="block">Block (HTTP 403)</option>
                            <option value="alert">Alert (Log only)</option>
                        </select>
                    </div>
                    <div>
                        <label style="display:block; font-size:11.5px; font-weight:600; color:#637671; margin-bottom:6px;">Severity</label>
                        <select id="wafFwRuleSeverity" style="width:100%; border:1px solid #D6DFDB; border-radius:8px; padding:8px 12px; font-size:12px; font-family:inherit; outline:none;">
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                    </div>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:10px;">
                    <button type="button" class="mdf-btn-customize" onclick="wafFwCloseRuleModal()">Cancel</button>
                    <button type="submit" class="mdf-btn-scan">Save Rule</button>
                </div>
            </form>
        </div>
    </div>

</div>

<script>
function wafFwShowRuleModal() {
    jQuery('#wafFwModalTitle').text('Add New Rule');
    jQuery('#wafFwRuleForm')[0].reset();
    jQuery('#wafFwRuleId').val('');
    jQuery('#wafFwRuleModal').css('display', 'flex');
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
                jQuery('#wafFwRuleModal').css('display', 'flex');
            }
        }
    });
}
var wafNonce = (typeof waf_fw_ajax !== 'undefined' && waf_fw_ajax.nonce) ? waf_fw_ajax.nonce : '<?php echo wp_create_nonce("waf_fw_ajax"); ?>';

jQuery('#wafFwRuleForm').on('submit', function(e) {
    e.preventDefault();
    var id = jQuery('#wafFwRuleId').val();
    var data = {
        name: jQuery('#wafFwRuleName').val(),
        pattern: jQuery('#wafFwRulePattern').val(),
        action: jQuery('#wafFwRuleAction').val(),
        severity: jQuery('#wafFwRuleSeverity').val(),
        nonce: wafNonce
    };
    var url = ajaxurl + '?action=' + (id ? 'waf_fw_update_rule&id=' + id : 'waf_fw_save_rule');
    jQuery.ajax({
        url: url,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function(r) {
            if (r.success) {
                location.reload();
            } else {
                alert('Error: ' + ((r.data && r.data.message) ? r.data.message : 'Could not save rule'));
            }
        },
        error: function() {
            alert('Request failed.');
        }
    });
});
function wafFwDeleteRule(id) {
    if (confirm('Delete this rule?')) {
        jQuery.post(ajaxurl + '?action=waf_fw_delete_rule&id=' + id, {nonce: wafNonce}, function(r) {
            if (r.success) {
                location.reload();
            } else {
                alert('Error: ' + ((r.data && r.data.message) ? r.data.message : 'Could not delete rule'));
            }
        });
    }
}
function wafFwToggleRule(id, enabled) {
    jQuery.ajax({
        url: ajaxurl + '?action=waf_fw_toggle_rule&id=' + id,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({enabled: enabled, nonce: wafNonce})
    });
}
jQuery('#wafFwRuleModal').on('click', function(e) { if (e.target.id === 'wafFwRuleModal') wafFwCloseRuleModal(); });
</script>
