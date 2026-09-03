<?php
$waf_setup_pending = get_option('waf_fw_onboarding_pending', 'no') === 'yes';
$waf_dash_url = (string) get_option('waf_fw_dashboard_url', '');
if (empty($waf_dash_url)) {
    $waf_dash_url = 'https://mdefenderpro.onrender.com';
}

$logger = WAF_FW_Logger::instance();
$dashboard = $logger->get_dashboard_data();
?>

    <style>
        .waf-settings {
            padding: 8px 2px 24px;
            max-width: 1180px;
        }
        
        /* Tab Navigation Bar */
        .waf-tabs-nav {
            display: flex;
            background: #fff;
            border: 1px solid var(--war-gray-200);
            border-radius: 12px;
            padding: 6px;
            margin-bottom: 24px;
            gap: 6px;
            box-shadow: 0 1px 3px rgba(15,23,42,0.04);
            flex-wrap: wrap;
        }
        .waf-tab-btn {
            background: none;
            border: none;
            color: var(--war-gray-500);
            padding: 10px 18px;
            font-size: 13.5px;
            font-weight: 600;
            border-radius: 8px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
        }
        .waf-tab-btn:hover {
            color: var(--war-primary);
            background: var(--war-gray-50);
        }
        .waf-tab-btn.active {
            background: var(--war-primary);
            color: #fff;
            box-shadow: 0 4px 12px rgba(26, 115, 232, 0.18);
        }
        .waf-tab-btn .dashicons {
            font-size: 17px;
            width: 17px;
            height: 17px;
            line-height: 17px;
        }

        .waf-status-strip {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 18px;
        }
        .waf-status-item {
            background: var(--war-gray-50);
            border: 1px solid var(--war-gray-200);
            border-radius: 10px;
            padding: 10px 14px;
            font-size: 12.5px;
            color: var(--war-gray-600);
            display: inline-flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
        }
        .waf-status-item .dashicons {
            font-size: 16px;
            width: 16px;
            height: 16px;
        }
        .waf-pill {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.3px;
            text-transform: uppercase;
        }
        .waf-pill-on { background: var(--war-green-light); color: var(--war-green); }
        .waf-pill-off { background: var(--war-red-light); color: var(--war-red); }
        .waf-pill-warn { background: var(--war-orange-light); color: var(--war-orange); }
        .waf-pill-info { background: var(--war-primary-light); color: var(--war-primary); }

        .waf-settings-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 20px;
            align-items: start;
        }
        .waf-fw-card {
            background: #fff;
            border: 1px solid var(--war-gray-200);
            border-radius: 12px;
            padding: 20px 20px 8px;
            box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
            margin-bottom: 20px;
        }
        .waf-fw-card.waf-span-2 {
            grid-column: span 2;
        }
        .waf-fw-card h3 {
            margin: 0 0 6px;
            font-size: 14.5px;
            font-weight: 700;
            color: var(--war-secondary);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .waf-fw-card h3 .dashicons {
            font-size: 18px;
            width: 18px;
            height: 18px;
            color: var(--war-primary);
        }
        .waf-fw-card .description {
            font-size: 12px;
            color: var(--war-gray-500);
            margin: 4px 0 14px;
            line-height: 1.5;
        }
        .waf-fw-card label {
            font-weight: 600;
            font-size: 12.5px;
            color: var(--war-gray-700);
            display: block;
            margin-bottom: 6px;
        }
        .waf-fw-card input[type="text"],
        .waf-fw-card input[type="url"],
        .waf-fw-card input[type="number"],
        .waf-fw-card input[type="password"],
        .waf-fw-card select,
        .waf-fw-card textarea {
            margin-bottom: 14px;
        }
        .waf-fw-card p { margin: 0 0 12px; }

        .waf-connect-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 14px;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
        }
        .waf-connect-badge.ok { background: var(--war-green-light); color: var(--war-green); }
        .waf-connect-badge.bad { background: var(--war-red-light); color: var(--war-red); }
        .waf-connect-badge .dashicons { font-size: 14px; width: 14px; height: 14px; }

        .waf-switch-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 8px 0 16px;
        }
        .waf-switch {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 24px;
            flex: 0 0 44px;
        }
        .waf-switch input { opacity: 0; width: 0; height: 0; }
        .waf-switch .waf-slider {
            position: absolute;
            cursor: pointer;
            top: 0; left: 0; right: 0; bottom: 0;
            background: var(--war-gray-300);
            border-radius: 24px;
            transition: 0.2s;
        }
        .waf-switch .waf-slider:before {
            content: '';
            position: absolute;
            height: 18px; width: 18px;
            left: 3px; bottom: 3px;
            background: #fff;
            border-radius: 50%;
            transition: 0.2s;
            box-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        .waf-switch input:checked + .waf-slider { background: var(--war-primary); }
        .waf-switch input:checked + .waf-slider:before { transform: translateX(20px); }
        .waf-switch-label { font-size: 13px; font-weight: 700; color: var(--war-gray-700); }

        .waf-note {
            background: var(--war-primary-light);
            border: 1px solid #d3e3fd;
            border-radius: 8px;
            padding: 10px 12px;
            font-size: 12px;
            color: var(--war-gray-700);
            margin: 0 0 14px;
            line-height: 1.5;
        }
        .waf-note .dashicons { color: var(--war-primary); font-size: 15px; width: 15px; height: 15px; vertical-align: -2px; margin-right: 4px; }
        .waf-btn-row { display: flex; gap: 8px; margin: 4px 0 14px; }
        .waf-settings .button-primary { background: var(--war-primary); border-color: var(--war-primary-dark); }
        .waf-settings .button-primary:hover { background: var(--war-primary-dark); }
        .waf-test-result {
            margin: 4px 0 14px;
            padding: 10px 12px;
            border-radius: 8px;
            font-size: 12.5px;
            line-height: 1.5;
        }

        .waf-modal {
            position: fixed;
            inset: 0;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .waf-modal-backdrop {
            position: absolute;
            inset: 0;
            background: rgba(15, 23, 42, 0.55);
            backdrop-filter: blur(2px);
        }
        .waf-modal-box {
            position: relative;
            background: #fff;
            border-radius: 14px;
            max-width: 520px;
            width: 100%;
            max-height: 92vh;
            overflow: auto;
            box-shadow: 0 24px 60px rgba(15, 23, 42, 0.35);
            animation: wafModalIn 0.22s ease-out;
        }
        @keyframes wafModalIn {
            from { opacity: 0; transform: translateY(14px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .waf-modal-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 16px 20px;
            border-bottom: 1px solid var(--war-gray-200);
            background: linear-gradient(135deg, #eff6ff, #f5f3ff);
            font-weight: 700;
            font-size: 15px;
            color: var(--war-secondary);
            border-radius: 14px 14px 0 0;
        }
        .waf-modal-header .dashicons { color: var(--war-primary); }
        .waf-modal-close {
            margin-left: auto;
            background: none;
            border: none;
            cursor: pointer;
            font-size: 20px;
            color: var(--war-gray-400);
            line-height: 1;
        }
        .waf-modal-close:hover { color: var(--war-secondary); }
        .waf-modal-body { padding: 20px; }
        .waf-modal-body h3 { margin: 0 0 8px; font-size: 15px; color: var(--war-secondary); }
        .waf-modal-body p { margin: 0 0 12px; font-size: 13px; line-height: 1.6; color: var(--war-gray-600); }
        .waf-modal-body ol {
            margin: 4px 0 16px 18px;
            padding: 0;
            font-size: 13px;
            line-height: 1.8;
            color: var(--war-gray-700);
        }
        .waf-modal-body ol li strong { color: var(--war-secondary); }
        .waf-modal-body label {
            display: block;
            font-weight: 600;
            font-size: 12.5px;
            color: var(--war-gray-700);
            margin: 0 0 4px;
        }
        .waf-modal-body input { margin-bottom: 12px; }
        .waf-modal-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 4px; }
        .waf-modal-result { margin: 6px 0 12px; display: none; }
        .waf-modal-result.show { display: block; }
        .waf-setup-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: var(--war-primary-light);
            color: var(--war-primary);
            border-radius: 20px;
            padding: 4px 12px;
            font-size: 11.5px;
            font-weight: 700;
            margin-bottom: 12px;
        }
        @media (max-width: 782px) {
            .waf-fw-card.waf-span-2 { grid-column: span 1; }
            .waf-settings-grid { grid-template-columns: 1fr; }
        }
    </style>

    <div class="waf-settings">

        <!-- Tabbed Navigation Bar -->
        <nav class="waf-tabs-nav">
            <button type="button" class="waf-tab-btn active" data-tab="general">
                <span class="dashicons dashicons-admin-generic"></span> General Settings
            </button>
            <button type="button" class="waf-tab-btn" data-tab="firewall">
                <span class="dashicons dashicons-shield"></span> Firewall (WAF)
            </button>
            <button type="button" class="waf-tab-btn" data-tab="bruteforce">
                <span class="dashicons dashicons-lock"></span> Brute Force &amp; Blocks
            </button>
            <button type="button" class="waf-tab-btn" data-tab="scans">
                <span class="dashicons dashicons-calendar-alt"></span> Scans &amp; Alerts
            </button>
            <button type="button" class="waf-tab-btn" data-tab="blockpage">
                <span class="dashicons dashicons-format-aside"></span> Block Page Customize
            </button>
            <button type="button" class="waf-tab-btn" data-tab="security">
                <span class="dashicons dashicons-admin-network"></span> Admin Security
            </button>
        </nav>

        <div class="waf-status-strip">
            <div class="waf-status-item">
                <span class="dashicons dashicons-shield-alt"></span>
                <span>Protection</span>
                <span id="wafPillProtection" class="waf-pill waf-pill-on">Active</span>
            </div>
            <div class="waf-status-item">
                <span class="dashicons dashicons-cloud"></span>
                <span>Cloud Connection</span>
                <span id="wafPillCloud" class="waf-pill waf-pill-warn">Not connected</span>
            </div>
            <div class="waf-status-item">
                <span class="dashicons dashicons-filter"></span>
                <span>Scope Mode</span>
                <span id="wafPillMode" class="waf-pill waf-pill-info">Protect</span>
            </div>
            <div class="waf-status-item">
                <span class="dashicons dashicons-performance"></span>
                <span>Security Level</span>
                <span id="wafPillSecurity" class="waf-pill waf-pill-info">High</span>
            </div>
            <div class="waf-status-item">
                <span class="dashicons dashicons-welcome-learn-more"></span>
                <span>Learning Mode</span>
                <span id="wafPillLearning" class="waf-pill waf-pill-off">Off</span>
            </div>
        </div>

        <?php if ($waf_setup_pending) : ?>
        <div id="wafSetupModal" class="waf-modal" style="display:none;">
            <div class="waf-modal-backdrop" data-waf-dismiss="1"></div>
            <div class="waf-modal-box">
                <div class="waf-modal-header">
                    <span class="dashicons dashicons-cloud"></span>
                    Connect MDefender-Pro
                    <button type="button" class="waf-modal-close" data-waf-dismiss="1" title="Close">&times;</button>
                </div>
                <div class="waf-modal-body">
                    <span class="waf-setup-badge"><span class="dashicons dashicons-welcome-learn-more"></span> Get started in 3 steps</span>

                    <div id="wafSetupStep1">
                        <h3>Protect this site with MDefender-Pro Cloud</h3>
                        <p>Machine-learning WAF and malware scanning are delivered from your MDefender-Pro account. This popup appears once, right after activation.</p>
                        <ol>
                            <li><strong>Register / log in</strong> at the MDefender-Pro website.</li>
                            <li><strong>Add your website</strong> and copy its API key (shown once).</li>
                            <li><strong>Paste the API key and click Connect</strong> - your site connects automatically.</li>
                        </ol>
                        <div class="waf-modal-actions">
                            <button type="button" class="button button-primary" id="wafSetupNext">I have my API key</button>
                            <button type="button" class="button" id="wafOpenDashboard"><span class="dashicons dashicons-external"></span> Open MDefender-Pro Dashboard</button>
                        </div>
                    </div>

                    <div id="wafSetupStep2" style="display:none;">
                        <h3>Connect your website</h3>
                        <p>Enter the Website API key from your MDefender-Pro dashboard.</p>
                        <p>
                            <label for="wafSetupKey">Website API Key</label>
                            <input type="text" id="wafSetupKey" class="widefat" placeholder="mdf_live_...">
                            <span class="description" style="display:block;margin-top:2px;font-size:12px;color:var(--war-gray-500);">Issued per-website in your MDefender-Pro dashboard.</span>
                        </p>
                        <div class="waf-modal-result" id="wafSetupResult"></div>
                        <div class="waf-modal-actions">
                            <button type="button" class="button button-primary" id="wafSetupConnect">Connect</button>
                            <button type="button" class="button" id="wafSetupBack">&larr; Back</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <?php endif; ?>

        <!-- Tab 1: General & Cloud Connection -->
        <div id="waf-tab-general" class="waf-tab-panel">
            <div class="waf-settings-grid">
                <div class="waf-fw-card waf-span-2">
                    <h3><span class="dashicons dashicons-lock"></span> Master WAF Protection</h3>
                    <p class="description">Master switch for the web application firewall. When enabled, every incoming request is inspected - malicious requests are blocked instantly with a 403 response while normal requests are allowed.</p>
                    <div class="waf-switch-row">
                        <label class="waf-switch">
                            <input type="checkbox" id="wafFwProtection">
                            <span class="waf-slider"></span>
                        </label>
                        <span class="waf-switch-label" id="wafProtectionLabel">WAF Protection is ON</span>
                    </div>
                </div>

                <div class="waf-fw-card waf-span-2">
                    <h3><span class="dashicons dashicons-cloud"></span> MDefender-Pro Cloud Service</h3>
                    <p class="description">Connect this site to your MDefender-Pro dashboard using your website API key. Once connected, ML WAF analysis and malware scanning are served by the cloud, while local rules still protect every request.</p>
                    <div id="wafCloudBadge" class="waf-connect-badge bad"><span class="dashicons dashicons-cloud"></span> Not connected</div>
                    <form id="wafFwMlForm">
                        <p>
                            <label for="wafFwMlKey">Website API Key</label>
                            <input type="text" id="wafFwMlKey" class="widefat" placeholder="mdf_live_...">
                            <span class="description">Issued per-website in your MDefender-Pro dashboard.</span>
                        </p>
                        <div class="waf-btn-row" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                            <button type="submit" class="button button-primary" id="wafSaveMlBtn">
                                <span class="dashicons dashicons-admin-plugins" style="vertical-align:middle;font-size:16px;width:16px;height:16px;margin-top:-2px;"></span> Save &amp; Connect
                            </button>
                            <button type="button" class="button" id="wafTestMlConnection" onclick="wafTestMLConnection()">
                                <span class="dashicons dashicons-yes" style="vertical-align:middle;font-size:16px;width:16px;height:16px;margin-top:-2px;"></span> Test Connection
                            </button>
                            <button type="button" class="button" id="wafDisconnectMl" style="display:none;color:#b91c1c;border-color:#fecaca;">
                                <span class="dashicons dashicons-no-alt" style="vertical-align:middle;font-size:16px;width:16px;height:16px;margin-top:-2px;"></span> Disconnect
                            </button>
                        </div>
                        <div id="wafMlTestResult" class="waf-test-result" style="display:none;margin-top:12px;"></div>
                    </form>
                </div>
                
                <div class="waf-fw-card">
                    <h3><span class="dashicons dashicons-admin-tools"></span> Diagnostics &amp; Status</h3>
                    <p class="description">Status indicators of active database items and tables.</p>
                    <div style="font-size:13px; line-height:1.8; color:var(--war-gray-700);">
                        <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid #f1f5f9;">
                            <span>Security Score:</span>
                            <strong style="color:var(--war-primary);"><?php echo esc_html($dashboard['security_score']); ?>/100</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid #f1f5f9;">
                            <span>Total Attacks Blocked:</span>
                            <strong><?php echo number_format($dashboard['total_attacks']); ?></strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid #f1f5f9;">
                            <span>Blacklisted IPs:</span>
                            <strong><?php echo number_format($dashboard['total_blacklisted']); ?></strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; padding:4px 0;">
                            <span>Rate Limit RPM:</span>
                            <strong><?php echo esc_html($dashboard['rate_current']); ?> / <?php echo esc_html($dashboard['rate_limit']); ?> Limit</strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tab 2: WAF Firewall Engine Settings -->
        <div id="waf-tab-firewall" class="waf-tab-panel" style="display:none;">
            <div class="waf-settings-grid">
                <div class="waf-fw-card">
                    <h3><span class="dashicons dashicons-filter"></span> WAF Engine Tuning</h3>
                    <p class="description">Tune how requests are analysed before they reach your website.</p>
                    <form id="wafFwEngineForm">
                        <p>
                            <label>Security Level</label>
                            <select id="wafFwSecurityLevel" class="widefat">
                                <option value="high">High - block suspicious patterns</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </p>
                        <p>
                            <label>Confidence Threshold (0.0 - 1.0)</label>
                            <input type="range" id="wafFwConfidence" min="0" max="1" step="0.05" value="0.7" oninput="this.nextElementSibling.textContent=this.value" style="width:75%; vertical-align:middle;">
                            <output style="font-weight:700;color:var(--war-primary);margin-left:8px;vertical-align:middle;">0.7</output>
                        </p>
                        <p>
                            <label>Cloud ML Scope</label>
                            <select id="wafFwCloudScope" class="widefat">
                                <option value="signal" selected>Signal-triggered - cloud ML only on requests with attack signals</option>
                                <option value="all">All requests - cloud ML analyses every request (maximum protection)</option>
                            </select>
                            <span class="description">Select "All requests" so every request is verified by the cloud ML model.</span>
                        </p>
                        <p>
                            <label>Rate Limit (requests per minute per IP)</label>
                            <input type="number" id="wafFwRateLimit" class="widefat" value="100" min="1">
                        </p>
                        <p>
                            <label style="font-weight:normal; cursor:pointer;">
                                <input type="checkbox" id="wafFwLearningMode" value="yes">
                                <strong>Enable learning mode</strong> (log requests but do not block)
                            </label>
                        </p>
                        <p><button type="submit" class="button button-primary">Save WAF Engine Settings</button></p>
                    </form>
                </div>

                <div class="waf-fw-card">
                    <h3><span class="dashicons dashicons-admin-site-alt"></span> Country Blocking</h3>
                    <p class="description">Block visitors from selected countries (uses ip-api.com for geo lookup).</p>
                    <form id="wafFwModeForm">
                        <p>
                            <label>Blocked Countries (comma-separated ISO codes)</label>
                            <input type="text" id="wafFwBlockedCountries" class="widefat" placeholder="CN, RU, KP, IR">
                            <span class="description">e.g. CN, RU, KP, IR. Leave empty for no country blocking.</span>
                        </p>
                        <p><button type="submit" class="button button-primary">Save Country Settings</button></p>
                    </form>
                </div>
            </div>
        </div>

        <!-- Tab 3: Brute Force & IP Blocks -->
        <div id="waf-tab-bruteforce" class="waf-tab-panel" style="display:none;">
            <div class="waf-settings-grid">
                <div class="waf-fw-card">
                    <h3><span class="dashicons dashicons-shield"></span> Automatic IP Block</h3>
                    <div class="waf-note">
                        <span class="dashicons dashicons-info"></span>
                        If an attacker keeps sending attack payloads and reaches the threshold below, the source IP is automatically blacklisted.
                    </div>
                    <form id="wafFwAttackForm">
                        <p>
                            <label style="font-weight:normal; cursor:pointer;">
                                <input type="checkbox" id="wafFwAttackEnabled" value="yes">
                                <strong>Enable automatic IP blocking</strong>
                            </label>
                        </p>
                        <p>
                            <label>Attack Threshold</label>
                            <select id="wafFwAttackThreshold" class="widefat">
                                <option value="5">5 attacks</option>
                                <option value="10">10 attacks</option>
                                <option value="15">15 attacks</option>
                                <option value="20" selected>20 attacks</option>
                                <option value="30">30 attacks</option>
                                <option value="50">50 attacks</option>
                            </select>
                            <span class="description">Number of attack attempts before the IP is auto-blocked.</span>
                        </p>
                        <p>
                            <label>Tracking Window</label>
                            <select id="wafFwAttackWindow" class="widefat">
                                <option value="3600">1 hour</option>
                                <option value="43200">12 hours</option>
                                <option value="86400" selected>24 hours</option>
                                <option value="604800">7 days</option>
                            </select>
                            <span class="description">Time window used to count the attack attempts.</span>
                        </p>
                        <p>
                            <label>Block Duration</label>
                            <select id="wafFwAttackDuration" class="widefat">
                                <option value="3600">1 hour</option>
                                <option value="7200">2 hours</option>
                                <option value="43200">12 hours</option>
                                <option value="86400" selected>1 day</option>
                                <option value="259200">3 days</option>
                                <option value="604800">7 days</option>
                            </select>
                            <span class="description">How long the IP remains blocked.</span>
                        </p>
                        <p><button type="submit" class="button button-primary">Save IP Block Settings</button></p>
                    </form>
                </div>

                <div class="waf-fw-card">
                    <h3><span class="dashicons dashicons-admin-users"></span> Login Protection (Brute Force)</h3>
                    <p class="description">Auto-block IP addresses after too many failed login attempts.</p>
                    <form id="wafFwLoginForm">
                        <p>
                            <label style="font-weight:normal; cursor:pointer;">
                                <input type="checkbox" id="wafFwLoginEnabled" value="yes">
                                <strong>Enable login rate-limiting</strong>
                            </label>
                        </p>
                        <p>
                            <label>Failed Login Threshold</label>
                            <input type="number" id="wafFwLoginThreshold" class="widefat" value="10" min="1" max="100">
                            <span class="description">Failed attempts threshold before lockout.</span>
                        </p>
                        <p>
                            <label>Block Duration</label>
                            <select id="wafFwLoginDuration" class="widefat">
                                <option value="300">5 minutes</option>
                                <option value="1800">30 minutes</option>
                                <option value="3600">1 hour</option>
                                <option value="10800">3 hours</option>
                                <option value="18000" selected>5 hours</option>
                                <option value="43200">12 hours</option>
                                <option value="86400">1 day</option>
                                <option value="259200">3 days</option>
                                <option value="604800">7 days</option>
                            </select>
                            <span class="description">Lockout duration.</span>
                        </p>
                        <p><button type="submit" class="button button-primary">Save Login Settings</button></p>
                    </form>
                </div>
            </div>
        </div>

        <!-- Tab 4: Scheduled Scans & Alerts -->
        <div id="waf-tab-scans" class="waf-tab-panel" style="display:none;">
            <div class="waf-settings-grid">
                <div class="waf-fw-card">
                    <h3><span class="dashicons dashicons-calendar-alt"></span> Scheduled Scan</h3>
                    <p class="description">Automate malware scans on a schedule. Requires WP cron to be functional.</p>
                    <form id="wafFwScheduleForm">
                        <p>
                            <label style="font-weight:normal; cursor:pointer;">
                                <input type="checkbox" id="wafFwScheduleEnabled" value="1">
                                <strong>Enable scheduled scanning</strong>
                            </label>
                        </p>
                        <p>
                            <label>Scan Frequency</label>
                            <select id="wafFwScheduleFrequency" class="widefat">
                                <option value="daily">Daily</option>
                                <option value="weekly" selected>Weekly</option>
                            </select>
                        </p>
                        <p>
                            <label>Scan Type</label>
                            <select id="wafFwScheduleScanType" class="widefat">
                                <option value="quick">Quick Scan</option>
                                <option value="full" selected>Full Scan</option>
                            </select>
                        </p>
                        <p><button type="submit" class="button button-primary">Save Scheduled Scan Settings</button></p>
                    </form>
                </div>

                <div class="waf-fw-card">
                    <h3><span class="dashicons dashicons-chart-area"></span> Logging &amp; Alerts</h3>
                    <p class="description">Keep request and attack history, and get email reports after scans.</p>
                    <form id="wafFwLogForm">
                        <p>
                            <label>Log Retention (days)</label>
                            <input type="number" id="wafFwLogRetention" class="widefat" value="30" min="1">
                            <span class="description">How long security logs are kept before cleanup.</span>
                        </p>
                        <p>
                            <label style="font-weight:normal; cursor:pointer;">
                                <input type="checkbox" id="wafFwEmailAlerts" value="yes">
                                <strong>Email scan reports</strong>
                            </label>
                            <span class="description">Send the site admin an email after each malware scan.</span>
                        </p>
                        <p><button type="submit" class="button button-primary">Save Log Settings</button></p>
                    </form>
                    
                    <div style="margin-top: 15px; padding-top: 15px; border-top:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:13px; color:var(--war-gray-600); font-weight:600;">Security Logs:</span>
                        <a href="<?php echo admin_url('admin.php?page=waf-firewall-logs'); ?>" class="button button-small" style="display:inline-flex; align-items:center; gap:4px; color:var(--war-primary); border-color:var(--war-primary);">
                            <span class="dashicons dashicons-list-view" style="font-size:14px; width:14px; height:14px; margin-top:2px;"></span> Open Security Logs
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tab 5: Block Page Customizer -->
        <div id="waf-tab-blockpage" class="waf-tab-panel" style="display:none;">
            <div class="waf-settings-grid">
                <div class="waf-fw-card">
                    <h3><span class="dashicons dashicons-format-aside"></span> Customize Block Page</h3>
                    <p class="description">Define the message and appearance shown to blocked clients.</p>
                    <form id="wafFwBlockForm">
                        <p>
                            <label>Block Message</label>
                            <textarea id="wafFwBlockMessage" class="widefat" rows="3">This request has been blocked by Web Application Firewall</textarea>
                        </p>
                        <p>
                            <label>Gradient Colors (comma separated hex codes)</label>
                            <input type="text" id="wafFwBlockColors" class="widefat" value="#667eea,#764ba2">
                            <span class="description">e.g. #4f46e5,#6366f1. Used for top bar gradient and preview.</span>
                        </p>
                        <p><button type="submit" class="button button-primary">Save Block Page Settings</button></p>
                    </form>
                </div>

                <div class="waf-fw-card">
                    <h3><span class="dashicons dashicons-visibility"></span> Live Page Preview</h3>
                    <p class="description">See how your blocked visitors will view the restricted page in real time.</p>
                    
                    <div style="border: 1px solid #cbd5e1; border-radius: 12px; overflow:hidden; background:#f1f5f9; padding: 20px 10px; display:flex; align-items:center; justify-content:center;">
                        <!-- Mini Preview Mockup Box -->
                        <div style="background:#fff; border-radius:12px; width:100%; max-width:320px; padding:18px; box-shadow:0 10px 20px rgba(0,0,0,0.06); border:1px solid #e2e8f0; position:relative; font-family:sans-serif; text-align:left;">
                            <div id="wafPreviewBorder" style="position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg, #667eea, #764ba2); border-radius:12px 12px 0 0;"></div>
                            <div style="display:flex; align-items:center; justify-content:center; width:28px; height:28px; margin:0 auto 10px; background:#fafafa; border:1px solid #cbd5e1; border-radius:8px;">
                                <span class="dashicons dashicons-shield" style="color:#667eea; font-size:14px; width:14px; height:14px; line-height:14px;"></span>
                            </div>
                            <div style="text-align:center; font-size:10px; font-weight:700; color:#667eea; text-transform:uppercase; letter-spacing:1px; margin-bottom:2px;" id="wafPreviewSiteName"><?php echo esc_html(get_bloginfo('name')); ?></div>
                            <h4 style="text-align:center; font-size:13px; font-weight:800; color:#0f172a; margin:0 0 6px;">403 — Access Denied</h4>
                            <p style="text-align:center; font-size:11px; color:#475569; line-height:1.4; margin:0 0 12px;" id="wafPreviewMessage">This request has been blocked by Web Application Firewall</p>
                            
                            <div style="background:#f8fafc; border:1px solid #f1f5f9; border-radius:8px; font-size:10px; margin-bottom:12px; overflow:hidden;">
                                <div style="display:flex; justify-content:space-between; padding:6px 10px; border-bottom:1px solid #f1f5f9;">
                                    <span style="color:#64748b; font-weight:600;">ATTACK</span>
                                    <span style="color:#b91c1c; font-weight:700;">SQL Injection</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; padding:6px 10px;">
                                    <span style="color:#64748b; font-weight:600;">REF ID</span>
                                    <span style="color:#334155; font-family:monospace;">MDF-9D8B1C</span>
                                </div>
                            </div>
                            
                            <div style="display:flex; gap:6px; justify-content:center;">
                                <span style="display:inline-block; padding:6px 10px; background:linear-gradient(90deg, #667eea, #764ba2); color:#fff; border-radius:4px; font-size:9.5px; font-weight:600;" id="wafPreviewBtnPrimary">Return Home</span>
                                <span style="display:inline-block; padding:6px 10px; background:#fff; border:1px solid #cbd5e1; color:#334155; border-radius:4px; font-size:9.5px; font-weight:600;">Copy ID</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tab 6: Admin Account Security -->
        <div id="waf-tab-security" class="waf-tab-panel" style="display:none;">
            <div class="waf-settings-grid">
                <div class="waf-fw-card">
                    <h3><span class="dashicons dashicons-admin-network"></span> Change Password</h3>
                    <p class="description">Change the password for this MDefender Pro admin account.</p>
                    <form id="wafFwPasswordForm">
                        <p>
                            <label>Current Password</label>
                            <input type="password" id="wafFwOldPassword" class="widefat" required>
                        </p>
                        <p>
                            <label>New Password</label>
                            <input type="password" id="wafFwNewPassword" class="widefat" required minlength="6">
                        </p>
                        <p>
                            <label>Confirm New Password</label>
                            <input type="password" id="wafFwConfirmPassword" class="widefat" required>
                        </p>
                        <p><button type="submit" class="button button-primary">Change Password</button></p>
                    </form>
                </div>
            </div>
        </div>

    </div>

    <script>
    function wafPill($el, text, kind) {
        $el.attr('class', 'waf-pill waf-pill-' + kind).text(text);
    }

    function wafTestMLConnection() {
        var btn = jQuery('#wafTestMlConnection');
        var key = jQuery('#wafFwMlKey').val().trim();
        if (!key) {
            jQuery('#wafMlTestResult').html('<div style="background:var(--war-red-light);border:1px solid #fecaca;border-radius:6px;padding:12px;color:#b91c1c;"><strong>Error:</strong> Please enter your Website API Key first.</div>').show();
            return;
        }
        btn.prop('disabled', true).text('Testing...');
        jQuery('#wafMlTestResult').hide();

        jQuery.post(ajaxurl + '?action=waf_fw_save_settings', JSON.stringify({ ml_api_key: key }), function(r) {
            if (r.success) {
                var html = '';
                if (r.data.connected === true) {
                    html = '<div style="background:var(--war-green-light);border:1px solid #a7f3d0;border-radius:6px;padding:12px;color:#047857;"><strong>Connected!</strong> ' + (r.data.connection_message || 'Cloud service connected.') + '</div>';
                    wafCloudBadge('yes');
                    jQuery('#wafDisconnectMl').show();
                } else if (r.data.connected === false) {
                    html = '<div style="background:var(--war-red-light);border:1px solid #fecaca;border-radius:6px;padding:12px;color:#b91c1c;"><strong>Connection Failed:</strong> ' + (r.data.connection_message || 'Could not reach the cloud service.') + '<br><small>Check that the API key belongs to this website domain in your MDefender-Pro dashboard.</small></div>';
                    wafCloudBadge('no');
                } else {
                    html = '<div style="background:var(--war-gray-50);border:1px solid var(--war-gray-300);border-radius:6px;padding:12px;color:#475569;">Settings saved.</div>';
                }
                jQuery('#wafMlTestResult').html(html).show();
            } else {
                jQuery('#wafMlTestResult').html('<div style="background:var(--war-red-light);border:1px solid #fecaca;border-radius:6px;padding:12px;color:#b91c1c;">Save failed: ' + (r.data && r.data.message ? r.data.message : 'Unknown error') + '</div>').show();
            }
            btn.prop('disabled', false).html('<span class="dashicons dashicons-yes" style="vertical-align:middle;font-size:16px;width:16px;height:16px;margin-top:-2px;"></span> Test Connection');
        }).fail(function() {
            jQuery('#wafMlTestResult').html('<div style="background:var(--war-red-light);border:1px solid #fecaca;border-radius:6px;padding:12px;color:#b91c1c;">Network error. Check your server connection.</div>').show();
            btn.prop('disabled', false).html('<span class="dashicons dashicons-yes" style="vertical-align:middle;font-size:16px;width:16px;height:16px;margin-top:-2px;"></span> Test Connection');
        });
    }

    function wafCloudBadge(connected) {
        var $b = jQuery('#wafCloudBadge');
        if (connected === 'yes') {
            $b.attr('class', 'waf-connect-badge ok').html('<span class="dashicons dashicons-cloud-saved"></span> Connected to MDefender-Pro cloud');
            jQuery('#wafDisconnectMl').show();
        } else {
            $b.attr('class', 'waf-connect-badge bad').html('<span class="dashicons dashicons-cloud"></span> Not connected');
            jQuery('#wafDisconnectMl').hide();
        }
    }

    jQuery(document).ready(function($) {
        // Tab switching navigation
        $('.waf-tab-btn').on('click', function() {
            var tabId = $(this).data('tab');
            $('.waf-tab-btn').removeClass('active');
            $(this).addClass('active');
            $('.waf-tab-panel').hide();
            $('#waf-tab-' + tabId).show();
        });

        // Live Block Page Preview binding
        function updateBlockPreview() {
            var msg = $('#wafFwBlockMessage').val();
            var colors = $('#wafFwBlockColors').val().split(',');
            var c1 = $.trim(colors[0] || '#667eea');
            var c2 = $.trim(colors[1] || '#764ba2');
            
            $('#wafPreviewMessage').text(msg);
            $('#wafPreviewBorder, #wafPreviewBtnPrimary').css('background', 'linear-gradient(90deg, ' + c1 + ', ' + c2 + ')');
        }
        $('#wafFwBlockMessage, #wafFwBlockColors').on('input', updateBlockPreview);

        function updateStatus(d) {
            if (!d) return;
            wafPill($('#wafPillProtection'), d.protection_enabled === 'yes' ? 'Active' : 'Off', d.protection_enabled === 'yes' ? 'on' : 'off');
            wafPill($('#wafPillCloud'), d.connected === 'yes' ? 'Connected' : 'Not connected', d.connected === 'yes' ? 'on' : 'warn');
            wafPill($('#wafPillMode'), (d.cloud_mode || 'protect'), d.cloud_mode === 'off' ? 'off' : 'info');
            wafPill($('#wafPillSecurity'), (d.security_level || 'high'), 'info');
            wafPill($('#wafPillLearning'), d.learning_mode === 'yes' ? 'On' : 'Off', d.learning_mode === 'yes' ? 'warn' : 'off');
            wafCloudBadge(d.connected === 'yes' ? 'yes' : 'no');
            if (d.connected === 'yes') {
                $('#wafPillCloud').attr('class', 'waf-pill waf-pill-on').text('Connected');
            }
        }

        function wafCompleteOnboarding() {
            $.post(ajaxurl + '?action=waf_fw_complete_onboarding', {}, function() {
                location.reload();
            });
        }

        $('#wafDisconnectMl').on('click', function() {
            if (!confirm('Are you sure you want to disconnect from MDefender-Pro Cloud?')) return;
            var btn = $(this);
            btn.prop('disabled', true).text('Disconnecting...');
            $.post(ajaxurl + '?action=waf_fw_save_settings', JSON.stringify({
                ml_api_key: ''
            }), function(r) {
                $('#wafFwMlKey').val('');
                wafCloudBadge('no');
                $('#wafMlTestResult').html('<div style="background:var(--war-gray-50);border:1px solid var(--war-gray-300);border-radius:6px;padding:12px;color:#475569;">Disconnected from MDefender-Pro Cloud.</div>').show();
                $.get(ajaxurl, {action:'waf_fw_get_settings'}, function(r2) {
                    if (r2.success) updateStatus(r2.data);
                });
            }).always(function() {
                btn.prop('disabled', false).html('<span class="dashicons dashicons-no-alt" style="vertical-align:middle;font-size:16px;width:16px;height:16px;margin-top:-2px;"></span> Disconnect');
            });
        });

        $('#wafFwMlForm').on('submit', function(e) {
            e.preventDefault();
            var btn = $('#wafSaveMlBtn');
            var key = $('#wafFwMlKey').val().trim();
            if (!key) {
                $('#wafMlTestResult').html('<div style="background:var(--war-red-light);border:1px solid #fecaca;border-radius:6px;padding:12px;color:#b91c1c;">Please enter your Website API key.</div>').show();
                return;
            }
            btn.prop('disabled', true).text('Connecting...');
            $('#wafMlTestResult').hide();

            $.post(ajaxurl + '?action=waf_fw_save_settings', JSON.stringify({
                ml_api_key: key
            }), function(r) {
                if (r.success) {
                    var html = '';
                    if (r.data.connected === true) {
                        html = '<div style="background:var(--war-green-light);border:1px solid #a7f3d0;border-radius:6px;padding:12px;color:#047857;"><strong>Connected!</strong> ' + (r.data.connection_message || 'Cloud service connected.') + '</div>';
                        wafCloudBadge('yes');
                    } else if (r.data.connected === false) {
                        html = '<div style="background:var(--war-red-light);border:1px solid #fecaca;border-radius:6px;padding:12px;color:#b91c1c;"><strong>Connection Failed:</strong> ' + (r.data.connection_message || 'Could not reach the cloud service.') + '<br><small>Check that the API key belongs to this website domain in your MDefender-Pro dashboard.</small></div>';
                        wafCloudBadge('no');
                    } else {
                        html = '<div style="background:var(--war-gray-50);border:1px solid var(--war-gray-300);border-radius:6px;padding:12px;color:#475569;">Settings saved.</div>';
                    }
                    $('#wafMlTestResult').html(html).show();
                    $.get(ajaxurl, {action:'waf_fw_get_settings'}, function(r2) {
                        if (r2.success) updateStatus(r2.data);
                    });
                } else {
                    $('#wafMlTestResult').html('<div style="background:var(--war-red-light);border:1px solid #fecaca;border-radius:6px;padding:12px;color:#b91c1c;">Save failed: ' + (r.data && r.data.message ? r.data.message : 'Unknown error') + '</div>').show();
                }
            }).fail(function() {
                $('#wafMlTestResult').html('<div style="background:var(--war-red-light);border:1px solid #fecaca;border-radius:6px;padding:12px;color:#b91c1c;">Network error. Check your server connection.</div>').show();
            }).always(function() {
                btn.prop('disabled', false).html('<span class="dashicons dashicons-admin-plugins" style="vertical-align:middle;font-size:16px;width:16px;height:16px;margin-top:-2px;"></span> Save &amp; Connect');
            });
        });

        if ($('#wafSetupModal').length) {
            var wafDashUrl = '<?php echo esc_js($waf_dash_url); ?>';
            $('#wafSetupModal').show();

            $('#wafOpenDashboard').on('click', function() {
                window.open(wafDashUrl, '_blank');
            });
            $('#wafSetupNext').on('click', function() {
                $('#wafSetupStep1').hide();
                $('#wafSetupStep2').show();
            });
            $('#wafSetupBack').on('click', function() {
                $('#wafSetupStep2').hide();
                $('#wafSetupStep1').show();
            });
            $('#wafSetupModal [data-waf-dismiss]').on('click', function(e) {
                if (e.target !== this) return;
                wafCompleteOnboarding();
            });
            $('#wafSetupConnect').on('click', function() {
                var $btn = $(this);
                var $res = $('#wafSetupResult');
                var key = $('#wafSetupKey').val().trim();
                if (!key) {
                    $res.attr('class', 'waf-modal-result show').html('<div style="background:var(--war-red-light);border:1px solid #fecaca;border-radius:6px;padding:12px;color:#b91c1c;">Please enter your Website API key.</div>');
                    return;
                }
                $btn.prop('disabled', true).text('Connecting...');
                $res.attr('class', 'waf-modal-result show').html('<div style="background:var(--war-gray-50);border:1px solid var(--war-gray-300);border-radius:6px;padding:12px;color:#475569;">Connecting to MDefender-Pro cloud...</div>');
                $.post(ajaxurl + '?action=waf_fw_save_settings', JSON.stringify({
                    ml_api_key: key
                }), function(r) {
                    if (r.success && r.data.connected === true) {
                        $res.attr('class', 'waf-modal-result show').html('<div style="background:var(--war-green-light);border:1px solid #a7f3d0;border-radius:6px;padding:12px;color:#047857;"><strong>Connected!</strong> ' + (r.data.connection_message || 'Cloud service connected.') + '</div>');
                        setTimeout(wafCompleteOnboarding, 1200);
                    } else {
                        $res.attr('class', 'waf-modal-result show').html('<div style="background:var(--war-red-light);border:1px solid #fecaca;border-radius:6px;padding:12px;color:#b91c1c;"><strong>Connection failed:</strong> ' + (r.data && r.data.connection_message ? r.data.connection_message : 'Could not reach the cloud service.') + '<br><small>Check that the API key belongs to this website domain, and that the backend is reachable.</small></div>');
                        $btn.prop('disabled', false).text('Connect');
                    }
                }).fail(function() {
                    $res.attr('class', 'waf-modal-result show').html('<div style="background:var(--war-red-light);border:1px solid #fecaca;border-radius:6px;padding:12px;color:#b91c1c;">Network error. Check your server connection.</div>');
                    $btn.prop('disabled', false).text('Connect');
                });
            });
        }

        $.get(ajaxurl, {action:'waf_fw_get_settings'}, function(r) {
            if (r.success) {
                var d = r.data;
                $('#wafFwSecurityLevel').val(d.security_level);
                $('#wafFwConfidence').val(d.confidence_threshold).next('output').text(d.confidence_threshold);
                $('#wafFwRateLimit').val(d.rate_limit);
                $('#wafFwLogRetention').val(d.log_retention_days);
                $('#wafFwMlKey').val(d.ml_api_key);
                $('#wafFwCloudScope').val(d.cloud_scope || 'signal');
                $('#wafFwBlockMessage').val(d.block_message);
                $('#wafFwBlockColors').val(d.block_colors);
                $('#wafFwLoginEnabled').prop('checked', d.login_lockout_enabled === 'yes');
                $('#wafFwLoginThreshold').val(d.login_threshold);
                $('#wafFwLoginDuration').val(String(d.login_block_duration));
                $('#wafFwAttackEnabled').prop('checked', d.attack_blocker_enabled === 'yes');
                $('#wafFwAttackThreshold').val(String(d.attack_threshold));
                $('#wafFwAttackWindow').val(String(d.attack_window));
                $('#wafFwAttackDuration').val(String(d.attack_block_duration));
                $('#wafFwEmailAlerts').prop('checked', d.email_alerts === 'yes');
                $('#wafFwLearningMode').prop('checked', d.learning_mode === 'yes');
                if (d.blocked_countries !== undefined) {
                    $('#wafFwBlockedCountries').val(d.blocked_countries);
                }
                if (d.scheduled_scan_enabled !== undefined) {
                    $('#wafFwScheduleEnabled').prop('checked', d.scheduled_scan_enabled === 'yes');
                    if (d.scheduled_scan_frequency) $('#wafFwScheduleFrequency').val(d.scheduled_scan_frequency);
                    if (d.scheduled_scan_type) $('#wafFwScheduleScanType').val(d.scheduled_scan_type);
                }
                $('#wafFwProtection').prop('checked', d.protection_enabled === 'yes');
                $('#wafProtectionLabel').text('WAF Protection is ' + (d.protection_enabled === 'yes' ? 'ON' : 'OFF'));
                updateStatus(d);
                updateBlockPreview();
            }
        });

        $('#wafFwProtection').on('change', function() {
            var on = $(this).is(':checked');
            $.post(ajaxurl + '?action=waf_fw_toggle_protection', {enabled: on ? 1 : 0}, function(r) {
                if (r.success) {
                    $('#wafProtectionLabel').text('WAF Protection is ' + (r.data.enabled ? 'ON' : 'OFF'));
                    wafPill($('#wafPillProtection'), r.data.enabled ? 'Active' : 'Off', r.data.enabled ? 'on' : 'off');
                } else {
                    $('#wafFwProtection').prop('checked', !on);
                }
            }).fail(function() {
                $('#wafFwProtection').prop('checked', !on);
            });
        });

        $('#wafFwScheduleForm').on('submit', function(e) {
            e.preventDefault();
            var btn = $(this).find('button[type="submit"]');
            btn.text('Saving...').prop('disabled', true);
            $.post(ajaxurl + '?action=waf_fw_save_scheduled_scan_settings', JSON.stringify({
                enabled: $('#wafFwScheduleEnabled').is(':checked'),
                frequency: $('#wafFwScheduleFrequency').val(),
                scan_type: $('#wafFwScheduleScanType').val()
            }), function(r) {
                if (r.success) { alert('Scheduled scan settings saved'); }
                else { alert('Error: ' + (r.data.message || 'Unknown')); }
            }).always(function() {
                btn.text('Save').prop('disabled', false);
            });
        });

        $('[id$=Form]').on('submit', function(e) {
            e.preventDefault();
            var form = $(this);
            var btn = form.find('button[type="submit"]');
            btn.text('Saving...').prop('disabled', true);

            var keyMap = {
                mlUrl: 'ml_api_url',
                mlKey: 'ml_api_key',
                websiteId: 'website_id',
                cloudMode: 'cloud_mode',
                cloudScope: 'cloud_scope',
                securityLevel: 'security_level',
                confidence: 'confidence_threshold',
                rateLimit: 'rate_limit',
                logRetention: 'log_retention_days',
                loginEnabled: 'login_lockout_enabled',
                loginThreshold: 'login_threshold',
                loginDuration: 'login_block_duration',
                attackEnabled: 'attack_blocker_enabled',
                attackThreshold: 'attack_threshold',
                attackWindow: 'attack_window',
                attackDuration: 'attack_block_duration',
                blockMessage: 'block_message',
                blockColors: 'block_colors',
                emailAlerts: 'email_alerts',
                learningMode: 'learning_mode',
                blockedCountries: 'blocked_countries'
            };

            var data = {};
            form.find('input, select, textarea').each(function() {
                var $el = $(this);
                var key = $el.attr('id');
                if (!key) return;
                key = key.replace(/^wafFw/, '').replace(/^./, function(c) { return c.toLowerCase(); });
                key = keyMap[key] || key;
                if ($el.attr('type') === 'checkbox') {
                    data[key] = $el.is(':checked') ? 'yes' : 'no';
                } else if ($el.attr('type') === 'number' || $el.attr('type') === 'range') {
                    data[key] = parseFloat($el.val());
                } else {
                    data[key] = $el.val();
                }
            });

            $.post(ajaxurl + '?action=waf_fw_save_settings', JSON.stringify(data), function(r) {
                if (r.success) {
                    if (typeof r.data.connection_message !== 'undefined') {
                        alert((r.data.connected === true ? 'Connected to cloud: ' : 'Connection issue: ') + r.data.connection_message);
                    } else {
                        alert('Settings saved');
                    }
                    $.get(ajaxurl, {action:'waf_fw_get_settings'}, function(r2) {
                        if (r2.success) updateStatus(r2.data);
                    });
                }
                else { alert('Error: ' + (r.data.message || 'Unknown')); }
            }).always(function() {
                btn.text('Save').prop('disabled', false);
            });
        });
    });
    </script>
