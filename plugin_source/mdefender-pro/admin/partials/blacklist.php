<?php
/**
 * MDefender-Pro IP & Country Blacklist
 * Clean, modern dashboard theme matching the master UI specification.
 * Supports Bi-Directional Real-Time Synchronized IP & Country Blocking.
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

$raw_blocked_countries = (string) get_option('waf_fw_blocked_countries', '');
$blocked_countries = array_values(array_filter(array_map('trim', explode(',', strtoupper($raw_blocked_countries)))));
$total_blocked_countries = count($blocked_countries);

// Country code to name mapping
$country_names = [
    'RO' => 'Romania',
    'CN' => 'China',
    'RU' => 'Russia',
    'KP' => 'North Korea',
    'IR' => 'Iran',
    'US' => 'United States',
    'GB' => 'United Kingdom',
    'DE' => 'Germany',
    'FR' => 'France',
    'IN' => 'India',
    'BD' => 'Bangladesh',
    'PK' => 'Pakistan',
    'VN' => 'Vietnam',
    'BR' => 'Brazil',
    'UA' => 'Ukraine',
    'NL' => 'Netherlands',
    'CA' => 'Canada',
    'AU' => 'Australia',
];
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
            <span class="mdf-crumb-current">Access Control &amp; Blacklist</span>
        </div>
        <div class="mdf-top-right">
            <div class="mdf-sys-status">
                <span class="mdf-dot-green"></span>
                <span>Active Cloud Sync</span>
            </div>
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
            <h1 class="mdf-hero-title">Perimeter <span class="mdf-orange-text">Blacklist &amp; Geo-Fencing.</span></h1>
            <p class="mdf-hero-subtitle">Enforce instantaneous IP mitigations and country-level geo-fencing synced in real-time with your Cloud User Dashboard.</p>
        </div>
        <div class="mdf-hero-actions" style="display:flex; gap:10px;">
            <button type="button" class="mdf-btn-scan" id="btnTopAction" onclick="wafFwHandleTopAction()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                <span id="txtTopAction">Block IP Address</span>
            </button>
        </div>
    </div>

    <!-- 3. Navigation Tabs -->
    <div style="display: flex; gap: 8px; margin-bottom: 22px; border-bottom: 1px solid #E2E8F0; padding-bottom: 12px;">
        <button type="button" id="tabBtnIp" class="mdf-tab-switch active-tab" onclick="wafFwSwitchTab('ip')" style="display: flex; align-items: center; gap: 8px; padding: 9px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: #0F2C26; color: #FFFFFF; transition: all 0.2s ease;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
            <span>IP Blacklist (<span id="countTabIp"><?php echo number_format($total_blacklisted); ?></span>)</span>
        </button>
        <button type="button" id="tabBtnCountry" class="mdf-tab-switch" onclick="wafFwSwitchTab('country')" style="display: flex; align-items: center; gap: 8px; padding: 9px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid #E2E8F0; background: #FFFFFF; color: #64748B; transition: all 0.2s ease;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg>
            <span>Country Blacklist &amp; Geo-Fencing (<span id="countTabCountry"><?php echo number_format($total_blocked_countries); ?></span>)</span>
        </button>
    </div>

    <!-- ==================== TAB 1: IP BLACKLIST ==================== -->
    <div id="sectionIpBlacklist">
        <!-- Telemetry Bento Cards -->
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
                    <span class="mdf-card-metric-num" id="metricTotalIps"><?php echo number_format($total_blacklisted); ?></span>
                </div>
                <span class="mdf-card-metric-sub">Blocked from accessing web application</span>
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

        <!-- Blacklist Table Card -->
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
                    <tbody id="tbodyBlacklist">
                        <?php if (empty($blacklist)): ?>
                            <tr id="rowNoBlacklist">
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
    </div>

    <!-- ==================== TAB 2: COUNTRY BLACKLIST & GEO-FENCING ==================== -->
    <div id="sectionCountryBlacklist" style="display:none;">
        <!-- Telemetry Bento Cards -->
        <div class="mdf-bento-grid-4" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 24px;">
            <div class="mdf-bento-card">
                <div class="mdf-card-top">
                    <div class="mdf-card-icon-circle mdf-circle-mint">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/>
                        </svg>
                    </div>
                    <span class="mdf-badge-trend mdf-trend-green">SOVEREIGN</span>
                </div>
                <span class="mdf-card-metric-label">Blocked Countries</span>
                <div class="mdf-card-metric-row">
                    <span class="mdf-card-metric-num" id="metricTotalCountries"><?php echo number_format($total_blocked_countries); ?></span>
                </div>
                <span class="mdf-card-metric-sub">Foreign territories blocked at edge</span>
            </div>

            <div class="mdf-bento-card">
                <div class="mdf-card-top">
                    <div class="mdf-card-icon-circle mdf-circle-mint">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                    </div>
                    <span class="mdf-badge-trend mdf-trend-green">STEALTH DROP</span>
                </div>
                <span class="mdf-card-metric-label">Enforcement Page</span>
                <div class="mdf-card-metric-row">
                    <span class="mdf-card-metric-num" style="font-size:18px; color:#10201E;">502 Offline</span>
                </div>
                <span class="mdf-card-metric-sub">ERR_NAME_NOT_RESOLVED (0% Branding)</span>
            </div>

            <div class="mdf-bento-card">
                <div class="mdf-card-top">
                    <div class="mdf-card-icon-circle mdf-circle-mint">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                        </svg>
                    </div>
                    <span class="mdf-badge-trend mdf-trend-green">SYNCHRONIZED</span>
                </div>
                <span class="mdf-card-metric-label">Cloud Synchronization</span>
                <div class="mdf-card-metric-row">
                    <span class="mdf-card-metric-num" style="font-size:18px; color:#059669;">Real-Time</span>
                </div>
                <span class="mdf-card-metric-sub">Synced across User Dashboard via API Key</span>
            </div>
        </div>

        <!-- Quick Block Presets Bar -->
        <div class="mdf-white-card" style="padding: 16px 20px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: #1E293B;">Quick Threat Origin Blocks:</span>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <?php
                $presets = [
                    'RO' => 'Romania',
                    'CN' => 'China',
                    'RU' => 'Russia',
                    'KP' => 'North Korea',
                    'IR' => 'Iran',
                ];
                foreach ($presets as $pCode => $pName):
                    $isBlocked = in_array($pCode, $blocked_countries, true);
                ?>
                    <button type="button" onclick="wafFwToggleCountryPreset('<?php echo esc_js($pCode); ?>', '<?php echo esc_js($pName); ?>')"
                        style="padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s ease; border: 1px solid <?php echo $isBlocked ? '#DC2626' : '#CBD5E1'; ?>; background: <?php echo $isBlocked ? '#FEF2F2' : '#FFFFFF'; ?>; color: <?php echo $isBlocked ? '#DC2626' : '#334155'; ?>;">
                        <?php echo $isBlocked ? '&times; Unblock ' . $pCode : '+ Block ' . $pCode . ' (' . $pName . ')'; ?>
                    </button>
                <?php endforeach; ?>
            </div>
        </div>

        <!-- Blocked Countries Table Card -->
        <div class="mdf-white-card mdf-table-container-card">
            <div class="mdf-card-header-flex">
                <div>
                    <h3 class="mdf-chart-heading">Geo-Fenced &amp; Blocked Countries</h3>
                    <span class="mdf-chart-sub">Visitors from blocked countries receive authentic offline error screen</span>
                </div>
                <div class="mdf-blacklist-toolbar">
                    <input type="search" id="wafCountrySearch" placeholder="Search country code or name...">
                </div>
            </div>

            <div class="mdf-table-responsive-box">
                <table class="mdf-events-data-table">
                    <thead>
                        <tr>
                            <th style="width: 140px;">COUNTRY CODE</th>
                            <th>COUNTRY NAME</th>
                            <th style="width: 220px;">ENFORCEMENT ACTION</th>
                            <th style="width: 180px;">STATUS</th>
                            <th style="width: 120px; text-align: right;">ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody id="tbodyCountryBlacklist">
                        <?php if (empty($blocked_countries)): ?>
                            <tr id="rowNoCountries">
                                <td colspan="5" style="text-align:center; padding: 40px; color: #7A8D87;">
                                    No countries currently blocked. All global traffic is accepted.
                                </td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($blocked_countries as $cCode):
                                $cName = $country_names[$cCode] ?? $cCode;
                            ?>
                                <tr data-country-record="1" data-code="<?php echo esc_attr($cCode); ?>" data-name="<?php echo esc_attr(strtolower($cName)); ?>">
                                    <td>
                                        <div class="mdf-cell-origin">
                                            <span style="display:inline-flex; align-items:center; justify-content:center; width:28px; height:20px; background:#F1F5F9; border-radius:4px; font-weight:700; font-size:11px; color:#0F2C26; border:1px solid #CBD5E1;">
                                                <?php echo esc_html($cCode); ?>
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <strong style="color: #111F1C; font-size: 13px;"><?php echo esc_html($cName); ?></strong>
                                    </td>
                                    <td>
                                        <span class="mdf-pill-badge mdf-pill-critical" style="font-size:11px;">ERR_NAME_NOT_RESOLVED (502)</span>
                                    </td>
                                    <td>
                                        <span style="display:inline-flex; align-items:center; gap:6px; color:#059669; font-weight:600; font-size:12px;">
                                            <span style="width:7px; height:7px; border-radius:50%; background:#059669;"></span> Active Cloud Rule
                                        </span>
                                    </td>
                                    <td style="text-align: right;">
                                        <button type="button" class="mdf-btn-customize" style="padding: 5px 12px; font-size: 11px; color: #EF4444 !important; border-color:#FECACA;" onclick="wafFwUnblockCountry('<?php echo esc_js($cCode); ?>', '<?php echo esc_js($cName); ?>')">
                                            Unblock
                                        </button>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- 4. Modal Dialog: Block IP -->
    <div id="wafFwBlacklistModal" class="waf-fw-modal" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(15,44,38,0.5); z-index:99999; align-items:center; justify-content:center; padding:20px;">
        <div class="waf-fw-modal-content" style="background:#FFFFFF; border-radius:14px; max-width:480px; width:100%; padding:26px; box-shadow:0 12px 36px rgba(0,0,0,0.18); position:relative; margin:auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
                <h3 style="font-size:16px; font-weight:700; color:#111F1C; margin:0;">Block IP Address</h3>
                <button type="button" onclick="jQuery('#wafFwBlacklistModal').hide()" style="background:transparent; border:none; font-size:20px; color:#7A8D87; cursor:pointer;">&times;</button>
            </div>
            <form id="wafFwBlacklistForm">
                <div style="margin-bottom:14px;">
                    <label style="display:block; font-size:12px; font-weight:600; color:#334155; margin-bottom:6px;">IP Address *</label>
                    <input type="text" id="wafFwBlockIP" required placeholder="e.g. 146.70.246.100" style="width:100%; padding:9px 12px; border:1px solid #CBD5E1; border-radius:8px; font-size:13px; box-sizing:border-box;">
                </div>
                <div style="margin-bottom:14px;">
                    <label style="display:block; font-size:12px; font-weight:600; color:#334155; margin-bottom:6px;">Reason</label>
                    <input type="text" id="wafFwBlockReason" placeholder="e.g. Malicious probing / scanner" style="width:100%; padding:9px 12px; border:1px solid #CBD5E1; border-radius:8px; font-size:13px; box-sizing:border-box;">
                </div>
                <div style="margin-bottom:20px;">
                    <label style="display:block; font-size:12px; font-weight:600; color:#334155; margin-bottom:6px;">Block Duration</label>
                    <select id="wafFwBlockType" style="width:100%; padding:9px 12px; border:1px solid #CBD5E1; border-radius:8px; font-size:13px; box-sizing:border-box;">
                        <option value="permanent">Permanent (Until unblocked)</option>
                        <option value="temporary">Temporary (24 Hours)</option>
                    </select>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:10px;">
                    <button type="button" class="mdf-btn-customize" onclick="jQuery('#wafFwBlacklistModal').hide()">Cancel</button>
                    <button type="submit" class="mdf-btn-scan" style="background:#0F2C26; border-color:#0F2C26;">Block IP</button>
                </div>
            </form>
        </div>
    </div>

    <!-- 5. Modal Dialog: Block Country -->
    <div id="wafFwCountryModal" class="waf-fw-modal" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(15,44,38,0.5); z-index:99999; align-items:center; justify-content:center; padding:20px;">
        <div class="waf-fw-modal-content" style="background:#FFFFFF; border-radius:14px; max-width:480px; width:100%; padding:26px; box-shadow:0 12px 36px rgba(0,0,0,0.18); position:relative; margin:auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
                <h3 style="font-size:16px; font-weight:700; color:#111F1C; margin:0;">Block Foreign Territory / Country</h3>
                <button type="button" onclick="jQuery('#wafFwCountryModal').hide()" style="background:transparent; border:none; font-size:20px; color:#7A8D87; cursor:pointer;">&times;</button>
            </div>
            <form id="wafFwCountryForm">
                <div style="margin-bottom:14px;">
                    <label style="display:block; font-size:12px; font-weight:600; color:#334155; margin-bottom:6px;">Select Country *</label>
                    <select id="wafFwSelectCountry" required style="width:100%; padding:9px 12px; border:1px solid #CBD5E1; border-radius:8px; font-size:13px; box-sizing:border-box;">
                        <option value="">-- Choose Country --</option>
                        <option value="RO">RO - Romania</option>
                        <option value="CN">CN - China</option>
                        <option value="RU">RU - Russia</option>
                        <option value="KP">KP - North Korea</option>
                        <option value="IR">IR - Iran</option>
                        <option value="VN">VN - Vietnam</option>
                        <option value="BR">BR - Brazil</option>
                        <option value="IN">IN - India</option>
                        <option value="PK">PK - Pakistan</option>
                        <option value="UA">UA - Ukraine</option>
                        <option value="FR">FR - France</option>
                        <option value="DE">DE - Germany</option>
                        <option value="NL">NL - Netherlands</option>
                        <option value="GB">GB - United Kingdom</option>
                        <option value="US">US - United States</option>
                    </select>
                </div>
                <div style="margin-bottom:14px;">
                    <label style="display:block; font-size:12px; font-weight:600; color:#334155; margin-bottom:6px;">Or Enter 2-Letter ISO Code</label>
                    <input type="text" id="wafFwCustomCountryCode" maxlength="2" placeholder="e.g. RO" style="width:100%; padding:9px 12px; border:1px solid #CBD5E1; border-radius:8px; font-size:13px; text-transform:uppercase; box-sizing:border-box;">
                </div>
                <div style="margin-bottom:20px;">
                    <label style="display:block; font-size:12px; font-weight:600; color:#334155; margin-bottom:6px;">Policy Reason</label>
                    <input type="text" id="wafFwCountryReason" placeholder="Geo-Restriction Policy" style="width:100%; padding:9px 12px; border:1px solid #CBD5E1; border-radius:8px; font-size:13px; box-sizing:border-box;">
                </div>
                <div style="display:flex; justify-content:flex-end; gap:10px;">
                    <button type="button" class="mdf-btn-customize" onclick="jQuery('#wafFwCountryModal').hide()">Cancel</button>
                    <button type="submit" class="mdf-btn-scan" style="background:#0F2C26; border-color:#0F2C26;">Block Country</button>
                </div>
            </form>
        </div>
    </div>

</div>

<script>
var wafNonce = (typeof waf_fw_ajax !== 'undefined' && waf_fw_ajax.nonce) ? waf_fw_ajax.nonce : '<?php echo wp_create_nonce("waf_fw_ajax"); ?>';
var activeBlacklistTab = 'ip';

function wafFwSwitchTab(tab) {
    activeBlacklistTab = tab;
    if (tab === 'country') {
        jQuery('#tabBtnCountry').css({ background: '#0F2C26', color: '#FFFFFF', border: 'none' });
        jQuery('#tabBtnIp').css({ background: '#FFFFFF', color: '#64748B', border: '1px solid #E2E8F0' });
        jQuery('#sectionCountryBlacklist').show();
        jQuery('#sectionIpBlacklist').hide();
        jQuery('#txtTopAction').text('Block Country');
    } else {
        jQuery('#tabBtnIp').css({ background: '#0F2C26', color: '#FFFFFF', border: 'none' });
        jQuery('#tabBtnCountry').css({ background: '#FFFFFF', color: '#64748B', border: '1px solid #E2E8F0' });
        jQuery('#sectionIpBlacklist').show();
        jQuery('#sectionCountryBlacklist').hide();
        jQuery('#txtTopAction').text('Block IP Address');
    }
}

function wafFwHandleTopAction() {
    if (activeBlacklistTab === 'country') {
        jQuery('#wafFwCountryForm')[0].reset();
        jQuery('#wafFwCountryModal').css('display', 'flex');
    } else {
        jQuery('#wafFwBlacklistForm')[0].reset();
        jQuery('#wafFwBlacklistModal').css('display', 'flex');
    }
}

// IP Blacklist Form Submit
jQuery('#wafFwBlacklistForm').on('submit', function(e) {
    e.preventDefault();
    var ipVal = jQuery('#wafFwBlockIP').val().trim();
    if (!ipVal) return;
    jQuery.ajax({
        url: ajaxurl + '?action=waf_fw_add_blacklist',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            ip: ipVal,
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

// IP Unblock Action
function wafFwUnblock(ip) {
    if (confirm('Unblock IP ' + ip + ' and sync with User Dashboard?')) {
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

// Country Blacklist Form Submit
jQuery('#wafFwCountryForm').on('submit', function(e) {
    e.preventDefault();
    var code = (jQuery('#wafFwCustomCountryCode').val() || jQuery('#wafFwSelectCountry').val() || '').trim().toUpperCase();
    var name = jQuery('#wafFwSelectCountry option:selected').text() || code;
    if (!code || code.length !== 2) {
        alert('Please enter or select a valid 2-letter country code (e.g. RO, CN)');
        return;
    }
    jQuery.post(ajaxurl + '?action=waf_fw_add_country_block', {
        country_code: code,
        country_name: name,
        nonce: wafNonce
    }, function(r) {
        if (r.success) {
            location.reload();
        } else {
            alert('Error: ' + ((r.data && r.data.message) ? r.data.message : 'Failed to block country'));
        }
    });
});

// Country Unblock Action
function wafFwUnblockCountry(code, name) {
    if (confirm('Unblock country ' + (name || code) + ' and restore traffic across fleet?')) {
        jQuery.post(ajaxurl + '?action=waf_fw_remove_country_block', {
            country_code: code,
            nonce: wafNonce
        }, function(r) {
            if (r.success) {
                location.reload();
            } else {
                alert('Error: ' + ((r.data && r.data.message) ? r.data.message : 'Failed to unblock country'));
            }
        });
    }
}

// Quick Preset Toggle
function wafFwToggleCountryPreset(code, name) {
    var isBlocked = <?php echo json_encode($blocked_countries); ?>.indexOf(code) !== -1;
    if (isBlocked) {
        wafFwUnblockCountry(code, name);
    } else {
        jQuery.post(ajaxurl + '?action=waf_fw_add_country_block', {
            country_code: code,
            country_name: name,
            nonce: wafNonce
        }, function(r) {
            if (r.success) {
                location.reload();
            } else {
                alert('Error: ' + ((r.data && r.data.message) ? r.data.message : 'Failed to block country'));
            }
        });
    }
}

jQuery('#wafFwBlacklistModal').on('click', function(e) { if (e.target.id === 'wafFwBlacklistModal') jQuery('#wafFwBlacklistModal').hide(); });
jQuery('#wafFwCountryModal').on('click', function(e) { if (e.target.id === 'wafFwCountryModal') jQuery('#wafFwCountryModal').hide(); });

jQuery(function($) {
    // Search & Filter for IP Blacklist
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

    // Search for Country Blacklist
    $('#wafCountrySearch').on('input', function() {
        var q = $(this).val().trim().toLowerCase();
        $('tr[data-country-record]').each(function() {
            var row = $(this);
            var code = (row.data('code') || '').toLowerCase();
            var name = (row.data('name') || '').toLowerCase();
            row.toggle(!q || code.indexOf(q) !== -1 || name.indexOf(q) !== -1);
        });
    });

    // CSV Export
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
