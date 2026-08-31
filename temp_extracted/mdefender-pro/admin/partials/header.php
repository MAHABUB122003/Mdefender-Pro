<div class="war-wrap">
    <div class="war-top-bar">
        <div class="war-top-left">
            <div class="war-logo">
                <span class="war-logo-icon dashicons dashicons-shield"></span>
                <span class="war-logo-text">MDefender<span class="war-logo-highlight">-Pro</span></span>
            </div>
            <div class="war-version">v3.5</div>
        </div>
        <div class="war-top-center">
            <span class="war-top-tagline">AI/ML-Powered Web Application Firewall &amp; Malware Scanner</span>
        </div>
        <div class="war-top-right">
            <div class="war-toggle-wrap">
                <span class="war-toggle-label">Protection</span>
                <label class="war-toggle">
                    <input type="checkbox" id="warProtectionToggle" checked>
                    <span class="war-toggle-slider"></span>
                </label>
                <span class="war-toggle-status" id="warToggleStatus">Active</span>
            </div>
            <button class="war-top-btn" id="warRefreshBtn" title="Refresh Data">
                <span class="dashicons dashicons-update"></span>
            </button>
            <div class="war-notif-wrap">
                <button class="war-top-btn war-notif-btn" id="warNotifBtn" title="Notifications">
                    <span class="dashicons dashicons-bell"></span>
                    <span class="war-notif-dot"></span>
                </button>
                <div class="war-notif-panel" id="warNotifPanel">
                    <div class="war-notif-header">
                        <span>Notifications</span>
                        <span class="war-notif-count">3 new</span>
                    </div>
                    <div class="war-notif-body">
                        <div class="war-notif-item war-notif-critical">
                            <span class="dashicons dashicons-warning"></span>
                            <div class="war-notif-content">
                                <strong>Critical threat detected</strong>
                                <small>SQL Injection attempt blocked from 192.168.x.x</small>
                            </div>
                            <span class="war-notif-time">2m ago</span>
                        </div>
                        <div class="war-notif-item war-notif-warning">
                            <span class="dashicons dashicons-flag"></span>
                            <div class="war-notif-content">
                                <strong>New attack pattern</strong>
                                <small>XSS payload detected in POST request</small>
                            </div>
                            <span class="war-notif-time">15m ago</span>
                        </div>
                        <div class="war-notif-item war-notif-info">
                            <span class="dashicons dashicons-yes"></span>
                            <div class="war-notif-content">
                                <strong>System ready</strong>
                                <small>All protection layers active</small>
                            </div>
                            <span class="war-notif-time">1h ago</span>
                        </div>
                    </div>
                    <div class="war-notif-footer">
                        <a href="#">View all notifications</a>
                    </div>
                </div>
            </div>
            <div class="war-user-dropdown" id="warUserDropdown">
                <div class="war-avatar">A</div>
                <span class="war-user-name">Admin</span>
                <span class="dashicons dashicons-arrow-down"></span>
            </div>
        </div>
    </div>

    <div class="war-sub-header">
        <div class="war-breadcrumb">
            <span class="dashicons dashicons-shield"></span>
            <span>MDefender-Pro</span>
            <span class="war-breadcrumb-sep">/</span>
            <span class="war-breadcrumb-current"><?php echo get_admin_page_title() ?: 'Dashboard'; ?></span>
        </div>
        <div class="war-sub-header-right">
            <span class="war-live-indicator">
                <span class="war-live-dot"></span>
                Live
            </span>
            <span class="war-clock" id="warClock">--:--:--</span>
        </div>
    </div>
