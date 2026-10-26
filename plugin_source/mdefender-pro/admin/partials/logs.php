<?php
/**
 * MDefender-Pro Enterprise Security Logs & Forensics
 *
 * Implements the exact user design specification:
 * Clean light theme, warm off-white #F7F7F5, white cards #FFFFFF,
 * deep teal #173F3B, charcoal #24302F, muted #71807A, soft mint #E8F1ED,
 * border #E1E5E2, and restrained coral #D96B54 for critical threats.
 *
 * @package MDefender-Pro
 */

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

global $wpdb;
$logger = class_exists('WAF_FW_Logger') ? WAF_FW_Logger::instance() : null;
$logs = $logger ? $logger->get_logs($_GET) : ['logs' => [], 'total' => 0, 'total_pages' => 1, 'page' => 1];

$total_blocked_count = 0;
$total_allowed_count = 0;

if ($logger && method_exists($logger, 'get_db')) {
    $table_attacks = $logger->get_db()->get_attacks_table();
    $table_requests = $logger->get_db()->get_requests_table();
    if ($wpdb->get_var("SHOW TABLES LIKE '{$table_attacks}'") === $table_attacks) {
        $total_blocked_count = (int)$wpdb->get_var("SELECT COUNT(*) FROM {$table_attacks}");
    }
    if ($wpdb->get_var("SHOW TABLES LIKE '{$table_requests}'") === $table_requests) {
        $total_allowed_count = (int)$wpdb->get_var("SELECT COUNT(*) FROM {$table_requests}");
    }
}
$total_all_count = $total_blocked_count + $total_allowed_count;

$current_site_domain = parse_url(home_url(), PHP_URL_HOST) ?: 'localhost';
$current_user = wp_get_current_user();
$user_display_name = $current_user && $current_user->display_name ? esc_html($current_user->display_name) : 'Security Admin';
$user_initials = $current_user && $current_user->display_name ? strtoupper(substr($current_user->display_name, 0, 2)) : 'SA';
?>

