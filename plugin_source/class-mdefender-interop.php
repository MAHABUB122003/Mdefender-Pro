<?php
/**
 * MDefender Pro — Inter-Plugin Interoperability & Entitlements Contract
 *
 * Provides decoupled communication, shared event hooks, edition detection,
 * and capability enforcement across the 4 MDefender Pro plugins:
 * 1. Security (Protect)
 * 2. Scanner (Detect)
 * 3. Response (Remediate)
 * 4. Threat Intelligence (Understand)
 *
 * @package MDefender
 */

defined('ABSPATH') || exit;

if (!class_exists('MDefender_Interop')) {

    class MDefender_Interop {

        // Edition Levels
        const EDITION_FREE      = 'free';
        const EDITION_GO        = 'go';
        const EDITION_PRO       = 'pro';
        const EDITION_DEDICATED = 'dedicated';

        // Standard Event Hooks
        const HOOK_SECURITY_BLOCKED    = 'mdefender_security_request_blocked';
        const HOOK_SECURITY_RATE_LIMIT = 'mdefender_security_rate_limited';
        const HOOK_SCANNER_FINDING      = 'mdefender_scanner_threat_detected';
        const HOOK_SCANNER_COMPLETED    = 'mdefender_scanner_run_completed';
        const HOOK_RESPONSE_QUARANTINE  = 'mdefender_response_file_quarantined';
        const HOOK_RESPONSE_CLEANED     = 'mdefender_response_file_cleaned';
        const HOOK_RESPONSE_RESTORED    = 'mdefender_response_file_restored';
        const FILTER_INTEL_CHECK_IP     = 'mdefender_threat_intel_check_ip';
        const FILTER_INTEL_CHECK_HASH   = 'mdefender_threat_intel_check_hash';
        const FILTER_INTEL_GET_FEEDS    = 'mdefender_threat_intel_get_feeds';

        /**
         * Get the active edition for a plugin or the global platform
         *
         * @param string $plugin_slug ('security', 'scanner', 'response', 'threat_intelligence')
         * @return string free|go|pro|dedicated
         */
        public static function get_edition($plugin_slug = '') {
            if (defined('MDEFENDER_BUILD_EDITION')) {
                return MDEFENDER_BUILD_EDITION;
            }
            $license = get_option('mdefender_license_' . $plugin_slug, null);
            if (!$license) {
                $license = get_option('mdefender_license_data', []);
            }
            $edition = is_array($license) ? ($license['edition'] ?? self::EDITION_FREE) : self::EDITION_FREE;
            $valid_editions = [self::EDITION_FREE, self::EDITION_GO, self::EDITION_PRO, self::EDITION_DEDICATED];
            return in_array($edition, $valid_editions, true) ? $edition : self::EDITION_FREE;
        }

        /**
         * Numeric rank of an edition for easy comparison
         */
        public static function get_edition_rank($edition) {
            $ranks = [
                self::EDITION_FREE      => 1,
                self::EDITION_GO        => 2,
                self::EDITION_PRO       => 3,
                self::EDITION_DEDICATED => 4,
            ];
            return $ranks[$edition] ?? 1;
        }

        /**
         * Check if current edition meets or exceeds required tier
         */
        public static function is_edition_at_least($required_edition, $plugin_slug = '') {
            $current_rank = self::get_edition_rank(self::get_edition($plugin_slug));
            $required_rank = self::get_edition_rank($required_edition);
            return $current_rank >= $required_rank;
        }

        /**
         * Check feature entitlement strictly according to the Master Architecture Matrix
         *
         * @param string $plugin ('security', 'scanner', 'response', 'threat_intel')
         * @param string $feature_key
         * @return bool
         */
        public static function can($plugin, $feature_key) {
            $edition = self::get_edition($plugin);
            $matrix = self::get_matrix();

            if (!isset($matrix[$plugin][$feature_key])) {
                return false;
            }

            $allowed_tiers = $matrix[$plugin][$feature_key];
            return in_array($edition, $allowed_tiers, true);
        }

        /**
         * Complete Master Feature Entitlement Matrix
         */
        public static function get_matrix() {
            return [
                'security' => [
                    'waf_basic'                 => ['free', 'go', 'pro', 'dedicated'],
                    'waf_advanced'              => ['go', 'pro', 'dedicated'],
                    'sqli_xss_basic'            => ['free', 'go', 'pro', 'dedicated'],
                    'sqli_xss_advanced'         => ['go', 'pro', 'dedicated'],
                    'path_traversal'            => ['free', 'go', 'pro', 'dedicated'],
                    'brute_force_protection'    => ['free', 'go', 'pro', 'dedicated'],
                    'login_rate_limit'          => ['free', 'go', 'pro', 'dedicated'],
                    'manual_ip_rules'           => ['free', 'go', 'pro', 'dedicated'],
                    'login_alerts_basic'        => ['free', 'go', 'pro', 'dedicated'],
                    'security_logs_extended'    => ['go', 'pro', 'dedicated'],
                    'ml_request_analysis'       => ['go', 'pro', 'dedicated'],
                    'cloud_rule_updates'        => ['go', 'pro', 'dedicated'],
                    'ip_reputation_integration' => ['go', 'pro', 'dedicated'],
                    'country_blocking'          => ['go', 'pro', 'dedicated'],
                    'bot_rules_basic'           => ['go'],
                    'bot_rules_advanced'        => ['pro', 'dedicated'],
                    'rest_api_policies_basic'   => ['free'],
                    'rest_api_policies_advanced'=> ['go', 'pro', 'dedicated'],
                    'custom_firewall_rules'     => ['go', 'pro', 'dedicated'],
                    'multisite_firewall'        => ['pro', 'dedicated'],
                    'team_security_permissions' => ['pro', 'dedicated'],
                    'dedicated_policy_config'   => ['dedicated'],
                ],
                'scanner' => [
                    'manual_malware_scan'       => ['free', 'go', 'pro', 'dedicated'],
                    'core_integrity_check'      => ['free', 'go', 'pro', 'dedicated'],
                    'vulnerability_checks'      => ['free', 'go', 'pro', 'dedicated'],
                    'suspicious_php_basic'      => ['free', 'go', 'pro', 'dedicated'],
                    'fim_basic'                 => ['free'],
                    'fim_advanced'              => ['go', 'pro', 'dedicated'],
                    'scheduled_scan_weekly'     => ['free', 'go', 'pro', 'dedicated'],
                    'scheduled_scan_daily'      => ['go', 'pro', 'dedicated'],
                    'scheduled_scan_custom'     => ['pro', 'dedicated'],
                    'ml_malware_classification' => ['go', 'pro', 'dedicated'],
                    'database_malware_scan'     => ['free', 'go', 'pro', 'dedicated'],
                    'database_malware_advanced' => ['go', 'pro', 'dedicated'],
                    'obfuscated_code_analysis'  => ['free', 'go', 'pro', 'dedicated'],
                    'obfuscated_code_advanced'  => ['go', 'pro', 'dedicated'],
                    'incremental_scanning'      => ['go', 'pro', 'dedicated'],
                    'scan_reports_export'       => ['go', 'pro', 'dedicated'],
                    'multisite_scan_dashboard'  => ['pro', 'dedicated'],
                    'custom_scan_policies'      => ['go', 'pro', 'dedicated'],
                    'org_scan_orchestration'    => ['pro', 'dedicated'],
                    'expert_finding_review'     => ['pro', 'dedicated'],
                ],
                'response' => [
                    'remediation_instructions'  => ['free', 'go', 'pro', 'dedicated'],
                    'manual_quarantine'         => ['go', 'pro', 'dedicated'],
                    'secure_quarantine_storage' => ['go', 'pro', 'dedicated'],
                    'pre_cleanup_backup'        => ['go', 'pro', 'dedicated'],
                    'core_file_repair'          => ['go', 'pro', 'dedicated'],
                    'guided_cleanup_basic'      => ['go'],
                    'guided_cleanup_advanced'   => ['pro', 'dedicated'],
                    'rollback_workflow'         => ['go', 'pro', 'dedicated'],
                    'incident_timeline_basic'   => ['free'],
                    'incident_timeline_full'    => ['go', 'pro', 'dedicated'],
                    'post_cleanup_rescan'       => ['free', 'go', 'pro', 'dedicated'],
                    'recovery_verification'     => ['free', 'go', 'pro', 'dedicated'],
                    'persistence_checks'        => ['go', 'pro', 'dedicated'],
                    'multisite_incident_mgmt'   => ['pro', 'dedicated'],
                    'expert_assisted_cleanup'   => ['pro', 'dedicated'],
                    'priority_escalation'       => ['dedicated'],
                    'contracted_247_response'   => ['dedicated'],
                ],
                'threat_intel' => [
                    'threat_feed_basic'         => ['free', 'go', 'pro', 'dedicated'],
                    'ip_reputation_basic'       => ['free', 'go', 'pro', 'dedicated'],
                    'premium_threat_feeds'      => ['go', 'pro', 'dedicated'],
                    'realtime_reputation_sync'  => ['go', 'pro', 'dedicated'],
                    'ioc_matching_basic'        => ['free'],
                    'ioc_matching_advanced'     => ['go', 'pro', 'dedicated'],
                    'malicious_domain_intel'    => ['free', 'go', 'pro', 'dedicated'],
                    'threat_activity_dashboard' => ['free', 'go', 'pro', 'dedicated'],
                    'threat_intel_export'       => ['go', 'pro', 'dedicated'],
                    'custom_threat_rules'       => ['go', 'pro', 'dedicated'],
                    'threat_intel_api'          => ['pro', 'dedicated'],
                    'multisite_correlation'     => ['pro', 'dedicated'],
                    'org_intelligence_policies' => ['pro', 'dedicated'],
                    'custom_integrations'       => ['pro', 'dedicated'],
                    'dedicated_investigation'   => ['dedicated'],
                ],
                'comparison' => [
                    'realtime_firewall_rules'          => ['go', 'pro', 'dedicated'],
                    'realtime_signatures'              => ['go', 'pro', 'dedicated'],
                    'realtime_ip_blocklist'            => ['go', 'pro', 'dedicated'],
                    'country_blocking'                 => ['go', 'pro', 'dedicated'],
                    'audit_log_30_days'                => ['go', 'pro', 'dedicated'],
                    'audit_log_6_months'               => ['pro', 'dedicated'],
                    'audit_log_1_year'                 => ['dedicated'],
                    'support_ticket'                   => ['go', 'pro', 'dedicated'],
                    'support_priority_ticket'          => ['pro', 'dedicated'],
                    'support_1hour_response'           => ['dedicated'],
                    'support_247_365'                  => ['dedicated'],
                    'hands_on_dedicated_analyst'       => ['pro', 'dedicated'],
                    'mdefender_install_configure'      => ['pro', 'dedicated'],
                    'mdefender_performance_optimize'   => ['pro', 'dedicated'],
                    'security_audit_annual'            => ['pro', 'dedicated'],
                    'malware_audit_cleanup'            => ['pro', 'dedicated'],
                    'security_audit_qa'                => ['pro', 'dedicated'],
                    'site_security_monitoring'         => ['pro', 'dedicated'],
                    'investigation_malware_removal'    => ['pro', 'dedicated'],
                    'post_incident_blocklist_removal'  => ['pro', 'dedicated'],
                    'search_engine_cleanup'            => ['pro', 'dedicated'],
                    'after_action_reports'             => ['pro', 'dedicated'],
                    'scheduled_scans_unlimited'        => ['go', 'pro', 'dedicated'],
                    'scheduled_scans_3days'            => ['free', 'go', 'pro', 'dedicated'],
                    'vulnerability_monitoring'         => ['free', 'go', 'pro', 'dedicated'],
                    'file_change_detection'            => ['free', 'go', 'pro', 'dedicated'],
                    'intrusion_alerts'                 => ['free', 'go', 'pro', 'dedicated'],
                    'rate_limiting'                    => ['free', 'go', 'pro', 'dedicated'],
                    'brute_force_protection'           => ['free', 'go', 'pro', 'dedicated'],
                    'login_security_2fa_recaptcha'     => ['free', 'go', 'pro', 'dedicated'],
                ],
            ];
        }

        /**
         * Get full metadata for the current edition matching the 4-tier plan comparison matrix
         */
        public static function get_plan_metadata($edition = '') {
            $edition = $edition ?: self::get_edition();
            $plans = [
                self::EDITION_FREE => [
                    'name'            => 'MD Defender Free',
                    'target_audience' => 'Entry-Level Sites that Need Basic WordPress Security',
                    'rules_delay'     => 'Rules delayed 30 days',
                    'sig_delay'       => 'Signatures delayed 30 days',
                    'realtime_ip_bl'  => false,
                    'country_block'   => false,
                    'audit_log'       => 'None (Basic 7-day transient)',
                    'support_level'   => 'Volunteer forums',
                    'analyst_support' => false,
                    'scan_frequency'  => 'Every 3 Days',
                    'sla_response'    => 'Community based',
                    'badge_color'     => '#64748b',
                ],
                self::EDITION_GO => [
                    'name'            => 'MD Defender Pro Go',
                    'target_audience' => 'Self-Administered Websites that Need the Best Protection Against Existing and Emerging Threats',
                    'rules_delay'     => 'Real-time rules',
                    'sig_delay'       => 'Real-time signatures',
                    'realtime_ip_bl'  => true,
                    'country_block'   => true,
                    'audit_log'       => '30 Days of History',
                    'support_level'   => 'Ticket based',
                    'analyst_support' => false,
                    'scan_frequency'  => 'Unlimited / On-Demand',
                    'sla_response'    => 'Standard 24-48h',
                    'badge_color'     => '#2563eb',
                ],
                self::EDITION_PRO => [
                    'name'            => 'MD Defender Pro Premium',
                    'target_audience' => 'Busy Business Owners Who Need Hands-on Support From a Dedicated Security Analyst',
                    'rules_delay'     => 'Real-time rules',
                    'sig_delay'       => 'Real-time signatures',
                    'realtime_ip_bl'  => true,
                    'country_block'   => true,
                    'audit_log'       => '6 Months of History',
                    'support_level'   => 'Priority ticket based',
                    'analyst_support' => true,
                    'scan_frequency'  => 'Unlimited / Continuous',
                    'sla_response'    => 'Priority SLA (Once yearly security audit + cleanup)',
                    'badge_color'     => '#7c3aed',
                ],
                self::EDITION_DEDICATED => [
                    'name'            => 'MD Defender Pro Dedicated',
                    'target_audience' => 'Mission-Critical Sites that Require 24/7/365 Incident Response with a 1-Hour Response Time',
                    'rules_delay'     => 'Real-time rules',
                    'sig_delay'       => 'Real-time signatures',
                    'realtime_ip_bl'  => true,
                    'country_block'   => true,
                    'audit_log'       => '1 Year of History',
                    'support_level'   => '1-hour response time (24/7/365)',
                    'analyst_support' => true,
                    'scan_frequency'  => 'Unlimited / Real-time',
                    'sla_response'    => '1-Hour Guaranteed SLA + 24/7/365 Response',
                    'badge_color'     => '#059669',
                ],
            ];
            return $plans[$edition] ?? $plans[self::EDITION_FREE];
        }

        /**
         * Detect which companion MDefender plugins are currently active
         */
        public static function get_active_companion_plugins() {
            $active = [];
            if (defined('MDEFENDER_SECURITY_ACTIVE')) $active['security'] = true;
            if (defined('MDEFENDER_SCANNER_ACTIVE'))  $active['scanner']  = true;
            if (defined('MDEFENDER_RESPONSE_ACTIVE')) $active['response'] = true;
            if (defined('MDEFENDER_INTEL_ACTIVE'))    $active['threat_intel'] = true;
            return $active;
        }

        /**
         * Common UI Banner / Navigation for MDefender Pro Ecosystem
         */
        public static function render_ecosystem_nav($current_plugin = 'security') {
            $plugins = [
                'security'     => ['label' => 'Security (Protect)', 'slug' => 'mdefender-security', 'icon' => 'dashicons-shield'],
                'scanner'      => ['label' => 'Scanner (Detect)', 'slug' => 'mdefender-scanner', 'icon' => 'dashicons-search'],
                'response'     => ['label' => 'Response (Remediate)', 'slug' => 'mdefender-response', 'icon' => 'dashicons-hammer'],
                'threat_intel' => ['label' => 'Threat Intel (Understand)', 'slug' => 'mdefender-threat-intel', 'icon' => 'dashicons-chart-area'],
            ];

            $active_companions = self::get_active_companion_plugins();
            $edition = self::get_edition($current_plugin);

            $badge_colors = [
                self::EDITION_FREE      => '#64748b',
                self::EDITION_GO        => '#2563eb',
                self::EDITION_PRO       => '#7c3aed',
                self::EDITION_DEDICATED => '#059669',
            ];
            $edition_label = strtoupper($edition);
            $badge_color = $badge_colors[$edition] ?? '#2563eb';

            echo '<div style="background:#0f172a; border-radius:10px; padding:12px 20px; margin-bottom:20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; box-shadow:0 4px 12px rgba(0,0,0,0.15); color:#fff; font-family:-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif;">';
            echo '<div style="display:flex; align-items:center; gap:16px;">';
            echo '<span style="font-weight:700; font-size:16px; letter-spacing:0.5px; display:flex; align-items:center; gap:8px;">';
            echo '<span style="color:#38bdf8;">&#9670;</span> MDEFENDER <span style="color:#38bdf8;">PRO</span>';
            echo '</span>';
            echo '<span style="background:' . esc_attr($badge_color) . '; color:#fff; font-size:11px; font-weight:700; padding:2px 8px; border-radius:12px; text-transform:uppercase;">' . esc_html($edition_label) . ' EDITION</span>';
            echo '</div>';

            echo '<div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">';
            foreach ($plugins as $key => $info) {
                $is_current = ($key === $current_plugin);
                $is_active = !empty($active_companions[$key]) || $is_current;
                $bg = $is_current ? '#2563eb' : ($is_active ? '#1e293b' : '#1e293b80');
                $border = $is_current ? '#38bdf8' : ($is_active ? '#334155' : 'transparent');
                $text_color = $is_current ? '#ffffff' : ($is_active ? '#cbd5e1' : '#64748b');
                $title = $is_active ? 'Active' : 'Not Installed / Inactive';

                $url = menu_page_url($info['slug'], false);
                if (!$url || !$is_active) {
                    $url = '#';
                }

                echo '<a href="' . esc_url($url) . '" title="' . esc_attr($title) . '" style="text-decoration:none; display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:500; color:' . esc_attr($text_color) . '; background:' . esc_attr($bg) . '; border:1px solid ' . esc_attr($border) . '; padding:6px 12px; border-radius:6px; transition:all 0.2s ease;">';
                echo '<span class="dashicons ' . esc_attr($info['icon']) . '" style="font-size:15px; width:15px; height:15px; line-height:15px;"></span>';
                echo esc_html($info['label']);
                if ($is_active && !$is_current) {
                    echo ' <span style="display:inline-block; width:6px; height:6px; background:#10b981; border-radius:50%;"></span>';
                }
                echo '</a>';
            }
            echo '</div>';
            echo '</div>';
        }
    }
}
