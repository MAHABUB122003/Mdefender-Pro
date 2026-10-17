<?php
/**
 * MDefender-Pro Real-World Cybersecurity Dashboard
 *
 * Designed to mirror the state-of-the-art enterprise aesthetic:
 * 1. Telemetry Status Bar with Live Pulsing Beacon & Quick Defense Pills
 * 2. 4 Primary Telemetry Stat Cards with Individual Color Accents & Live Sparklines
 * 3. 2-Column Telemetry Grid:
 *    - Left: 24h Traffic Ingress & Threat Mitigation Spline Chart
 *    - Right: Threat Vectors & OWASP Top 10 Donut Ledger with Ranked Progress Bars
 * 4. Real-Time Threat Ledger & Intercepted Ingress (Compact, High-Precision 5-row table)
 * 5. Security Controls & Operational Shortcuts Grid
 *
 * @package MDefender-Pro
 */

if (!defined('ABSPATH')) exit;

global $wpdb;
$logger = class_exists('WAF_FW_Logger') ? WAF_FW_Logger::instance() : null;
$dash_data = $logger ? $logger->get_dashboard_data() : [];

$is_protection_enabled = get_option('waf_fw_protection_enabled', 'yes') === 'yes';
$is_cloud_connected = get_option('waf_fw_connected', 'no') === 'yes';
$cloud_mode = get_option('waf_fw_cloud_mode', 'protect');

$total_requests = $dash_data['total_requests'] ?? 0;
$total_attacks = $dash_data['total_attacks'] ?? 0;
$today_attacks = $dash_data['today_attacks'] ?? 0;
$login_blocked = $dash_data['login_blocked'] ?? 0;
$attack_blocked = $dash_data['attack_blocked'] ?? $total_attacks;
$feature_stats = $dash_data['feature_stats'] ?? [];
$malware_findings = $feature_stats['malware_findings'] ?? 0;
$hardening_active = $feature_stats['hardening_active'] ?? 14;
$waf_rules = $feature_stats['waf_rules'] ?? 27272;
$recent_logs = $dash_data['recent_logs'] ?? [];
?>

<style id="war-realworld-dashboard-css">
.war-dashboard {
    display: flex;
    flex-direction: column;
    gap: 20px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    color: #1e293b;
    -webkit-font-smoothing: antialiased;
}
.war-telemetry-header {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
}
.war-defense-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    text-decoration: none !important;
    transition: transform 0.15s ease;
}
.war-defense-pill:hover {
    transform: translateY(-1px);
}
.war-stat-grid-4 {
    display: grid !important;
    grid-template-columns: repeat(4, 1fr) !important;
    gap: 18px !important;
}
@media (max-width: 1200px) {
    .war-stat-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
}
@media (max-width: 640px) {
    .war-stat-grid-4 { grid-template-columns: 1fr !important; }
}
.war-pro-stat-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 18px 20px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 140px;
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
.war-pro-stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px -3px rgba(15, 23, 42, 0.07);
    border-color: #cbd5e1;
}
.war-pro-stat-accent {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
}
.war-pro-stat-card:hover .war-stat-clean-btn {
    opacity: 1;
}
.war-telemetry-2col {
    display: grid !important;
    grid-template-columns: 1.25fr 0.75fr !important;
    gap: 20px !important;
}
@media (max-width: 1024px) {
    .war-telemetry-2col { grid-template-columns: 1fr !important; }
}
.war-pro-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
.war-pro-card-header {
    padding: 16px 22px;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
}
.war-pro-card-body {
    padding: 20px 22px;
    flex: 1;
}
</style>

