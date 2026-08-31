(function($) {
    var hardening = {
        init: function() {
            this.toggleCards();
            this.oneClickHarden();
            this.generateReport();
            this.toggleSection();
            this.adminIpSettings();
            this.bindFeatureActions();
            this.bindRefreshStatus();
        },

        toggleCards: function() {
            $('.war-harden-card-header').on('click', function(e) {
                if ($(e.target).closest('.war-toggle-sm').length) return;
                $(this).next('.war-harden-card-body').toggleClass('active');
            });
            $('.war-harden-card .war-toggle-sm input').on('change', function() {
                var card = $(this).closest('.war-harden-card');
                var feature = card.data('feature');
                var enabled = $(this).is(':checked');
                card.find('.war-harden-card-body').toggleClass('active', enabled);
                if (enabled) {
                    hardening.applyFeature(feature, card);
                } else {
                    hardening.removeFeature(feature, card);
                }
            });
        },

        applyFeature: function(feature, card) {
            var data = { action: 'waf_harden_apply', feature: feature, nonce: waf_fw_ajax.nonce };
            card.find('input, select, textarea').each(function() {
                var el = $(this);
                var name = el.attr('name') || el.attr('id');
                if (!name) return;
                if (el.attr('type') === 'checkbox') {
                    data[name] = el.is(':checked') ? '1' : '0';
                } else {
                    data[name] = el.val();
                }
            });
            $.post(waf_fw_ajax.ajax_url, data, function(r) {
                if (r.success) {
                    hardening.showToast('Feature applied: ' + (r.data.actions || []).join(', '), 'success');
                    hardening.updateScore();
                } else {
                    hardening.showToast('Error: ' + (r.data.message || 'Unknown error'), 'error');
                }
            }).fail(function() {
                hardening.showToast('Network error', 'error');
            });
        },

        removeFeature: function(feature, card) {
            $.post(waf_fw_ajax.ajax_url, {
                action: 'waf_harden_remove',
                feature: feature,
                nonce: waf_fw_ajax.nonce
            }, function(r) {
                if (r.success) {
                    hardening.showToast('Feature disabled: ' + feature, 'info');
                    hardening.updateScore();
                }
            });
        },

        oneClickHarden: function() {
            $('#wafHardenOneClick').on('click', function() {
                if (!confirm('Apply all recommended hardening measures? This will modify .htaccess, wp-config.php, and file permissions.')) return;
                var btn = $(this);
                btn.prop('disabled', true).html('<span class="war-spinner"></span> Hardening...');
                $.post(waf_fw_ajax.ajax_url, {
                    action: 'waf_harden_one_click',
                    nonce: waf_fw_ajax.nonce
                }, function(r) {
                    if (r.success) {
                        hardening.showToast('One-click hardening complete! ' + r.data.applied + '/' + r.data.total + ' features applied.', 'success');
                        hardening.updateScore();
                        hardening.refreshStatus();
                    } else {
                        hardening.showToast('Error: ' + (r.data.message || 'Unknown'), 'error');
                    }
                }).always(function() {
                    btn.prop('disabled', false).text('Secure Website');
                });
            });
        },

        generateReport: function() {
            $('#wafHardenReport').on('click', function() {
                var btn = $(this);
                btn.prop('disabled', true).html('<span class="war-spinner"></span> Generating...');
                $.post(waf_fw_ajax.ajax_url, {
                    action: 'waf_harden_report',
                    nonce: waf_fw_ajax.nonce
                }, function(r) {
                    if (r.success && r.data) {
                        hardening.renderReport(r.data);
                    } else {
                        hardening.showToast('Failed to generate report', 'error');
                    }
                }).always(function() {
                    btn.prop('disabled', false).text('Generate Report');
                });
            });
        },

        renderReport: function(report) {
            var html = '<div class="war-harden-report">';
            html += '<h2>Hardening Report</h2>';
            html += '<div class="war-harden-report-summary">';
            html += '<div class="war-harden-report-summary-item"><strong>Score:</strong> <span class="value">' + report.score + '</span></div>';
            html += '<div class="war-harden-report-summary-item"><strong>Grade:</strong> <span class="value">' + report.grade + '</span></div>';
            html += '<div class="war-harden-report-summary-item"><strong>Features:</strong> <span class="value">' + report.enabled_count + '/' + report.total_features + '</span></div>';
            html += '</div>';
            html += '<table class="war-harden-report-table"><thead><tr><th>Feature</th><th>Status</th><th>Score</th><th>Recommendation</th></tr></thead><tbody>';
            $.each(report.details, function(i, d) {
                var cls = d.status === 'enabled' ? 'war-harden-status-enabled' : 'war-harden-status-disabled';
                html += '<tr><td>' + d.label + '</td><td class="' + cls + '">' + d.status + '</td><td>' + d.score + '</td><td style="color:var(--war-gray-500);font-size:12px;">' + (d.recommendation || '\u2014') + '</td></tr>';
            });
            html += '</tbody></table></div>';
            var existing = $('.war-harden-report');
            if (existing.length) existing.replaceWith(html);
            else $('.war-harden-grid').after(html);
        },

        toggleSection: function() {
            $('.war-harden-tab').on('click', function() {
                $('.war-harden-tab').removeClass('active');
                $(this).addClass('active');
                $('.war-harden-section').removeClass('active');
                $('#' + $(this).data('section')).addClass('active');
            });
        },

        adminIpSettings: function() {
            $('#wafSaveAdminIp').on('click', function() {
                var btn = $(this);
                btn.prop('disabled', true).text('Saving...');
                $.post(waf_fw_ajax.ajax_url, {
                    action: 'waf_harden_admin_ip_save',
                    enabled: $('#wafAdminIpEnabled').is(':checked') ? '1' : '0',
                    whitelist: $('#wafAdminIpWhitelist').val(),
                    blocked_countries: $('#wafAdminIpCountries').val(),
                    nonce: waf_fw_ajax.nonce
                }, function(r) {
                    if (r.success) {
                        hardening.showToast('Admin IP protection settings saved', 'success');
                    } else {
                        hardening.showToast('Error saving settings', 'error');
                    }
                }).always(function() {
                    btn.prop('disabled', false).text('Save Settings');
                });
            });
        },

        bindFeatureActions: function() {
            $('.war-harden-apply-btn').on('click', function() {
                var card = $(this).closest('.war-harden-card');
                var feature = card.data('feature');
                hardening.applyFeature(feature, card);
            });
        },

        bindRefreshStatus: function() {
            $('#wafHardenRefreshStatus').on('click', function() {
                hardening.refreshStatus();
            });
        },

        refreshStatus: function() {
            $.post(waf_fw_ajax.ajax_url, {
                action: 'waf_harden_get_status',
                nonce: waf_fw_ajax.nonce
            }, function(r) {
                if (r.success && r.data) {
                    $.each(r.data, function(feature, info) {
                        var card = $('.war-harden-card[data-feature="' + feature + '"]');
                        if (card.length) {
                            var enabled = info.status === 'enabled';
                            card.find('.war-toggle-sm input').prop('checked', enabled);
                            card.find('.war-harden-card-body').toggleClass('active', enabled);
                        }
                    });
                    hardening.showToast('Status refreshed', 'info');
                }
            });
        },

        updateScore: function() {
            $.post(waf_fw_ajax.ajax_url, {
                action: 'waf_harden_report',
                nonce: waf_fw_ajax.nonce
            }, function(r) {
                if (r.success && r.data) {
                    $('#wafHardenScoreValue').text(r.data.score);
                    $('#wafHardenEnabledCount').text(r.data.enabled_count + '/' + r.data.total_features);
                    $('#wafHardenGradeBadge').removeClass().addClass('war-grade-badge war-grade-' + r.data.grade.toLowerCase()).text(r.data.grade);
                }
            });
        },

        showToast: function(message, type) {
            var toast = $('#wafHardenToast');
            if (!toast.length) {
                toast = $('<div id="wafHardenToast" class="war-harden-toast"></div>').appendTo('body');
            }
            toast.removeClass('success error info').addClass(type).html(message).show();
            clearTimeout(this._toastTimer);
            this._toastTimer = setTimeout(function() { toast.hide(); }, 4000);
        }
    };

    $(document).ready(function() { hardening.init(); });
})(jQuery);