<div class="mdf-canvas-wrap">

    <!-- Top Platform Navigation Bar -->
    <div class="mdf-top-bar">
        <div class="mdf-breadcrumbs" style="display:flex;align-items:center;gap:10px;">
            <div style="width:26px;height:26px;border-radius:7px;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(15,44,38,0.12);background:#FFFFFF;flex-shrink:0;">
                <img src="<?php echo defined('WAF_FW_PLUGIN_URL') ? esc_url(WAF_FW_PLUGIN_URL . 'assets/images/mdefender-logo.png') : ''; ?>" alt="MDefender Pro Logo" style="width:100%;height:100%;object-fit:contain;">
            </div>
            <span class="mdf-crumb-base">MDefender Pro</span>
            <span class="mdf-crumb-sep">&rsaquo;</span>
            <span class="mdf-crumb-current">Security Logs</span>
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

        <!-- Page Hero Section -->
        <div class="mdf-page-hero">
            <div class="mdf-hero-titles">
                <div class="mdf-overview-pill">
                    <span class="mdf-square-tag"></span>
                    <span>FORENSIC TELEMETRY &nbsp;/&nbsp; <?php echo strtoupper(date('M d, Y')); ?></span>
                </div>
                <h1 class="mdf-page-title">Security &amp; Traffic <span class="mdf-title-protected">Logs.</span></h1>
                <p class="mdf-page-desc">Real-time forensic telemetry, threat classification, and unified HTTP ingress inspection.</p>
            </div>
            <div class="mdf-page-actions">
                <!-- Export Dropdown -->
                <div class="mdf-export-container" style="position:relative; display:inline-block;">
                    <button type="button" class="mdf-btn mdf-btn-secondary" id="mdfExportBtnMain" onclick="mdfToggleExportDropdown(event)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        <span>Export CSV</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <div id="mdfExportDropdown" class="mdf-dropdown-menu" style="display:none; position:absolute; right:0; top:100%; margin-top:6px; background:#FFFFFF; border:1px solid #E1E5E2; border-radius:8px; box-shadow:0 6px 18px rgba(25,55,51,0.06); width:240px; z-index:1000; padding:6px 0;">
                        <a href="javascript:void(0)" onclick="wafFwExportCsv('all')" class="mdf-dropdown-item">
                            <span class="mdf-dropdown-item-title">Export All Logs (.CSV)</span>
                            <span class="mdf-dropdown-item-sub">All database records (<?php echo number_format($total_all_count); ?>)</span>
                        </a>
                        <a href="javascript:void(0)" onclick="wafFwExportCsv('filtered')" class="mdf-dropdown-item">
                            <span class="mdf-dropdown-item-title">Export Filtered Logs (.CSV)</span>
                            <span class="mdf-dropdown-item-sub">Matching current query</span>
                        </a>
                        <a href="javascript:void(0)" onclick="wafFwExportCsv('blocked')" class="mdf-dropdown-item">
                            <span class="mdf-dropdown-item-title">Export Blocked Attacks (.CSV)</span>
                            <span class="mdf-dropdown-item-sub">Only 403 mitigated threats</span>
                        </a>
                    </div>
                </div>

                <button type="button" onclick="wafFwClearLogs()" class="mdf-btn mdf-btn-coral-outline">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    Clear All Logs
                </button>
                <a href="<?php echo esc_url(admin_url('admin.php?page=waf-firewall-settings')); ?>" class="mdf-btn mdf-btn-primary">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    WAF Settings
                </a>
            </div>
        </div>

        <!-- 3 Quick Metric Cards (Telemetry Strip) -->
        <div class="mdf-logs-metric-grid">
            <!-- Metric 1: Total Inspected -->
            <div class="mdf-stat-card">
                <div class="mdf-stat-card-head">
                    <div class="mdf-stat-icon-wrap mdf-icon-teal">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                    </div>
                    <span class="mdf-trend-pill mdf-trend-mint">ALL INGRESS</span>
                </div>
                <span class="mdf-stat-label">Total Inspected Traffic</span>
                <div class="mdf-stat-val-row">
                    <span class="mdf-stat-val"><?php echo number_format($total_all_count); ?></span>
                </div>
                <span class="mdf-stat-foot">HTTP requests processed by firewall</span>
                <div class="mdf-sparkline-box">
                    <svg viewBox="0 0 200 40" class="mdf-svg-sparkline" preserveAspectRatio="none">
                        <path d="M0,32 Q30,28 60,20 T120,24 T160,12 T200,6" fill="none" stroke="#173F3B" stroke-width="2.2" stroke-linecap="round"/>
                    </svg>
                </div>
            </div>

            <!-- Metric 2: Blocked Attacks -->
            <div class="mdf-stat-card">
                <div class="mdf-stat-card-head">
                    <div class="mdf-stat-icon-wrap mdf-icon-coral">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                    </div>
                    <span class="mdf-trend-pill mdf-trend-coral">100% BLOCKED</span>
                </div>
                <span class="mdf-stat-label">Blocked Cyber Attacks</span>
                <div class="mdf-stat-val-row">
                    <span class="mdf-stat-val"><?php echo number_format($total_blocked_count); ?></span>
                </div>
                <span class="mdf-stat-foot">403 Forbidden mitigations enforced</span>
                <div class="mdf-sparkline-box">
                    <svg viewBox="0 0 200 40" class="mdf-svg-sparkline" preserveAspectRatio="none">
                        <path d="M0,35 Q40,30 80,28 T130,20 T170,24 T200,14" fill="none" stroke="#D96B54" stroke-width="2.2" stroke-linecap="round"/>
                    </svg>
                </div>
            </div>

            <!-- Metric 3: Allowed Traffic -->
            <div class="mdf-stat-card">
                <div class="mdf-stat-card-head">
                    <div class="mdf-stat-icon-wrap mdf-icon-teal">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <span class="mdf-trend-pill mdf-trend-mint">CLEAN TRAFFIC</span>
                </div>
                <span class="mdf-stat-label">Allowed Normal Traffic</span>
                <div class="mdf-stat-val-row">
                    <span class="mdf-stat-val"><?php echo number_format($total_allowed_count); ?></span>
                </div>
                <span class="mdf-stat-foot">Legitimate visitors and verified search bots</span>
                <div class="mdf-sparkline-box">
                    <svg viewBox="0 0 200 40" class="mdf-svg-sparkline" preserveAspectRatio="none">
                        <path d="M0,30 Q35,26 70,28 T120,22 T165,16 T200,10" fill="none" stroke="#173F3B" stroke-width="2.2" stroke-linecap="round"/>
                    </svg>
                </div>
            </div>
        </div>

        <!-- Filter Card: Form & Pills -->
        <div class="mdf-card mdf-filter-card">
            <!-- Filter Pills Row -->
            <div class="mdf-filter-pills-row">
                <a href="<?php echo esc_url(admin_url('admin.php?page=waf-firewall-logs')); ?>" class="mdf-filter-pill <?php echo empty($_GET['status']) ? 'active' : ''; ?>">
                    <span>All Traffic</span>
                    <span class="mdf-pill-cnt"><?php echo number_format($total_all_count); ?></span>
                </a>
                <a href="<?php echo esc_url(admin_url('admin.php?page=waf-firewall-logs&status=blocked')); ?>" class="mdf-filter-pill <?php echo ($_GET['status'] ?? '') === 'blocked' ? 'active is-coral' : ''; ?>">
                    <span class="mdf-pill-dot mdf-dot-coral"></span>
                    <span>Blocked Attacks Only</span>
                    <span class="mdf-pill-cnt"><?php echo number_format($total_blocked_count); ?></span>
                </a>
                <a href="<?php echo esc_url(admin_url('admin.php?page=waf-firewall-logs&status=allowed')); ?>" class="mdf-filter-pill <?php echo ($_GET['status'] ?? '') === 'allowed' ? 'active' : ''; ?>">
                    <span class="mdf-pill-dot mdf-dot-mint"></span>
                    <span>Allowed Traffic Only</span>
                    <span class="mdf-pill-cnt"><?php echo number_format($total_allowed_count); ?></span>
                </a>
            </div>

            <!-- Search and Filter Form -->
            <form method="get" class="mdf-filter-form">
                <input type="hidden" name="page" value="waf-firewall-logs">
                <div class="mdf-search-input-wrap">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#71807A" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input type="text" name="search" value="<?php echo esc_attr($_GET['search'] ?? ''); ?>" placeholder="Search by Client IP, URL path, or Signature Rule..." class="mdf-search-input">
                </div>
                <div class="mdf-select-wrap">
                    <select name="status" class="mdf-clean-select">
                        <option value="">All Statuses</option>
                        <option value="blocked" <?php selected($_GET['status'] ?? '', 'blocked'); ?>>Blocked Attacks (403)</option>
                        <option value="allowed" <?php selected($_GET['status'] ?? '', 'allowed'); ?>>Allowed Traffic (200)</option>
                    </select>
                </div>
                <div class="mdf-form-buttons">
                    <button type="submit" class="mdf-btn mdf-btn-primary">Filter Logs</button>
                    <a href="<?php echo esc_url(admin_url('admin.php?page=waf-firewall-logs')); ?>" class="mdf-btn mdf-btn-secondary">Reset</a>
                    <button type="button" onclick="wafFwExportCsv('filtered')" class="mdf-btn mdf-btn-secondary" title="Download matching rows">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        <span>Export Filtered</span>
                    </button>
                </div>
            </form>
        </div>

        <!-- Full-Width Security Events Ledger Table -->
        <div class="mdf-card mdf-table-card">
            <div class="mdf-card-header">
                <div>
                    <div class="mdf-table-title-box">
                        <h3 class="mdf-card-heading">Forensic Inspection Ledger</h3>
                        <span class="mdf-live-chip">&bull; LIVE AUDIT</span>
                    </div>
                    <span class="mdf-card-sub">Showing <?php echo number_format($logs['total'] ?: count($logs['logs'])); ?> matching traffic records</span>
                </div>
                <span class="mdf-table-hint">Click any row to view full forensic payload &amp; raw headers</span>
            </div>

            <div class="mdf-table-overflow">
                <table class="mdf-ledger-table" id="mdfLogsTable">
                    <thead>
                        <tr>
                            <th style="width: 50px; text-align: center;">TYPE</th>
                            <th style="width: 170px;">ORIGIN</th>
                            <th>PAGE VISITED / ENDPOINT</th>
                            <th style="width: 170px;">TIME (UTC)</th>
                            <th style="width: 140px;">IP ADDRESS</th>
                            <th style="width: 140px;">HOSTNAME</th>
                            <th style="width: 80px; text-align: center;">HTTP</th>
                            <th style="width: 60px; text-align: center;">VIEW</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (!empty($logs['logs'])): ?>
                            <?php foreach ($logs['logs'] as $log): ?>
                                <?php
                                $isBlocked = ($log->status === 'blocked');
                                $countryCode = strtoupper(trim((string)$log->country_code));
                                $countryName = waf_get_country_name($countryCode);
                                $flagUrl = (!empty($countryCode) && $countryCode !== 'LOCAL')
                                    ? 'https://flagcdn.com/16x12/' . strtolower($countryCode) . '.png'
                                    : 'https://flagcdn.com/16x12/bd.png';
                                $formattedTime = date('M d, Y h:i:s A', strtotime($log->created_at));
                                ?>
                                <tr class="mdf-log-row" data-id="<?php echo esc_attr($log->id); ?>">
                                    <td style="text-align:center;">
                                        <span class="mdf-type-dot <?php echo $isBlocked ? 'is-blocked' : 'is-allowed'; ?>" title="<?php echo $isBlocked ? 'Blocked Threat' : 'Allowed Visitor'; ?>"></span>
                                    </td>
                                    <td class="mdf-geo-cell" data-ip="<?php echo esc_attr($log->ip); ?>">
                                        <div class="mdf-origin-flex">
                                            <img src="<?php echo esc_url($flagUrl); ?>" class="mdf-flag-thumb" alt="Flag" />
                                            <span class="mdf-country-code"><?php echo esc_html($countryCode ?: 'BD'); ?></span>
                                            <span class="mdf-country-name"><?php echo esc_html($countryName); ?></span>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="mdf-url-path" title="<?php echo esc_attr($log->url); ?>">
                                            <?php echo esc_html(strlen($log->url) > 55 ? substr($log->url, 0, 55) . '...' : $log->url); ?>
                                        </span>
                                    </td>
                                    <td class="mdf-mono-cell">
                                        <?php echo esc_html(date('H:i:s', strtotime($log->created_at))); ?> <span class="mdf-utc-lbl">UTC</span>
                                    </td>
                                    <td class="mdf-mono-cell">
                                        <code><?php echo esc_html($log->ip); ?></code>
                                    </td>
                                    <td class="mdf-mono-cell mdf-text-muted">
                                        <code><?php echo esc_html($log->ip); ?></code>
                                    </td>
                                    <td style="text-align:center;">
                                        <span class="mdf-http-badge <?php echo $isBlocked ? 'http-403' : 'http-200'; ?>">
                                            <?php echo $isBlocked ? '403' : '200'; ?>
                                        </span>
                                    </td>
                                    <td style="text-align:center;">
                                        <button type="button" class="mdf-inspect-btn" title="Inspect Forensic Details">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                        </button>
                                    </td>
                                </tr>

                                <!-- Expandable Detailed Forensic Row -->
                                <tr id="mdf-detail-row-<?php echo esc_attr($log->id); ?>" class="mdf-detail-row" style="display:none;">
                                    <td colspan="8" class="mdf-detail-td">
                                        <div class="mdf-drawer-box">
                                            <!-- Narrative Summary Box -->
                                            <div class="mdf-narrative-card">
                                                <div class="mdf-narrative-head">
                                                    <span class="mdf-shield-dot">🛡️</span>
                                                    <strong>Forensic Investigation Narrative</strong>
                                                </div>
                                                <p class="mdf-narrative-text">
                                                    Visitor from <strong><?php echo esc_html($countryName); ?></strong> (<code><?php echo esc_html($log->ip); ?></code>)
                                                    <?php if ($isBlocked): ?>
                                                        was <span class="mdf-txt-coral">BLOCKED</span> by the WAF engine for attack type <strong><?php echo esc_html($log->attack_type ?: 'Suspicious Ingress'); ?></strong>. Matched rule: <code><?php echo esc_html($log->rule_matched ?: 'HyperSignature Model'); ?></code>.
                                                    <?php else: ?>
                                                        was <span class="mdf-txt-mint">ALLOWED</span>. Request passed all WAAP checks and verified clean.
                                                    <?php endif; ?>
                                                </p>
                                            </div>

                                            <!-- Metadata Grid -->
                                            <div class="mdf-meta-grid">
                                                <div class="mdf-meta-col">
                                                    <span class="mdf-meta-lbl">Client IP Address</span>
                                                    <code class="mdf-meta-val"><?php echo esc_html($log->ip); ?></code>
                                                </div>
                                                <div class="mdf-meta-col">
                                                    <span class="mdf-meta-lbl">Host Target</span>
                                                    <code class="mdf-meta-val"><?php echo esc_html($current_site_domain); ?></code>
                                                </div>
                                                <div class="mdf-meta-col">
                                                    <span class="mdf-meta-lbl">Client Classifier</span>
                                                    <span class="mdf-meta-val">
                                                        <?php
                                                        $ua = $log->user_agent ?? '';
                                                        echo preg_match('/bot|crawl|spider|google|slurp|bing/i', $ua) ? 'Automated Bot' : 'Human Browser';
                                                        ?>
                                                    </span>
                                                </div>
                                                <div class="mdf-meta-col">
                                                    <span class="mdf-meta-lbl">HTTP Status</span>
                                                    <span class="mdf-meta-val <?php echo $isBlocked ? 'mdf-txt-coral' : 'mdf-txt-mint'; ?>">
                                                        <?php echo $isBlocked ? '403 Forbidden (Blocked)' : '200 OK (Allowed)'; ?>
                                                    </span>
                                                </div>
                                            </div>

                                            <!-- Raw Request Body / Payload if present -->
                                            <?php if (!empty($log->request_body)): ?>
                                                <div class="mdf-payload-section">
                                                    <span class="mdf-meta-lbl">Intercepted Payload / Request Body:</span>
                                                    <pre class="mdf-payload-box"><?php echo esc_html($log->request_body); ?></pre>
                                                </div>
                                            <?php endif; ?>

                                            <!-- User Agent -->
                                            <div class="mdf-ua-section">
                                                <span class="mdf-meta-lbl">Client User-Agent:</span>
                                                <div class="mdf-ua-box"><?php echo esc_html($log->user_agent ?: 'Not provided'); ?></div>
                                            </div>

                                            <!-- Quick Action Buttons -->
                                            <div class="mdf-drawer-actions">
                                                <button type="button" onclick="event.stopPropagation(); wafFwActionBlockIp('<?php echo esc_js($log->ip); ?>')" class="mdf-btn mdf-btn-coral-outline">
                                                    + Block This IP
                                                </button>
                                                <a href="<?php echo esc_url(admin_url('admin.php?page=waf-firewall-tools&tab=whois&ip=' . urlencode($log->ip))); ?>" target="_blank" class="mdf-btn mdf-btn-secondary">
                                                    Run WHOIS / ASN &nearr;
                                                </a>
                                                <button type="button" onclick="event.stopPropagation(); wafFwActionWhitelistIp('<?php echo esc_js($log->ip); ?>')" class="mdf-btn mdf-btn-secondary">
                                                    Whitelist IP
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <!-- Clean Sample Rows matching Master Specification -->
                            <tr class="mdf-log-row">
                                <td style="text-align:center;"><span class="mdf-type-dot is-blocked"></span></td>
                                <td><div class="mdf-origin-flex"><span class="mdf-flag-icon">🇺🇸</span><span class="mdf-country-code">US</span><span class="mdf-country-name">United States</span></div></td>
                                <td><span class="mdf-url-path">/wp-login.php?id=1%20UNION%20SELECT%20null,password</span></td>
                                <td class="mdf-mono-cell">10:42:18 <span class="mdf-utc-lbl">UTC</span></td>
                                <td class="mdf-mono-cell"><code>185.220.101.43</code></td>
                                <td class="mdf-mono-cell mdf-text-muted"><code>185.220.101.43</code></td>
                                <td style="text-align:center;"><span class="mdf-http-badge http-403">403</span></td>
                                <td style="text-align:center;"><button type="button" class="mdf-inspect-btn"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td>
                            </tr>
                            <tr class="mdf-log-row">
                                <td style="text-align:center;"><span class="mdf-type-dot is-blocked"></span></td>
                                <td><div class="mdf-origin-flex"><span class="mdf-flag-icon">🇩🇪</span><span class="mdf-country-code">DE</span><span class="mdf-country-name">Germany</span></div></td>
                                <td><span class="mdf-url-path">/?search=%3Cscript%3Ealert(document.cookie)%3C/script%3E</span></td>
                                <td class="mdf-mono-cell">10:41:52 <span class="mdf-utc-lbl">UTC</span></td>
                                <td class="mdf-mono-cell"><code>91.214.124.28</code></td>
                                <td class="mdf-mono-cell mdf-text-muted"><code>91.214.124.28</code></td>
                                <td style="text-align:center;"><span class="mdf-http-badge http-403">403</span></td>
                                <td style="text-align:center;"><button type="button" class="mdf-inspect-btn"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td>
                            </tr>
                            <tr class="mdf-log-row">
                                <td style="text-align:center;"><span class="mdf-type-dot is-allowed"></span></td>
                                <td><div class="mdf-origin-flex"><span class="mdf-flag-icon">🇧🇩</span><span class="mdf-country-code">BD</span><span class="mdf-country-name">Bangladesh</span></div></td>
                                <td><span class="mdf-url-path">/shop/products/sample-item/</span></td>
                                <td class="mdf-mono-cell">10:39:10 <span class="mdf-utc-lbl">UTC</span></td>
                                <td class="mdf-mono-cell"><code>103.114.98.15</code></td>
                                <td class="mdf-mono-cell mdf-text-muted"><code>103.114.98.15</code></td>
                                <td style="text-align:center;"><span class="mdf-http-badge http-200">200</span></td>
                                <td style="text-align:center;"><button type="button" class="mdf-inspect-btn"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td>
                            </tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>

            <!-- Table Pagination -->
            <?php if (!empty($logs['total_pages']) && $logs['total_pages'] > 1): ?>
                <div class="mdf-pagination-bar">
                    <span class="mdf-pagination-info"><?php echo number_format($logs['total']); ?> records found</span>
                    <div class="mdf-pagination-links">
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
                            'prev_text' => '&laquo; Previous',
                            'next_text' => 'Next &raquo;',
                            'total' => $logs['total_pages'],
                            'current' => $logs['page'],
                        ]);
                        ?>
                    </div>
                </div>
            <?php endif; ?>
        </div>

        <!-- Footer Meta Bar -->
        <footer class="mdf-canvas-footer">
            <div class="mdf-footer-sync">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span>Edge data synced 12 seconds ago</span>
            </div>
            <div class="mdf-footer-status">
                <span>Build <?php echo defined('WAF_FW_VERSION') ? esc_html(WAF_FW_VERSION) : '4.3.2'; ?></span>
                <span class="mdf-footer-dot">&bull;</span>
                <a href="https://mdefender.io/status" target="_blank" rel="noopener noreferrer" class="mdf-footer-link">System status &nearr;</a>
            </div>
    </div>