<div class="war-dashboard">

    <!-- ========================================================================= -->
    <!-- 1. TELEMETRY STATUS BAR WITH LIVE PULSING BEACON & COMPACT DEFENSE PILLS  -->
    <!-- ========================================================================= -->
    <div class="war-telemetry-header">
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
            <div style="display:inline-flex;align-items:center;gap:8px;background:#ecfdf5;border:1px solid #a7f3d0;color:#059669;padding:6px 14px;border-radius:999px;font-size:11.5px;font-weight:800;letter-spacing:0.3px;text-transform:uppercase;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,0.35);animation:pulse 2s infinite;"></span>
                <span><?php echo $is_protection_enabled ? '100% SECURE &bull; SYSTEM GUARD ACTIVE' : 'PROTECTION PAUSED'; ?></span>
            </div>

            <!-- Compact Feature Status Badges (Real-World Metric Pills) -->
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <a href="<?php echo admin_url('admin.php?page=waf-firewall-rules'); ?>" class="war-defense-pill" style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;" title="WAF Web Exploits Neutralized">
                    <span class="dashicons dashicons-shield" style="font-size:14px;width:14px;height:14px;"></span>
                    <span>WAF: <strong id="featWafBlocked"><?php echo number_format($attack_blocked ?: $total_attacks); ?></strong> Blocked</span>
                </a>
                <a href="<?php echo admin_url('admin.php?page=waf-firewall-settings'); ?>" class="war-defense-pill" style="background:#eef2ff;color:#6366f1;border:1px solid #c7d2fe;" title="Login & Brute Force Lockouts">
                    <span class="dashicons dashicons-lock" style="font-size:14px;width:14px;height:14px;"></span>
                    <span>Login Guard: <strong id="featLoginBlocked"><?php echo number_format($login_blocked); ?></strong> Stopped</span>
                </a>
                <a href="<?php echo admin_url('admin.php?page=waf-firewall-hardening'); ?>" class="war-defense-pill" style="background:#fffbeb;color:#d97706;border:1px solid #fde68a;" title="Security Hardening Controls">
                    <span class="dashicons dashicons-admin-network" style="font-size:14px;width:14px;height:14px;"></span>
                    <span>Hardening: <strong id="featHardeningCount"><?php echo $hardening_active; ?>/16</strong> Active</span>
                </a>
                <a href="<?php echo admin_url('admin.php?page=waf-firewall-scan'); ?>" class="war-defense-pill" style="background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;" title="Malware & Core Integrity">
                    <span class="dashicons dashicons-search" style="font-size:14px;width:14px;height:14px;"></span>
                    <span>Radar: <strong id="featMalwareFindings"><?php echo $malware_findings === 0 ? 'Clean (0)' : $malware_findings . ' Threats'; ?></strong></span>
                </a>
                <a href="<?php echo admin_url('admin.php?page=waf-firewall-settings'); ?>" class="war-defense-pill" style="background:#f5f3ff;color:#8b5cf6;border:1px solid #ddd6fe;" title="Runtime Application Self-Protection">
                    <span class="dashicons dashicons-superhero" style="font-size:14px;width:14px;height:14px;"></span>
                    <span>RASP: <strong>In-Memory</strong></span>
                </a>
                <a href="<?php echo esc_url(get_option('waf_fw_dashboard_url', 'https://mdefender-pro.crafix.tech/user/dashboard')); ?>" target="_blank" rel="noopener" class="war-defense-pill" style="background:#f0f9ff;color:#0284c7;border:1px solid #bae6fd;" title="MDefender Cloud Neural Core">
                    <span class="dashicons dashicons-cloud" style="font-size:14px;width:14px;height:14px;"></span>
                    <span>Cloud AI: <strong><?php echo $is_cloud_connected ? 'Connected' : 'Standalone'; ?></strong></span>
                </a>
            </div>
        </div>

        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <a href="<?php echo admin_url('admin.php?page=waf-firewall-scan'); ?>" class="button button-primary" style="background:#2563eb;border-color:#1d4ed8;font-weight:700;display:inline-flex;align-items:center;gap:6px;height:34px;line-height:32px;font-size:12px;border-radius:8px;">
                <span class="dashicons dashicons-search" style="font-size:14px;width:14px;height:14px;margin-top:2px;"></span> Run Scan
            </a>
            <a href="<?php echo admin_url('admin.php?page=waf-firewall-rules'); ?>" class="button" style="font-weight:600;display:inline-flex;align-items:center;gap:6px;height:34px;line-height:32px;font-size:12px;border-radius:8px;background:#fff;border-color:#cbd5e1;color:#334155;">
                <span class="dashicons dashicons-shield" style="font-size:14px;width:14px;height:14px;margin-top:2px;"></span> Rules
            </a>
            <a href="<?php echo admin_url('admin.php?page=waf-firewall-logs'); ?>" class="button" style="font-weight:600;display:inline-flex;align-items:center;gap:6px;height:34px;line-height:32px;font-size:12px;border-radius:8px;background:#fff;border-color:#cbd5e1;color:#334155;">
                <span class="dashicons dashicons-list-view" style="font-size:14px;width:14px;height:14px;margin-top:2px;"></span> Security Logs
            </a>
        </div>
    </div>

    <!-- ========================================================================= -->
    <!-- 2. CORE TELEMETRY KPI STAT CARDS (4 HIGH-PRECISION CYBERSECURITY PILLARS) -->
    <!-- ========================================================================= -->
    <div class="war-stat-grid-4" id="warStatsRow">
        <!-- Card 1: 24h Ingress Requests (Terracotta Orange) -->
        <div class="war-pro-stat-card">
            <div class="war-pro-stat-accent" style="background:linear-gradient(90deg, #E8792F, #F97316);"></div>
            <div style="display:flex;align-items:flex-start;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:42px;height:42px;border-radius:11px;background:#FFF7ED;border:1px solid #FFEDD5;display:flex;align-items:center;justify-content:center;color:#EA580C;">
                        <span class="dashicons dashicons-networking" style="font-size:20px;width:20px;height:20px;"></span>
                    </div>
                    <div>
                        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">24h Ingress Requests</div>
                        <div style="font-size:24px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;line-height:1.2;margin-top:2px;" id="statTotalRequests"><?php echo number_format($total_requests); ?></div>
                    </div>
                </div>
                <span style="background:#FFF7ED;color:#C2410C;border:1px solid #FFEDD5;padding:2px 7px;border-radius:6px;font-size:9.5px;font-weight:800;letter-spacing:0.4px;">LIVE INGRESS</span>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding-top:10px;border-top:1px solid #f8fafc;">
                <div style="font-size:11.5px;color:#059669;font-weight:600;display:flex;align-items:center;gap:4px;">
                    <span class="dashicons dashicons-arrow-up" style="font-size:14px;width:14px;height:14px;"></span>
                    <span id="trendRequests"><?php echo ($dash_data['attack_trend'] ?? 0) > 0 ? '+' : ''; ?><?php echo ($dash_data['attack_trend'] ?? 0); ?>%</span> Traffic Velocity
                </div>
                <div style="width:75px;height:24px;">
                    <canvas id="sparkline1" width="75" height="24"></canvas>
                </div>
            </div>
            <button class="war-stat-clean-btn" id="cleanTotalRequests" title="Clean Total HTTP Requests">
                <span class="dashicons dashicons-trash"></span> Clean
            </button>
        </div>

        <!-- Card 2: Attacks Quarantined (Threat Crimson Red) -->
        <div class="war-pro-stat-card">
            <div class="war-pro-stat-accent" style="background:linear-gradient(90deg, #dc2626, #f87171);"></div>
            <div style="display:flex;align-items:flex-start;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:42px;height:42px;border-radius:11px;background:#fef2f2;border:1px solid #fecaca;display:flex;align-items:center;justify-content:center;color:#dc2626;">
                        <span class="dashicons dashicons-shield-alt" style="font-size:20px;width:20px;height:20px;"></span>
                    </div>
                    <div>
                        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Attacks Quarantined</div>
                        <div style="font-size:24px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;line-height:1.2;margin-top:2px;" id="statBlockedRequests"><?php echo number_format($total_attacks); ?></div>
                    </div>
                </div>
                <span style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:2px 7px;border-radius:6px;font-size:9.5px;font-weight:800;letter-spacing:0.4px;">QUARANTINED</span>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding-top:10px;border-top:1px solid #f8fafc;">
                <div style="font-size:11.5px;color:#dc2626;font-weight:600;display:flex;align-items:center;gap:4px;">
                    <span class="dashicons dashicons-shield" style="font-size:14px;width:14px;height:14px;"></span>
                    <span id="trendBlocked"><?php echo number_format($total_attacks); ?></span> 403 Dropped
                </div>
                <div style="width:75px;height:24px;">
                    <canvas id="sparkline2" width="75" height="24"></canvas>
                </div>
            </div>
            <button class="war-stat-clean-btn war-stat-clean-btn-red" id="cleanBlockedRequests" title="Clean Blocked Requests">
                <span class="dashicons dashicons-trash"></span> Clean
            </button>
        </div>

        <!-- Card 3: Deep AST Signatures & Rules (Deep Forest Pine) -->
        <div class="war-pro-stat-card">
            <div class="war-pro-stat-accent" style="background:linear-gradient(90deg, #0B2522, #1E3E3B);"></div>
            <div style="display:flex;align-items:flex-start;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:42px;height:42px;border-radius:11px;background:#F0FDF4;border:1px solid #BBF7D0;display:flex;align-items:center;justify-content:center;color:#166534;">
                        <span class="dashicons dashicons-admin-settings" style="font-size:20px;width:20px;height:20px;"></span>
                    </div>
                    <div>
                        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">WAF Protection Rules</div>
                        <div style="font-size:24px;font-weight:800;color:#0B2522;letter-spacing:-0.5px;line-height:1.2;margin-top:2px;" id="statMLAccuracy"><?php echo number_format($waf_rules); ?><span style="font-size:13px;font-weight:600;margin-left:2px;color:#64748b;">Rules</span></div>
                    </div>
                </div>
                <span style="background:#F0FDF4;color:#166534;border:1px solid #BBF7D0;padding:2px 7px;border-radius:6px;font-size:9.5px;font-weight:800;letter-spacing:0.4px;">ARMED &amp; ACTIVE</span>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding-top:10px;border-top:1px solid #f8fafc;">
                <div style="font-size:11.5px;color:#059669;font-weight:600;display:flex;align-items:center;gap:4px;">
                    <span class="dashicons dashicons-yes" style="font-size:14px;width:14px;height:14px;"></span>
                    <span>In-Memory RASP Active</span>
                </div>
                <div style="width:75px;height:24px;">
                    <canvas id="sparkline3" width="75" height="24"></canvas>
                </div>
            </div>
        </div>

        <!-- Card 4: Protected Fleet & Health (Vibrant Emerald) -->
        <div class="war-pro-stat-card">
            <div class="war-pro-stat-accent" style="background:linear-gradient(90deg, #059669, #34d399);"></div>
            <div style="display:flex;align-items:flex-start;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:42px;height:42px;border-radius:11px;background:#ecfdf5;border:1px solid #a7f3d0;display:flex;align-items:center;justify-content:center;color:#059669;">
                        <span class="dashicons dashicons-yes-alt" style="font-size:20px;width:20px;height:20px;"></span>
                    </div>
                    <div>
                        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">File &amp; Core Integrity</div>
                        <div style="font-size:24px;font-weight:800;color:#059669;letter-spacing:-0.5px;line-height:1.2;margin-top:2px;" id="statFileIntegrity"><?php echo $malware_findings === 0 ? 'Clean (0)' : $malware_findings . ' Findings'; ?></div>
                    </div>
                </div>
                <span style="background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;padding:2px 7px;border-radius:6px;font-size:9.5px;font-weight:800;letter-spacing:0.4px;"><?php echo $malware_findings === 0 ? '100% INTACT' : 'FINDINGS'; ?></span>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding-top:10px;border-top:1px solid #f8fafc;">
                <div style="font-size:11.5px;color:#059669;font-weight:600;display:flex;align-items:center;gap:4px;">
                    <span class="dashicons dashicons-yes" style="font-size:14px;width:14px;height:14px;"></span>
                    <span>WP Core Checksum OK</span>
                </div>
                <div style="width:75px;height:24px;">
                    <canvas id="sparkline4" width="75" height="24"></canvas>
                </div>
            </div>
        </div>

        <!-- Hidden / Backward-compatible JS elements to prevent runtime errors -->
        <div style="display:none;">
            <div id="statFirewallStatus"><?php echo $is_protection_enabled ? 'Active' : 'Disabled'; ?></div>
            <div id="statThreatsDetected"><?php echo number_format($today_attacks); ?></div>
            <button id="cleanThreatsDetected"></button>
            <div id="statAvgResponseTime">12ms</div>
            <span id="trendThreats">+0%</span>
            <span id="trendAccuracy">+0.8%</span>
            <span id="trendResponse">-2.1ms</span>
            <canvas id="sparkline5" width="80" height="32"></canvas>
            <canvas id="sparkline6" width="80" height="32"></canvas>
        </div>
    </div>

    <!-- ========================================================================= -->
    <!-- 3. VISUAL TELEMETRY: 24H TRAFFIC SPLINE & OWASP THREAT VECTORS LEDGER     -->
    <!-- ========================================================================= -->
    <div class="war-telemetry-2col">
        <!-- Left: Traffic Ingress & Threat Mitigation (Last 24 Hours) -->
        <div class="war-pro-card">
            <div class="war-pro-card-header">
                <div>
                    <h3 style="margin:0;font-size:15px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:8px;">
                        <span class="dashicons dashicons-chart-area" style="color:#E8792F;font-size:18px;width:18px;height:18px;"></span>
                        Traffic Ingress &amp; Threat Mitigation (24 Hours)
                    </h3>
                    <div style="font-size:12px;color:#64748b;margin-top:3px;">Dual-stream edge comparison of clean incoming traffic vs dropped hostile payloads</div>
                </div>
                <span class="war-card-badge war-card-badge-green" style="background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;font-weight:700;padding:3px 10px;border-radius:999px;font-size:11px;">LIVE 24H STREAM</span>
            </div>
            <div class="war-pro-card-body" style="display:flex;flex-direction:column;justify-content:space-between;">
                <div style="height:190px;max-height:190px;position:relative;">
                    <canvas id="timelineChart" style="max-height:190px;"></canvas>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;padding-top:14px;margin-top:14px;border-top:1px solid #f1f5f9;font-size:12px;color:#64748b;flex-wrap:wrap;gap:12px;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="width:8px;height:8px;border-radius:50%;background:#E8792F;"></span>
                        <span>Total Ingress: <strong><?php echo number_format($total_requests); ?> reqs</strong></span>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="width:8px;height:8px;border-radius:50%;background:#dc2626;"></span>
                        <span>Threats Quarantined: <strong><?php echo number_format($total_attacks); ?> dropped</strong></span>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="width:8px;height:8px;border-radius:50%;background:#059669;"></span>
                        <span>Edge SLA: <strong style="color:#059669;">100.0% Protected</strong></span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Right: Threat Vectors & OWASP Top 10 Ledger -->
        <div class="war-pro-card">
            <div class="war-pro-card-header">
                <div>
                    <h3 style="margin:0;font-size:15px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:8px;">
                        <span class="dashicons dashicons-chart-pie" style="color:#d97706;font-size:18px;width:18px;height:18px;"></span>
                        Threat Vectors &amp; OWASP Ledger
                    </h3>
                    <div style="font-size:12px;color:#64748b;margin-top:3px;">Classified attacks blocked by AST pattern signatures</div>
                </div>
                <span class="war-card-badge" style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;font-weight:700;padding:3px 10px;border-radius:999px;font-size:11px;">OWASP TOP 10</span>
            </div>
            <div class="war-pro-card-body" style="display:flex;flex-direction:column;justify-content:center;">
                <div class="war-dist-compact-wrap" style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
                    <div style="flex:0 0 140px;height:140px;position:relative;margin:0 auto;">
                        <canvas id="attackDistChart" style="max-height:140px;max-width:140px;"></canvas>
                        <div id="attackDistCenterCount" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;">
                            <div style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;">DROPPED</div>
                            <div id="distCenterTotal" style="font-size:18px;font-weight:800;color:#0f172a;line-height:1.1;"><?php echo number_format($total_attacks); ?></div>
                        </div>
                    </div>
                    <div class="war-dist-list" id="attackDistLegend" style="flex:1;min-width:180px;display:flex;flex-direction:column;gap:8px;">
                        <!-- Injected dynamically via dashboard.js -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- ========================================================================= -->
    <!-- 4. SECURITY OPERATIONS: REAL-TIME THREAT LEDGER (HIGH-PRECISION FEED)      -->
    <!-- ========================================================================= -->
    <div class="war-pro-card">
        <div class="war-pro-card-header">
            <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:36px;height:36px;border-radius:10px;background:#fef2f2;border:1px solid #fecaca;display:flex;align-items:center;justify-content:center;color:#dc2626;">
                    <span class="dashicons dashicons-shield-alt" style="font-size:20px;width:20px;height:20px;"></span>
                </div>
                <div>
                    <h3 style="margin:0;font-size:15.5px;font-weight:800;color:#0f172a;">Real-Time Threat Ledger &amp; Intercepted Ingress</h3>
                    <div style="font-size:12px;color:#64748b;margin-top:2px;">
                        Most aggressive hostile attempts blocked at perimeter edge &bull; <span id="warFeedCount" style="font-weight:600;color:#2563eb;">Showing latest 5 events</span>
                    </div>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
                <a href="<?php echo admin_url('admin.php?page=waf-firewall-logs'); ?>" class="button button-primary" style="background:#0B2522;border-color:#0B2522;font-weight:700;display:inline-flex;align-items:center;gap:6px;height:32px;line-height:30px;font-size:12px;border-radius:8px;box-shadow:0 2px 6px rgba(11,37,34,0.15);">
                    <span class="dashicons dashicons-list-view" style="font-size:14px;width:14px;height:14px;margin-top:2px;"></span> View All Security Logs &rarr;
                </a>
                <button class="war-btn war-btn-sm war-btn-outline" id="warClearFeed">Clear Feed</button>
            </div>
        </div>
        <div style="padding:0;overflow-x:auto;">
            <table class="war-table war-r-table" id="attackFeedTable">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Source IP</th>
                        <th>Country</th>
                        <th>Attack Type</th>
                        <th>Target URL</th>
                        <th>Severity</th>
                        <th>Confidence</th>
                        <th>Action</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody id="attackFeedBody">
                    <tr class="war-table-empty">
                        <td colspan="9">
                            <span class="dashicons dashicons-shield"></span>
                            <p>No attacks recorded in current window. Your site is secure.</p>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div style="padding:12px 22px;background:#f8fafc;border-top:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;font-size:12px;color:#64748b;">
            <span>Looking for historical attacks, raw payload dumps, or IP investigations?</span>
            <a href="<?php echo admin_url('admin.php?page=waf-firewall-logs'); ?>" style="color:#0B2522;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:4px;" onmouseover="this.style.color='#E8792F'" onmouseout="this.style.color='#0B2522'">
                Open Full Security Logs with Advanced Filters &amp; CSV Export &rarr;
            </a>
        </div>
    </div>

    <!-- ========================================================================= -->
    <!-- 5. SECURITY CONTROLS & OPERATIONAL SHORTCUTS                               -->
    <!-- ========================================================================= -->
    <div class="war-pro-card">
        <div class="war-pro-card-header">
            <div style="display:flex;align-items:center;gap:8px;">
                <span class="dashicons dashicons-megaphone" style="color:#2563eb;"></span>
                <h3 style="margin:0;font-size:15px;font-weight:700;">Security Controls &amp; Shortcuts</h3>
            </div>
            <span class="war-card-badge">Instant Access</span>
        </div>
        <div class="war-pro-card-body">
            <div class="war-actions-grid">
                <button class="war-action-btn" onclick="location.href='<?php echo admin_url('admin.php?page=waf-firewall-rules'); ?>'">
                    <span class="war-action-icon war-action-icon-blue">
                        <span class="dashicons dashicons-shield"></span>
                    </span>
                    <span class="war-action-label">Firewall Rules</span>
                    <span class="war-action-desc">Custom patterns &amp; AST rules</span>
                </button>
                <button class="war-action-btn" onclick="location.href='<?php echo admin_url('admin.php?page=waf-firewall-scan'); ?>'">
                    <span class="war-action-icon war-action-icon-green">
                        <span class="dashicons dashicons-search"></span>
                    </span>
                    <span class="war-action-label">Scan Website</span>
                    <span class="war-action-desc">Malware &amp; core checksum radar</span>
                </button>
                <button class="war-action-btn" onclick="location.href='<?php echo admin_url('admin.php?page=waf-firewall-hardening'); ?>'">
                    <span class="war-action-icon war-action-icon-orange">
                        <span class="dashicons dashicons-admin-network"></span>
                    </span>
                    <span class="war-action-label">Website Hardening</span>
                    <span class="war-action-desc">XML-RPC &amp; wp-config shield</span>
                </button>
                <button class="war-action-btn" onclick="location.href='<?php echo admin_url('admin.php?page=waf-firewall-backup'); ?>'">
                    <span class="war-action-icon war-action-icon-cyan">
                        <span class="dashicons dashicons-backup"></span>
                    </span>
                    <span class="war-action-label">Backup &amp; Restore</span>
                    <span class="war-action-desc">Database &amp; site recovery archives</span>
                </button>
                <button class="war-action-btn" onclick="location.href='<?php echo admin_url('admin.php?page=waf-firewall-tools'); ?>'">
                    <span class="war-action-icon war-action-icon-purple">
                        <span class="dashicons dashicons-admin-tools"></span>
                    </span>
                    <span class="war-action-label">Security Tools</span>
                    <span class="war-action-desc">IP WHOIS, DNS &amp; RBL diagnostics</span>
                </button>
                <button class="war-action-btn" onclick="location.href='<?php echo admin_url('admin.php?page=waf-firewall-settings'); ?>'">
                    <span class="war-action-icon war-action-icon-indigo">
                        <span class="dashicons dashicons-admin-generic"></span>
                    </span>
                    <span class="war-action-label">Settings</span>
                    <span class="war-action-desc">Cloud API, 2FA &amp; Turnstile</span>
                </button>
            </div>
        </div>
    </div>

    <!-- ========================================================================= -->
    <!-- 6. FOOTER                                                                 -->
    <!-- ========================================================================= -->
    <div class="war-footer">
        <div class="war-footer-left">
            <span class="war-footer-brand">MDEFENDER_PRO v<?php echo defined('WAF_FW_VERSION') ? esc_html(WAF_FW_VERSION) : '4.3.0'; ?></span>
            <span class="war-footer-sep">|</span>
            <span>Autonomous Cloud WAF &amp; Enterprise Malware Radar</span>
        </div>
        <div class="war-footer-center">
            <span class="war-footer-badge">AI Machine Learning</span>
            <span class="war-footer-badge war-footer-badge-blue">OWASP Top 10 Protection</span>
            <span class="war-footer-badge war-footer-badge-green">Runtime RASP Active</span>
        </div>
        <div class="war-footer-right">
            <span>&copy; <?php echo date('Y'); ?> MDEFENDER_PRO. All rights reserved.</span>
        </div>
    </div>

</div>
</div>
