jQuery(document).ready(function($) {
    // CSRF protection: transparently attach the plugin nonce to every
    // MDefender-Pro AJAX request so the server-side check can validate it.
    if (typeof waf_fw_ajax !== 'undefined' && waf_fw_ajax.nonce) {
        $.ajaxPrefilter(function(options, originalOptions, jqXHR) {
            var action = options.data ? (options.data.action || '') : '';
            if (!action && options.url) {
                var m = /[?&]action=([^&]+)/.exec(options.url);
                if (m) action = decodeURIComponent(m[1]);
            }
            if (/^(waf_fw_|waf_harden_)/.test(action || '')) {
                if (options.data) {
                    var d = options.data;
                    if (typeof d === 'string') {
                        if (!/^\s*[\{\[]/.test(d) && d.indexOf('nonce=') === -1) {
                            options.data = d + '&nonce=' + encodeURIComponent(waf_fw_ajax.nonce);
                        }
                    } else if (typeof d === 'object' && d !== null) {
                        d.nonce = waf_fw_ajax.nonce;
                    }
                }
                if (options.url && options.url.indexOf('action=') !== -1 && !/nonce=/.test(options.url)) {
                    options.url += (options.url.indexOf('?') === -1 ? '?' : '&') + 'nonce=' + encodeURIComponent(waf_fw_ajax.nonce);
                }
            }
        });
    }

    // Modal close handling
    $(document).on('click', '.waf-fw-modal-close, .waf-fw-modal', function(e) {
        if ($(e.target).hasClass('waf-fw-modal') || $(e.target).hasClass('waf-fw-modal-close')) {
            $(this).closest('.waf-fw-modal').hide();
        }
    });

    // 1. Live Header Clock
    var clockEl = document.getElementById('warClock');
    if (clockEl) {
        function updateClock() {
            var now = new Date();
            var h = String(now.getHours()).padStart(2, '0');
            var m = String(now.getMinutes()).padStart(2, '0');
            var s = String(now.getSeconds()).padStart(2, '0');
            clockEl.textContent = h + ':' + m + ':' + s;
        }
        updateClock();
        setInterval(updateClock, 1000);
    }

    // 2. Master Protection Toggle
    var toggle = document.getElementById('warProtectionToggle');
    var toggleStatus = document.getElementById('warToggleStatus');
    if (toggle && toggleStatus) {
        toggle.addEventListener('change', function() {
            var isEnabled = this.checked ? 1 : 0;
            toggleStatus.textContent = isEnabled ? 'Updating...' : 'Disabling...';
            
            $.post(ajaxurl, {
                action: 'waf_fw_toggle_protection',
                enabled: isEnabled,
                nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
            }, function(resp) {
                if (resp && resp.success) {
                    if (isEnabled) {
                        toggleStatus.textContent = 'Active';
                        toggleStatus.className = 'war-toggle-status status-active';
                    } else {
                        toggleStatus.textContent = 'Inactive';
                        toggleStatus.className = 'war-toggle-status status-inactive';
                    }
                } else {
                    alert('Could not update protection status: ' + (resp && resp.data ? resp.data : 'Server error'));
                    toggle.checked = !isEnabled;
                    toggleStatus.textContent = !isEnabled ? 'Active' : 'Inactive';
                }
            }).fail(function() {
                toggle.checked = !isEnabled;
                toggleStatus.textContent = !isEnabled ? 'Active' : 'Inactive';
            });
        });
    }

    // 3. Security Notifications Dropdown
    var notifBtn = document.getElementById('warNotifBtn');
    var notifPanel = document.getElementById('warNotifPanel');
    if (notifBtn && notifPanel) {
        notifBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            notifPanel.classList.toggle('show');
        });
        notifPanel.addEventListener('click', function(e) {
            e.stopPropagation();
        });
        document.addEventListener('click', function() {
            notifPanel.classList.remove('show');
        });
    }

    // 4. User Profile Navigation
    var userDropdown = document.getElementById('warUserDropdown');
    if (userDropdown) {
        userDropdown.addEventListener('click', function() {
            window.location.href = ajaxurl.replace('admin-ajax.php', 'profile.php');
        });
    }

    // 5. Global Threat Intel Refresh Button
    var refreshBtn = document.getElementById('warRefreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            var btn = $(this);
            if (btn.hasClass('spinning')) return;
            btn.addClass('spinning');

            if (typeof warDashboard !== 'undefined' && typeof warDashboard.loadData === 'function') {
                warDashboard.loadData();
                setTimeout(function() { btn.removeClass('spinning'); }, 600);
            } else {
                setTimeout(function() {
                    window.location.reload();
                }, 400);
            }
        });
    }
});