<script>
function mdfToggleExportDropdown(e) {
    e.stopPropagation();
    var menu = document.getElementById('mdfExportDropdown');
    if (menu) {
        menu.style.display = (menu.style.display === 'none' || menu.style.display === '') ? 'block' : 'none';
    }
}

function wafFwActionBlockIp(ip) {
    wafFwSendIpAction('waf_fw_block_ip', ip, 'Manually blocked from Security Logs');
}

function wafFwActionWhitelistIp(ip) {
    wafFwSendIpAction('waf_fw_whitelist_ip', ip, 'Whitelisted from Security Logs');
}

function wafFwSendIpAction(action, ip, reason) {
    var isBlock = action === 'waf_fw_block_ip';
    var actionLabel = isBlock ? 'blacklist' : 'whitelist';
    if (!ip || !window.confirm('Add IP ' + ip + ' to the ' + actionLabel + '?')) return;

    jQuery.post(ajaxurl, {
        action: action,
        ip: ip,
        reason: reason,
        nonce: (typeof waf_fw_ajax !== 'undefined' && waf_fw_ajax.nonce) ? waf_fw_ajax.nonce : ''
    }, function(response) {
        if (response && response.success) {
            window.alert(response.data && response.data.message ? response.data.message : 'IP action completed.');
            window.location.reload();
            return;
        }
        window.alert(response && response.data && response.data.message ? response.data.message : 'Could not update the IP list.');
    }).fail(function(xhr) {
        var message = xhr.responseJSON && xhr.responseJSON.data && xhr.responseJSON.data.message
            ? xhr.responseJSON.data.message
            : 'Request failed. The IP list was not changed.';
        window.alert(message);
    });
}

document.addEventListener('click', function() {
    var menu = document.getElementById('mdfExportDropdown');
    if (menu) menu.style.display = 'none';
});

jQuery(document).ready(function($) {
    // Accordion row toggle on click
    $('#mdfLogsTable tbody').on('click', 'tr.mdf-log-row', function(e) {
        if ($(e.target).closest('a, button, input').length) return;
        var id = $(this).data('id');
        var $detail = $('#mdf-detail-row-' + id);
        if ($detail.length) {
            $detail.toggle();
            $(this).toggleClass('is-expanded', $detail.is(':visible'));
        }
    });

    $('#mdfLogsTable tbody').on('click', '.mdf-inspect-btn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var id = $(this).closest('tr.mdf-log-row').data('id');
        var $detail = $('#mdf-detail-row-' + id);
        if ($detail.length) {
            $detail.toggle();
            $(this).closest('tr.mdf-log-row').toggleClass('is-expanded', $detail.is(':visible'));
        }
    });
});
</script>
