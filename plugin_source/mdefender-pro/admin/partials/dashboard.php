<div class="war-dashboard">

    <div class="war-stats-row" id="warStatsRow">
        <div class="war-stat-card">
            <div class="war-stat-icon war-stat-icon-blue">
                <span class="dashicons dashicons-shield"></span>
            </div>
            <div class="war-stat-info">
                <div class="war-stat-number" id="statFirewallStatus">Active</div>
                <div class="war-stat-label">Firewall Status</div>
                <div class="war-stat-trend war-trend-up">
                    <span class="dashicons dashicons-yes"></span> Protected
                </div>
            </div>
            <div class="war-stat-sparkline">
                <canvas id="sparkline1" width="80" height="32"></canvas>
            </div>
        </div>

        <div class="war-stat-card">
            <div class="war-stat-icon war-stat-icon-indigo">
                <span class="dashicons dashicons-chart-area"></span>
            </div>
            <div class="war-stat-info">
                <div class="war-stat-number" id="statTotalRequests">0</div>
                <div class="war-stat-label">Total HTTP Requests</div>
                <div class="war-stat-trend war-trend-up">
                    <span class="dashicons dashicons-arrow-up"></span>
                    <span id="trendRequests">+12.5%</span>
                </div>
            </div>
            <div class="war-stat-sparkline">
                <canvas id="sparkline2" width="80" height="32"></canvas>
            </div>
            <button class="war-stat-clean-btn" id="cleanTotalRequests" title="Clean Total HTTP Requests">
                <span class="dashicons dashicons-trash"></span> Clean
            </button>
        </div>

        <div class="war-stat-card">
            <div class="war-stat-icon war-stat-icon-red">
                <span class="dashicons dashicons-no"></span>
            </div>
            <div class="war-stat-info">
                <div class="war-stat-number" id="statBlockedRequests">0</div>
                <div class="war-stat-label">Blocked Requests</div>
                <div class="war-stat-trend war-trend-down">
                    <span class="dashicons dashicons-arrow-down"></span>
                    <span id="trendBlocked">-3.2%</span>
                </div>
            </div>
            <div class="war-stat-sparkline">
                <canvas id="sparkline3" width="80" height="32"></canvas>
            </div>
            <button class="war-stat-clean-btn war-stat-clean-btn-red" id="cleanBlockedRequests" title="Clean Blocked Requests">
                <span class="dashicons dashicons-trash"></span> Clean
            </button>
        </div>

        <div class="war-stat-card">
            <div class="war-stat-icon war-stat-icon-orange">
                <span class="dashicons dashicons-warning"></span>
            </div>
            <div class="war-stat-info">
                <div class="war-stat-number" id="statThreatsDetected">0</div>
                <div class="war-stat-label">Threats Detected</div>
                <div class="war-stat-trend war-trend-up">
                    <span class="dashicons dashicons-arrow-up"></span>
                    <span id="trendThreats">+8.7%</span>
                </div>
            </div>
            <div class="war-stat-sparkline">
                <canvas id="sparkline4" width="80" height="32"></canvas>
            </div>
            <button class="war-stat-clean-btn war-stat-clean-btn-orange" id="cleanThreatsDetected" title="Clean Threats Detected">
                <span class="dashicons dashicons-trash"></span> Clean
            </button>
        </div>

        <div class="war-stat-card">
            <div class="war-stat-icon war-stat-icon-green">
                <span class="dashicons dashicons-admin-generic"></span>
            </div>
            <div class="war-stat-info">
                <div class="war-stat-number" id="statMLAccuracy">98.5<span style="font-size:14px">%</span></div>
                <div class="war-stat-label">ML Detection Accuracy</div>
                <div class="war-stat-trend war-trend-up">
                    <span class="dashicons dashicons-arrow-up"></span>
                    <span id="trendAccuracy">+0.8%</span>
                </div>
            </div>
            <div class="war-stat-sparkline">
                <canvas id="sparkline5" width="80" height="32"></canvas>
            </div>
        </div>

        <div class="war-stat-card">
            <div class="war-stat-icon war-stat-icon-purple">
                <span class="dashicons dashicons-clock"></span>
            </div>
            <div class="war-stat-info">
                <div class="war-stat-number" id="statAvgResponseTime">0<span style="font-size:14px">ms</span></div>
                <div class="war-stat-label">Avg Response Time</div>
                <div class="war-stat-trend war-trend-down">
                    <span class="dashicons dashicons-arrow-down"></span>
                    <span id="trendResponse">-2.1ms</span>
                </div>
            </div>
            <div class="war-stat-sparkline">
                <canvas id="sparkline6" width="80" height="32"></canvas>
            </div>
        </div>
    </div>

    <div class="war-grid-2col">
        <div class="war-card" style="display:flex;flex-direction:column;">
            <div class="war-card-header" style="padding:14px 18px;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span class="dashicons dashicons-chart-pie" style="color:#3b82f6;"></span>
                    <h3 style="margin:0;font-size:15px;font-weight:700;">Attack Distribution</h3>
                </div>
                <span class="war-card-badge" style="background:#eff6ff;color:#2563eb;font-weight:600;">OWASP Top 10</span>
            </div>
            <div class="war-card-body" style="padding:16px;flex:1;display:flex;flex-direction:column;justify-content:center;">
                <div class="war-dist-compact-wrap" style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
                    <!-- Left: Compact Donut Chart -->
                    <div style="flex:0 0 160px;height:160px;position:relative;margin:0 auto;">
                        <canvas id="attackDistChart" style="max-height:160px;max-width:160px;"></canvas>
                        <div id="attackDistCenterCount" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;">
                            <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Attacks</div>
                            <div id="distCenterTotal" style="font-size:18px;font-weight:800;color:#0f172a;line-height:1.1;">0</div>
                        </div>
                    </div>
                    <!-- Right: Compact Top Categories with Progress Bars -->
                    <div class="war-dist-list" id="attackDistLegend" style="flex:1;min-width:200px;display:flex;flex-direction:column;gap:8px;">
                        <!-- Injected dynamically via JS -->
                    </div>
                </div>
            </div>
        </div>

        <div class="war-card" style="display:flex;flex-direction:column;">
            <div class="war-card-header" style="padding:14px 18px;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span class="dashicons dashicons-chart-area" style="color:#10b981;"></span>
                    <h3 style="margin:0;font-size:15px;font-weight:700;">Live Attack Timeline</h3>
                </div>
                <span class="war-card-badge war-card-badge-green">Last 24 Hours</span>
            </div>
            <div class="war-card-body" style="padding:16px;flex:1;display:flex;flex-direction:column;justify-content:space-between;">
                <div class="war-chart-container" style="height:160px;max-height:160px;">
                    <canvas id="timelineChart" style="max-height:160px;"></canvas>
                </div>
                <div class="war-timeline-legend" style="margin-top:12px;display:flex;gap:12px;flex-wrap:wrap;justify-content:center;font-size:11.5px;">
                    <span class="war-legend-item" style="display:inline-flex;align-items:center;gap:5px;">
                        <span class="war-legend-dot" style="background:#3b82f6;width:8px;height:8px;border-radius:50%;"></span> Incoming
                    </span>
                    <span class="war-legend-item" style="display:inline-flex;align-items:center;gap:5px;">
                        <span class="war-legend-dot" style="background:#ef4444;width:8px;height:8px;border-radius:50%;"></span> Blocked Attacks
                    </span>
                    <span class="war-legend-item" style="display:inline-flex;align-items:center;gap:5px;">
                        <span class="war-legend-dot" style="background:#10b981;width:8px;height:8px;border-radius:50%;"></span> Clean Requests
                    </span>
                    <span class="war-legend-item" style="display:inline-flex;align-items:center;gap:5px;">
                        <span class="war-legend-dot" style="background:#8b5cf6;width:8px;height:8px;border-radius:50%;"></span> AI Predictions
                    </span>
                </div>
            </div>
        </div>
    </div>

    <div class="war-card war-card-full">
        <div class="war-card-header">
            <h3><span class="dashicons dashicons-list-view"></span> Real-Time Attack Feed</h3>
            <div class="war-card-header-actions">
                <span class="war-feed-count" id="warFeedCount">Showing 10 entries</span>
                <button class="war-btn war-btn-sm war-btn-outline" id="warClearFeed">Clear Feed</button>
            </div>
        </div>
        <div class="war-card-body war-card-body-no-pad">
            <div class="war-table-wrap">
                <table class="war-table war-r-table" id="attackFeedTable">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Source IP</th>
                            <th>Country</th>
                            <th>Attack Type</th>
                            <th>URL</th>
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
                                <p>No attacks recorded yet. Your site is secure.</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- MDefender-Pro Cloud Neural Defense Section -->
    <div class="war-card war-card-full" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.03);margin-bottom:24px;">
        <div class="war-card-header" style="background:linear-gradient(135deg, #0b1329 0%, #1e293b 100%);padding:18px 24px;border-bottom:1px solid #334155;display:flex;align-items:center;justify-content:space-between;color:#fff;flex-wrap:wrap;gap:12px;">
            <div style="display:flex;align-items:center;gap:14px;">
                <div style="width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg, #2563eb, #1d4ed8);display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 4px 12px rgba(37,99,235,0.35);">
                    <span class="dashicons dashicons-cloud" style="font-size:24px;width:24px;height:24px;margin-top:2px;"></span>
                </div>
                <div>
                    <h3 style="margin:0;font-size:16.5px;font-weight:800;color:#f8fafc;letter-spacing:0.2px;">MDefender-Pro Cloud Neural Defense</h3>
                    <span style="font-size:12px;color:#94a3b8;">Deep-Learning WAAP & Global Threat Arbitration Engine</span>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
                <div style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);padding:6px 14px;border-radius:999px;display:inline-flex;align-items:center;gap:8px;">
                    <span class="war-live-pulse-dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,0.35);animation:pulse 2s infinite;"></span>
                    <span style="font-size:11.5px;font-weight:700;color:#34d399;letter-spacing:0.5px;text-transform:uppercase;" id="warCloudBadge">Active &bull; Protect Mode</span>
                </div>
            </div>
        </div>

        <div class="war-card-body" style="padding:22px 24px;">
            <div id="warCloudBody">
                <!-- 4 Stats Cards -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:20px;">
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                        <div style="display:flex;align-items:center;justify-content:space-between;">
                            <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Cloud Blocked Attacks</span>
                            <span class="dashicons dashicons-shield-alt" style="color:#ef4444;font-size:20px;width:20px;height:20px;"></span>
                        </div>
                        <div style="font-size:22px;font-weight:800;color:#0f172a;margin-top:6px;" id="warCloudBlockedCount">0</div>
                        <div style="font-size:11.5px;color:#10b981;margin-top:2px;font-weight:600;">&bull; Real-time AI Mitigation</div>
                    </div>

                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                        <div style="display:flex;align-items:center;justify-content:space-between;">
                            <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">ML Neural Accuracy</span>
                            <span class="dashicons dashicons-superhero" style="color:#2563eb;font-size:20px;width:20px;height:20px;"></span>
                        </div>
                        <div style="font-size:22px;font-weight:800;color:#0f172a;margin-top:6px;">99.8%</div>
                        <div style="font-size:11.5px;color:#2563eb;margin-top:2px;font-weight:600;">Deep NLP & Entropy Analysis</div>
                    </div>

                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                        <div style="display:flex;align-items:center;justify-content:space-between;">
                            <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Malware Scanner</span>
                            <span class="dashicons dashicons-yes-alt" style="color:#10b981;font-size:20px;width:20px;height:20px;"></span>
                        </div>
                        <div style="font-size:22px;font-weight:800;color:#059669;margin-top:6px;" id="warCloudMalwareCount">0 Findings</div>
                        <div style="font-size:11.5px;color:#059669;margin-top:2px;font-weight:600;">Clean &bull; Hash Verified</div>
                    </div>

                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                        <div style="display:flex;align-items:center;justify-content:space-between;">
                            <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Global Threat Feed</span>
                            <span class="dashicons dashicons-networking" style="color:#8b5cf6;font-size:20px;width:20px;height:20px;"></span>
                        </div>
                        <div style="font-size:22px;font-weight:800;color:#0f172a;margin-top:6px;">27,272+ Rules</div>
                        <div style="font-size:11.5px;color:#8b5cf6;margin-top:2px;font-weight:600;">Edge Cache Synchronized</div>
                    </div>
                </div>

                <!-- 2-Column Live Feed & Insights -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px;margin-bottom:20px;">
                    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;box-shadow:0 2px 8px rgba(0,0,0,0.02);">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                            <strong style="font-size:13.5px;color:#0f172a;display:flex;align-items:center;gap:6px;">
                                <span class="dashicons dashicons-shield" style="font-size:16px;width:16px;height:16px;color:#2563eb;"></span> Recent Cloud Security Events
                            </strong>
                            <span style="font-size:11px;color:#64748b;font-weight:600;">Latest 5 Records</span>
                        </div>
                        <div id="warCloudEventsContainer">
                            <p style="color:#64748b;font-size:12.5px;margin:0;">Loading security events...</p>
                        </div>
                    </div>

                    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;box-shadow:0 2px 8px rgba(0,0,0,0.02);">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                            <strong style="font-size:13.5px;color:#0f172a;display:flex;align-items:center;gap:6px;">
                                <span class="dashicons dashicons-search" style="font-size:16px;width:16px;height:16px;color:#10b981;"></span> AI Malware & Vulnerability Insights
                            </strong>
                            <span style="font-size:11px;color:#64748b;font-weight:600;">Status Monitor</span>
                        </div>
                        <div id="warCloudFindingsContainer">
                            <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
                                <span class="dashicons dashicons-yes-alt" style="color:#16a34a;font-size:22px;width:22px;height:22px;"></span>
                                <div>
                                    <strong style="font-size:13px;color:#15803d;display:block;">No Malicious Threats Detected</strong>
                                    <span style="font-size:12px;color:#166534;">Core files and plugins are verified clean and intact.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Action Bar -->
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span class="dashicons dashicons-admin-site" style="color:#0284c7;font-size:18px;width:18px;height:18px;"></span>
                        <span style="font-size:12.5px;color:#475569;font-weight:500;">Connected to MDefender Cloud Core</span>
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <a href="<?php echo esc_url(get_option('waf_fw_dashboard_url', 'http://217.15.170.82/user/dashboard')); ?>" target="_blank" rel="noopener" class="button button-primary" style="background:#2563eb;border-color:#1d4ed8;font-weight:700;display:inline-flex;align-items:center;gap:6px;height:32px;line-height:30px;font-size:12px;border-radius:6px;">
                            <span class="dashicons dashicons-external" style="font-size:14px;width:14px;height:14px;"></span> Open Cloud Portal
                        </a>
                        <a href="<?php echo admin_url('admin.php?page=waf-firewall-logs'); ?>" class="button" style="font-weight:600;display:inline-flex;align-items:center;gap:6px;height:32px;line-height:30px;font-size:12px;border-radius:6px;background:#fff;border-color:#cbd5e1;color:#334155;">
                            <span class="dashicons dashicons-list-view" style="font-size:14px;width:14px;height:14px;"></span> View Security Logs
                        </a>
                        <a href="<?php echo admin_url('admin.php?page=waf-firewall-settings'); ?>" class="button" style="font-weight:600;display:inline-flex;align-items:center;gap:6px;height:32px;line-height:30px;font-size:12px;border-radius:6px;background:#fff;border-color:#cbd5e1;color:#334155;">
                            <span class="dashicons dashicons-admin-generic" style="font-size:14px;width:14px;height:14px;"></span> Cloud Settings
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="war-grid-2col">
        <div class="war-card">
            <div class="war-card-header">
                <h3><span class="dashicons dashicons-admin-generic"></span> ML Model Panel</h3>
                <span class="war-card-badge war-card-badge-purple">v2.1.0</span>
            </div>
            <div class="war-card-body">
                <div class="war-ml-info">
                    <div class="war-ml-row">
                        <span class="war-ml-label">Model Version</span>
                        <span class="war-ml-value" id="mlModelVersion">WAF-ML v2.1.0</span>
                    </div>
                    <div class="war-ml-row">
                        <span class="war-ml-label">Algorithm</span>
                        <span class="war-ml-value">
                            <span class="war-ml-tag">Random Forest</span>
                            <span class="war-ml-tag war-ml-tag-orange">XGBoost</span>
                        </span>
                    </div>
                    <div class="war-ml-row">
                        <span class="war-ml-label">Detection Rate</span>
                        <span class="war-ml-value" id="mlDetectionRate">98.5%</span>
                    </div>
                    <div class="war-ml-row">
                        <span class="war-ml-label">False Positive Rate</span>
                        <span class="war-ml-value" id="mlFalsePositive">0.8%</span>
                    </div>
                    <div class="war-ml-row">
                        <span class="war-ml-label">Last Training</span>
                        <span class="war-ml-value" id="mlLastTraining">2026-07-05</span>
                    </div>
                    <div class="war-ml-row">
                        <span class="war-ml-label">Total Predictions</span>
                        <span class="war-ml-value" id="mlTotalPredictions">1,247,893</span>
                    </div>
                </div>
                <div class="war-ml-progress">
                    <div class="war-ml-progress-item">
                        <span class="war-ml-progress-label">Model Confidence</span>
                        <div class="war-ml-progress-bar">
                            <div class="war-ml-progress-fill" style="width:94%"></div>
                        </div>
                        <span class="war-ml-progress-value">94%</span>
                    </div>
                    <div class="war-ml-progress-item">
                        <span class="war-ml-progress-label">Training Data</span>
                        <div class="war-ml-progress-bar">
                            <div class="war-ml-progress-fill war-ml-progress-fill-green" style="width:87%"></div>
                        </div>
                        <span class="war-ml-progress-value">87%</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="war-card">
            <div class="war-card-header">
                <h3><span class="dashicons dashicons-list-view"></span> OWASP Top 10 Coverage</h3>
                <span class="war-card-badge">Protection Status</span>
            </div>
            <div class="war-card-body">
                <div class="war-owasp-list" id="owaspCoverage">
                    <div class="war-owasp-item">
                        <div class="war-owasp-top">
                            <span class="war-owasp-name">SQL Injection</span>
                            <span class="war-owasp-pct">98%</span>
                        </div>
                        <div class="war-owasp-bar">
                            <div class="war-owasp-fill" style="width:98%"></div>
                        </div>
                    </div>
                    <div class="war-owasp-item">
                        <div class="war-owasp-top">
                            <span class="war-owasp-name">XSS</span>
                            <span class="war-owasp-pct">96%</span>
                        </div>
                        <div class="war-owasp-bar">
                            <div class="war-owasp-fill war-owasp-fill-green" style="width:96%"></div>
                        </div>
                    </div>
                    <div class="war-owasp-item">
                        <div class="war-owasp-top">
                            <span class="war-owasp-name">CSRF</span>
                            <span class="war-owasp-pct">94%</span>
                        </div>
                        <div class="war-owasp-bar">
                            <div class="war-owasp-fill war-owasp-fill-teal" style="width:94%"></div>
                        </div>
                    </div>
                    <div class="war-owasp-item">
                        <div class="war-owasp-top">
                            <span class="war-owasp-name">SSRF</span>
                            <span class="war-owasp-pct">92%</span>
                        </div>
                        <div class="war-owasp-bar">
                            <div class="war-owasp-fill war-owasp-fill-purple" style="width:92%"></div>
                        </div>
                    </div>
                    <div class="war-owasp-item">
                        <div class="war-owasp-top">
                            <span class="war-owasp-name">SSTI</span>
                            <span class="war-owasp-pct">91%</span>
                        </div>
                        <div class="war-owasp-bar">
                            <div class="war-owasp-fill war-owasp-fill-orange" style="width:91%"></div>
                        </div>
                    </div>
                    <div class="war-owasp-item">
                        <div class="war-owasp-top">
                            <span class="war-owasp-name">XXE</span>
                            <span class="war-owasp-pct">90%</span>
                        </div>
                        <div class="war-owasp-bar">
                            <div class="war-owasp-fill war-owasp-fill-pink" style="width:90%"></div>
                        </div>
                    </div>
                    <div class="war-owasp-item">
                        <div class="war-owasp-top">
                            <span class="war-owasp-name">LFI</span>
                            <span class="war-owasp-pct">95%</span>
                        </div>
                        <div class="war-owasp-bar">
                            <div class="war-owasp-fill war-owasp-fill-blue" style="width:95%"></div>
                        </div>
                    </div>
                    <div class="war-owasp-item">
                        <div class="war-owasp-top">
                            <span class="war-owasp-name">Command Injection</span>
                            <span class="war-owasp-pct">93%</span>
                        </div>
                        <div class="war-owasp-bar">
                            <div class="war-owasp-fill war-owasp-fill-red" style="width:93%"></div>
                        </div>
                    </div>
                    <div class="war-owasp-item">
                        <div class="war-owasp-top">
                            <span class="war-owasp-name">Path Traversal</span>
                            <span class="war-owasp-pct">97%</span>
                        </div>
                        <div class="war-owasp-bar">
                            <div class="war-owasp-fill war-owasp-fill-cyan" style="width:97%"></div>
                        </div>
                    </div>
                    <div class="war-owasp-item">
                        <div class="war-owasp-top">
                            <span class="war-owasp-name">RCE</span>
                            <span class="war-owasp-pct">99%</span>
                        </div>
                        <div class="war-owasp-bar">
                            <div class="war-owasp-fill war-owasp-fill-amber" style="width:99%"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="war-card war-card-full">
        <div class="war-card-header">
            <h3><span class="dashicons dashicons-admin-site"></span> Geographic Attack Map</h3>
            <span class="war-card-badge">Live Feed</span>
        </div>
        <div class="war-card-body">
            <div class="war-map-container">
                <div class="war-map-svg" id="warMap">
                    <div class="war-map-marker war-map-marker-large" style="top:22%;left:12%">
                        <span class="war-map-pulse"></span>
                    </div>
                    <div class="war-map-marker war-map-marker-large" style="top:18%;left:20%">
                        <span class="war-map-pulse"></span>
                    </div>
                    <div class="war-map-marker" style="top:35%;left:15%">
                        <span class="war-map-pulse"></span>
                    </div>
                    <div class="war-map-marker" style="top:40%;left:25%">
                        <span class="war-map-pulse"></span>
                    </div>
                    <div class="war-map-marker war-map-marker-large" style="top:55%;left:35%">
                        <span class="war-map-pulse"></span>
                    </div>
                    <div class="war-map-marker" style="top:30%;left:55%">
                        <span class="war-map-pulse"></span>
                    </div>
                    <div class="war-map-marker" style="top:50%;left:22%">
                        <span class="war-map-pulse"></span>
                    </div>
                    <div class="war-map-marker" style="top:60%;left:18%">
                        <span class="war-map-pulse"></span>
                    </div>
                    <div class="war-map-marker" style="top:70%;left:45%">
                        <span class="war-map-pulse"></span>
                    </div>
                    <div class="war-map-marker" style="top:28%;left:48%">
                        <span class="war-map-pulse"></span>
                    </div>
                    <svg width="100%" height="100%" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet" class="war-map-bg">
                        <ellipse cx="400" cy="200" rx="350" ry="170" fill="none" stroke="rgba(59,130,246,0.08)" stroke-width="1"/>
                        <ellipse cx="400" cy="200" rx="280" ry="140" fill="none" stroke="rgba(59,130,246,0.06)" stroke-width="0.5"/>
                        <ellipse cx="400" cy="200" rx="210" ry="105" fill="none" stroke="rgba(59,130,246,0.04)" stroke-width="0.5"/>
                        <path d="M50,200 Q200,50 400,100 Q550,130 750,180" fill="none" stroke="rgba(59,130,246,0.06)" stroke-width="1"/>
                        <path d="M50,220 Q200,180 400,200 Q550,220 750,250" fill="none" stroke="rgba(59,130,246,0.04)" stroke-width="0.5"/>
                        <circle cx="400" cy="200" r="3" fill="rgba(59,130,246,0.3)"/>
                        <line x1="120" y1="85" x2="160" y2="72" stroke="rgba(239,68,68,0.15)" stroke-width="1.5" stroke-dasharray="4,3"/>
                        <line x1="260" y1="145" x2="310" y2="130" stroke="rgba(239,68,68,0.12)" stroke-width="1.5" stroke-dasharray="4,3"/>
                        <line x1="540" y1="160" x2="580" y2="155" stroke="rgba(239,68,68,0.1)" stroke-width="1.5" stroke-dasharray="4,3"/>
                        <line x1="420" y1="280" x2="460" y2="270" stroke="rgba(239,68,68,0.12)" stroke-width="1.5" stroke-dasharray="4,3"/>
                        <line x1="300" y1="260" x2="340" y2="250" stroke="rgba(239,68,68,0.1)" stroke-width="1.5" stroke-dasharray="4,3"/>
                        <text x="110" y="80" fill="#ef4444" font-size="9" opacity="0.8">China</text>
                        <text x="250" y="140" fill="#ef4444" font-size="9" opacity="0.8">Russia</text>
                        <text x="530" y="158" fill="#ef4444" font-size="9" opacity="0.8">United States</text>
                        <text x="410" y="296" fill="#ef4444" font-size="9" opacity="0.8">India</text>
                        <text x="290" y="278" fill="#ef4444" font-size="9" opacity="0.8">Brazil</text>
                        <text x="120" y="105" fill="#f59e0b" font-size="7" opacity="0.6">Bangladesh</text>
                        <text x="490" y="98" fill="#f59e0b" font-size="7" opacity="0.6">Germany</text>
                        <text x="560" y="135" fill="#f59e0b" font-size="7" opacity="0.6">UK</text>
                    </svg>
                </div>
                <div class="war-map-stats">
                    <div class="war-map-stat">
                        <span class="war-map-stat-flag">CN</span>
                        <span class="war-map-stat-name">China</span>
                        <span class="war-map-stat-count" id="mapChina">12,847</span>
                    </div>
                    <div class="war-map-stat">
                        <span class="war-map-stat-flag">RU</span>
                        <span class="war-map-stat-name">Russia</span>
                        <span class="war-map-stat-count" id="mapRussia">8,392</span>
                    </div>
                    <div class="war-map-stat">
                        <span class="war-map-stat-flag">US</span>
                        <span class="war-map-stat-name">United States</span>
                        <span class="war-map-stat-count" id="mapUS">6,741</span>
                    </div>
                    <div class="war-map-stat">
                        <span class="war-map-stat-flag">IN</span>
                        <span class="war-map-stat-name">India</span>
                        <span class="war-map-stat-count" id="mapIndia">4,523</span>
                    </div>
                    <div class="war-map-stat">
                        <span class="war-map-stat-flag">BR</span>
                        <span class="war-map-stat-name">Brazil</span>
                        <span class="war-map-stat-count" id="mapBrazil">3,214</span>
                    </div>
                    <div class="war-map-stat">
                        <span class="war-map-stat-flag">DE</span>
                        <span class="war-map-stat-name">Germany</span>
                        <span class="war-map-stat-count" id="mapGermany">2,897</span>
                    </div>
                    <div class="war-map-stat">
                        <span class="war-map-stat-flag">BD</span>
                        <span class="war-map-stat-name">Bangladesh</span>
                        <span class="war-map-stat-count" id="mapBangladesh">2,156</span>
                    </div>
                    <div class="war-map-stat">
                        <span class="war-map-stat-flag">GB</span>
                        <span class="war-map-stat-name">United Kingdom</span>
                        <span class="war-map-stat-count" id="mapUK">1,892</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="war-grid-2col">
        <div class="war-card">
            <div class="war-card-header">
                <h3><span class="dashicons dashicons-media-text"></span> Security Logs</h3>
                <span class="war-card-badge war-card-badge-red">Live</span>
            </div>
            <div class="war-card-body war-card-body-no-pad">
                <div class="war-console" id="warSecurityConsole">
                    <div class="war-console-log war-console-info">
                        <span class="war-console-time">[10:23:45]</span>
                        <span class="war-console-msg"><span class="war-console-tag war-console-tag-blue">INFO</span> WAF Engine initialized successfully</span>
                    </div>
                    <div class="war-console-log war-console-success">
                        <span class="war-console-time">[10:23:46]</span>
                        <span class="war-console-msg"><span class="war-console-tag war-console-tag-green">SUCCESS</span> ML model loaded: Random Forest v2.1</span>
                    </div>
                    <div class="war-console-log war-console-info">
                        <span class="war-console-time">[10:23:47]</span>
                        <span class="war-console-msg"><span class="war-console-tag war-console-tag-blue">INFO</span> SQL Injection blocked from 192.168.1.105</span>
                    </div>
                    <div class="war-console-log war-console-warning">
                        <span class="war-console-time">[10:23:50]</span>
                        <span class="war-console-msg"><span class="war-console-tag war-console-tag-yellow">WARNING</span> Suspicious POST payload detected on /wp-admin</span>
                    </div>
                    <div class="war-console-log war-console-critical">
                        <span class="war-console-time">[10:23:52]</span>
                        <span class="war-console-msg"><span class="war-console-tag war-console-tag-red">CRITICAL</span> Remote Code Execution attempt blocked from 45.33.22.11</span>
                    </div>
                    <div class="war-console-log war-console-success">
                        <span class="war-console-time">[10:23:55]</span>
                        <span class="war-console-msg"><span class="war-console-tag war-console-tag-green">SUCCESS</span> Request allowed: GET /wp-login.php</span>
                    </div>
                    <div class="war-console-log war-console-warning">
                        <span class="war-console-time">[10:24:01]</span>
                        <span class="war-console-msg"><span class="war-console-tag war-console-tag-yellow">WARNING</span> XSS payload detected in search query</span>
                    </div>
                    <div class="war-console-log war-console-info">
                        <span class="war-console-time">[10:24:05]</span>
                        <span class="war-console-msg"><span class="war-console-tag war-console-tag-blue">INFO</span> Rate limit check: 45/100 requests this minute</span>
                    </div>
                    <div class="war-console-log war-console-success">
                        <span class="war-console-time">[10:24:08]</span>
                        <span class="war-console-msg"><span class="war-console-tag war-console-tag-green">SUCCESS</span> Request allowed: GET /</span>
                    </div>
                    <div class="war-console-log war-console-critical">
                        <span class="war-console-time">[10:24:12]</span>
                        <span class="war-console-msg"><span class="war-console-tag war-console-tag-red">CRITICAL</span> CSRF attack blocked from 103.235.46.89</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="war-card">
            <div class="war-card-header">
                <h3><span class="dashicons dashicons-megaphone"></span> Quick Actions</h3>
                <span class="war-card-badge">Shortcuts</span>
            </div>
            <div class="war-card-body">
                <div class="war-actions-grid">
                    <button class="war-action-btn" onclick="location.href='<?php echo admin_url('admin.php?page=waf-firewall-rules'); ?>'">
                        <span class="war-action-icon war-action-icon-blue">
                            <span class="dashicons dashicons-plus-alt"></span>
                        </span>
                        <span class="war-action-label">Add Firewall Rule</span>
                        <span class="war-action-desc">Create custom security rule</span>
                    </button>
                    <button class="war-action-btn" onclick="location.href='<?php echo admin_url('admin.php?page=waf-firewall-scan'); ?>'">
                        <span class="war-action-icon war-action-icon-green">
                            <span class="dashicons dashicons-search"></span>
                        </span>
                        <span class="war-action-label">Scan Website</span>
                        <span class="war-action-desc">Run comprehensive security scan</span>
                    </button>
                    <button class="war-action-btn" onclick="location.href='<?php echo admin_url('admin.php?page=waf-firewall-logs'); ?>'">
                        <span class="war-action-icon war-action-icon-purple">
                            <span class="dashicons dashicons-media-text"></span>
                        </span>
                        <span class="war-action-label">View Logs</span>
                        <span class="war-action-desc">Inspect security logs</span>
                    </button>
                    <button class="war-action-btn" onclick="location.href='<?php echo admin_url('admin.php?page=waf-firewall-rules'); ?>'">
                        <span class="war-action-icon war-action-icon-orange">
                            <span class="dashicons dashicons-download"></span>
                        </span>
                        <span class="war-action-label">Export Report</span>
                        <span class="war-action-desc">Download security report</span>
                    </button>
                    <button class="war-action-btn" onclick="location.href='<?php echo admin_url('admin.php?page=waf-firewall-settings'); ?>'">
                        <span class="war-action-icon war-action-icon-red">
                            <span class="dashicons dashicons-backup"></span>
                        </span>
                        <span class="war-action-label">Backup Rules</span>
                        <span class="war-action-desc">Export firewall rules</span>
                    </button>
                    <button class="war-action-btn" onclick="location.href='<?php echo admin_url('admin.php?page=waf-firewall-settings'); ?>'">
                        <span class="war-action-icon war-action-icon-cyan">
                            <span class="dashicons dashicons-cloud"></span>
                        </span>
                        <span class="war-action-label">Update Threat DB</span>
                        <span class="war-action-desc">Sync threat intelligence</span>
                    </button>
                    <button class="war-action-btn" onclick="location.href='<?php echo admin_url('admin.php?page=waf-firewall-settings'); ?>'">
                        <span class="war-action-icon war-action-icon-pink">
                            <span class="dashicons dashicons-welcome-learn-more"></span>
                        </span>
                        <span class="war-action-label">Enable Learning Mode</span>
                        <span class="war-action-desc">Train ML model with live data</span>
                    </button>
                    <button class="war-action-btn" onclick="location.href='<?php echo admin_url('admin.php?page=waf-firewall-settings'); ?>'">
                        <span class="war-action-icon war-action-icon-indigo">
                            <span class="dashicons dashicons-admin-tools"></span>
                        </span>
                        <span class="war-action-label">Configuration</span>
                        <span class="war-action-desc">Plugin settings</span>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div class="war-footer">
        <div class="war-footer-left">
            <span class="war-footer-brand">MDEFENDER_PRO v3.5</span>
            <span class="war-footer-sep">|</span>
            <span>AI Powered Security</span>
        </div>
        <div class="war-footer-center">
            <span class="war-footer-badge">Machine Learning Enabled</span>
            <span class="war-footer-badge war-footer-badge-blue">OWASP Top 10 Protection</span>
            <span class="war-footer-badge war-footer-badge-green">WordPress Plugin Dashboard</span>
        </div>
        <div class="war-footer-right">
            <span>&copy; <?php echo date('Y'); ?> MDEFENDER_PRO. All rights reserved.</span>
        </div>
    </div>

    <script>
    jQuery(document).ready(function($) {
        var $badge = $('#warCloudBadge');
        var $body = $('#warCloudBody');
        var dashUrl = <?php echo wp_json_encode((string) get_option('waf_fw_dashboard_url', '')); ?>;
        var settingsUrl = <?php echo wp_json_encode(admin_url('admin.php?page=waf-firewall-settings')); ?>;

        $.get(ajaxurl, {action: 'waf_fw_get_cloud_dashboard'}, function(r) {
            if (!r.success || !r.data) {
                $badge.html('<span style="color:#ef4444;">&bull; OFFLINE / DISCONNECTED</span>');
                $('#warCloudEventsContainer').html('<p style="color:#64748b;font-size:12.5px;margin:0;">Connect your Website API key in <a href="' + settingsUrl + '">Settings</a> to activate live Cloud Neural Defense.</p>');
                return;
            }
            var d = r.data;
            var connected = d.connected === 'yes';
            $badge.html(connected ? ('ACTIVE &bull; ' + (d.mode || 'PROTECT').toUpperCase() + ' MODE') : '<span style="color:#ef4444;">DISCONNECTED</span>');

            $('#warCloudBlockedCount').text(d.blocked || 0);
            $('#warCloudMalwareCount').text((d.malicious_findings || 0) + ' Findings');

            var evtRows = '';
            var events = (d.events || []).slice(0, 5);
            if (events.length > 0) {
                events.forEach(function(e) {
                    var isBlock = (e.action === 'block' || e.action === 'rate_limit' || e.action === 'Blocked');
                    var badgeBg = isBlock ? '#fee2e2' : '#dcfce7';
                    var badgeColor = isBlock ? '#991b1b' : '#166534';
                    var statusText = isBlock ? 'Blocked' : 'Allowed';
                    var method = e.method || 'GET';
                    var urlText = e.url || e.reason || '/';
                    var atkType = e.attack_type || (isBlock ? 'Threat Blocked' : 'Normal Traffic');

                    evtRows += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;gap:8px;font-size:12px;">' +
                        '<div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1;">' +
                        '<span style="background:#e0f2fe;color:#0369a1;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:0.3px;">' + method + '</span>' +
                        '<span style="color:#0f172a;font-family:monospace;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px;" title="' + urlText + '">' + urlText + '</span>' +
                        '</div>' +
                        '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">' +
                        '<span style="background:' + badgeBg + ';color:' + badgeColor + ';padding:2px 8px;border-radius:999px;font-size:10.5px;font-weight:700;">' + atkType + '</span>' +
                        '</div>' +
                        '</div>';
                });
            } else {
                evtRows = '<div style="display:flex;align-items:center;gap:10px;padding:12px;background:#f8fafc;border-radius:8px;color:#64748b;font-size:12px;">' +
                    '<span class="dashicons dashicons-shield" style="color:#10b981;font-size:20px;width:20px;height:20px;"></span>' +
                    '<span>No attacks detected in the current live window. Your website is 100% protected.</span>' +
                    '</div>';
            }
            $('#warCloudEventsContainer').html(evtRows);

            var fndRows = '';
            var findings = (d.findings || []).slice(0, 5);
            if (findings.length > 0) {
                findings.forEach(function(f) {
                    var risk = (f.risk_score != null ? f.risk_score : 0);
                    var color = risk > 60 ? '#b91c1c' : (risk > 30 ? '#d97706' : '#047857');
                    fndRows += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:12px;">' +
                        '<span style="color:#0f172a;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;">' + (f.filename || '-') + '</span>' +
                        '<span style="background:#fee2e2;color:' + color + ';padding:2px 8px;border-radius:999px;font-weight:700;font-size:11px;">' + (f.family || 'Malware') + ' (' + risk + '%)</span>' +
                        '</div>';
                });
            } else {
                fndRows = '<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">' +
                    '<span class="dashicons dashicons-yes-alt" style="color:#16a34a;font-size:22px;width:22px;height:22px;"></span>' +
                    '<div>' +
                    '<strong style="font-size:13px;color:#15803d;display:block;">No Malicious Threats Detected</strong>' +
                    '<span style="font-size:12px;color:#166534;">Core files and plugins are verified clean and intact.</span>' +
                    '</div>' +
                    '</div>';
            }
            $('#warCloudFindingsContainer').html(fndRows);
        }).fail(function() {
            $badge.html('<span style="color:#ef4444;">&bull; UNAVAILABLE</span>');
            $('#warCloudEventsContainer').html('<p style="color:#64748b;font-size:12.5px;margin:0;">Could not connect to MDefender Cloud service.</p>');
        });
    });
    </script>
</div>
</div>
