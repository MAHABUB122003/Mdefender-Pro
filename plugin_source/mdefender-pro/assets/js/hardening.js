(function($) {
    'use strict';

    var hardening = {
        _toastTimer: null,

        init: function() {
            this.bindCardToggles();
            this.bindFeatureApplyBtns();
            this.bindOneClickHarden();
            this.bindAuditReportModal();
            this.bindNavTabs();
            this.bindAdminIpSettings();
            this.bindGlobalPreferences();
            this.bindRefreshStatus();
        },

        bindCardToggles: function() {
            // Clicking switch toggle
            $(document).on('change', '.war-feature-switch', function() {
                var card = $(this).closest('.war-harden-card');
                var feature = card.data('feature');
                var enabled = $(this).is(':checked');

                if (enabled) {
                    hardening.applyFeature(feature, card);
                } else {
                    hardening.removeFeature(feature, card);
                }
            });
        },

        bindFeatureApplyBtns: function() {
            $(document).on('click', '.war-harden-apply-btn', function(e) {
                e.preventDefault();
                var card = $(this).closest('.war-harden-card');
                var feature = card.data('feature');
                var btn = $(this);
                
                btn.prop('disabled', true).html('<span class="dashicons dashicons-update war-spin-icon"></span> Applying...');
                hardening.applyFeature(feature, card, function() {
                    btn.prop('disabled', false).html('<span class="dashicons dashicons-saved"></span> Saved &amp; Applied');
                    setTimeout(function() {
                        btn.html('<span class="dashicons dashicons-saved"></span> Save &amp; Apply Rule');
                    }, 2500);
                });
            });
        },

        applyFeature: function(feature, card, callback) {
            var data = {
                action: 'waf_harden_apply',
                feature: feature,
                nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
            };

            card.find('input, select, textarea').each(function() {
                var el = $(this);
                var name = el.attr('name');
                if (!name) return;

                if (el.attr('type') === 'checkbox') {
                    data[name] = el.is(':checked') ? 1 : 0;
                } else {
                    data[name] = el.val();
                }
            });

            $.post(waf_fw_ajax.ajax_url, data, function(r) {
                if (r && r.success) {
                    card.removeClass('is-inactive-rule').addClass('is-active-rule');
                    card.find('.war-feature-switch').prop('checked', true);
                    card.find('.war-status-badge').removeClass('badge-disabled').addClass('badge-enabled').text('● ENABLED');
                    card.find('.war-card-icon-wrap').addClass('icon-active');

                    var actionMsg = (r.data && r.data.actions && r.data.actions.length) 
                        ? r.data.actions.join('; ') 
                        : 'Rule applied and active';
                    hardening.showToast('<strong>' + (card.find('.war-card-title').text() || feature) + ':</strong> ' + actionMsg, 'success');
                    hardening.updateScore();
                } else {
                    var errMsg = (r && r.data && r.data.message) ? r.data.message : 'Failed to apply rule';
                    hardening.showToast('Error: ' + errMsg, 'error');
                }
                if (typeof callback === 'function') callback(r);
            }).fail(function() {
                hardening.showToast('Network error while applying rule', 'error');
                if (typeof callback === 'function') callback(false);
            });
        },

        removeFeature: function(feature, card) {
            $.post(waf_fw_ajax.ajax_url, {
                action: 'waf_harden_remove',
                feature: feature,
                nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
            }, function(r) {
                if (r && r.success) {
                    card.removeClass('is-active-rule').addClass('is-inactive-rule');
                    card.find('.war-feature-switch').prop('checked', false);
                    card.find('.war-status-badge').removeClass('badge-enabled').addClass('badge-disabled').text('RECOMMENDED');
                    card.find('.war-card-icon-wrap').removeClass('icon-active');

                    hardening.showToast('<strong>' + (card.find('.war-card-title').text() || feature) + ':</strong> Protection disabled', 'info');
                    hardening.updateScore();
                } else {
                    hardening.showToast('Failed to disable rule', 'error');
                }
            });
        },

        bindOneClickHarden: function() {
            var handleOneClick = function(triggerBtn) {
                if (!confirm('Apply all 16 recommended enterprise hardening rules? This will secure wp-config.php, file permissions, HTTP headers, XML-RPC, and upload directories.')) {
                    return;
                }

                var origHtml = triggerBtn.html();
                triggerBtn.prop('disabled', true).html('<span class="dashicons dashicons-update war-spin-icon"></span> Hardening Site...');

                $.post(waf_fw_ajax.ajax_url, {
                    action: 'waf_harden_one_click',
                    nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
                }, function(r) {
                    if (r && r.success) {
                        hardening.showToast('<strong>Enterprise Hardening Complete:</strong> ' + r.data.applied + '/' + r.data.total + ' rules successfully applied and active!', 'success');
                        hardening.refreshStatus();
                        hardening.updateScore();
                    } else {
                        var msg = (r && r.data && r.data.message) ? r.data.message : 'Unknown error';
                        hardening.showToast('One-click hardening error: ' + msg, 'error');
                    }
                }).always(function() {
                    triggerBtn.prop('disabled', false).html(origHtml);
                });
            };

            $('#wafHardenOneClick').on('click', function() {
                handleOneClick($(this));
            });

            $('#wafModalApplyAll').on('click', function() {
                handleOneClick($(this));
                $('#wafHardenAuditModal').fadeOut(150);
            });
        },

        bindAuditReportModal: function() {
            $('#wafHardenReport').on('click', function() {
                var modal = $('#wafHardenAuditModal');
                var content = $('#wafAuditModalContent');
                modal.fadeIn(150);

                content.html('<div style="text-align:center;padding:40px;"><span class="dashicons dashicons-update war-spin-icon" style="font-size:32px;width:32px;height:32px;color:#2563eb;"></span><p style="margin-top:12px;color:#64748b;font-weight:600;">Analyzing 16 security controls...</p></div>');

                $.post(waf_fw_ajax.ajax_url, {
                    action: 'waf_harden_report',
                    nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
                }, function(r) {
                    if (r && r.success && r.data) {
                        hardening.renderAuditReport(r.data);
                    } else {
                        content.html('<div style="text-align:center;padding:30px;color:#dc2626;"><span class="dashicons dashicons-warning" style="font-size:32px;width:32px;height:32px;"></span><p>Could not generate security audit report.</p></div>');
                    }
                }).fail(function() {
                    content.html('<div style="text-align:center;padding:30px;color:#dc2626;"><span class="dashicons dashicons-warning" style="font-size:32px;width:32px;height:32px;"></span><p>Network error generating audit report.</p></div>');
                });
            });

            $('#wafCloseAuditModal, #wafCloseAuditModalBtn').on('click', function() {
                $('#wafHardenAuditModal').fadeOut(150);
            });

            $('#wafHardenAuditModal').on('click', function(e) {
                if ($(e.target).hasClass('war-modal-backdrop')) {
                    $(this).fadeOut(150);
                }
            });
        },

        renderAuditReport: function(report) {
            var content = $('#wafAuditModalContent');
            var gradeClass = 'war-grade-' + (report.grade || 'f').toLowerCase();

            var html = '';
            html += '<div class="war-audit-summary-row">';
            html += '  <div class="war-audit-kpi">';
            html += '    <div class="war-grade-circle ' + gradeClass + '" style="margin:0 auto 8px;">' + report.grade + '</div>';
            html += '    <div class="war-audit-kpi-lbl">Security Grade</div>';
            html += '  </div>';
            html += '  <div class="war-audit-kpi">';
            html += '    <div class="war-audit-kpi-val">' + report.score + '<span style="font-size:14px;color:#94a3b8;">/100</span></div>';
            html += '    <div class="war-audit-kpi-lbl">Hardening Score</div>';
            html += '  </div>';
            html += '  <div class="war-audit-kpi">';
            html += '    <div class="war-audit-kpi-val" style="color:#059669;">' + report.enabled_count + '<span style="font-size:14px;color:#94a3b8;">/' + report.total_features + '</span></div>';
            html += '    <div class="war-audit-kpi-lbl">Active Rules</div>';
            html += '  </div>';
            html += '</div>';

            html += '<table class="war-audit-table">';
            html += '  <thead>';
            html += '    <tr>';
            html += '      <th>Security Measure</th>';
            html += '      <th>Status</th>';
            html += '      <th>Impact Score</th>';
            html += '      <th>Recommendation</th>';
            html += '    </tr>';
            html += '  </thead>';
            html += '  <tbody>';

            $.each(report.details || [], function(i, d) {
                var isPass = (d.status === 'enabled');
                var tag = isPass 
                    ? '<span class="war-audit-status-tag war-tag-pass"><span class="dashicons dashicons-yes-alt"></span> PASS</span>' 
                    : '<span class="war-audit-status-tag war-tag-fail"><span class="dashicons dashicons-warning"></span> DISABLED</span>';

                html += '    <tr>';
                html += '      <td><strong>' + d.label + '</strong></td>';
                html += '      <td>' + tag + '</td>';
                html += '      <td><strong>' + d.score + ' / 100</strong></td>';
                html += '      <td style="color:' + (isPass ? '#059669' : '#dc2626') + ';font-size:12px;">' + (d.recommendation || 'Rule verified & active') + '</td>';
                html += '    </tr>';
            });

            html += '  </tbody>';
            html += '</table>';

            content.html(html);
        },

        bindNavTabs: function() {
            $('.war-harden-tab').on('click', function() {
                var btn = $(this);
                $('.war-harden-tab').removeClass('active');
                btn.addClass('active');

                var targetSection = btn.data('section');
                var filter = btn.data('filter');

                if (targetSection === 'waf-harden-features') {
                    $('.war-harden-section').hide();
                    $('#waf-harden-features').fadeIn(150);

                    if (filter === 'all' || !filter) {
                        $('.war-harden-card').show();
                    } else {
                        $('.war-harden-card').hide();
                        $('.war-harden-card[data-category="' + filter + '"]').fadeIn(150);
                    }
                } else {
                    $('.war-harden-section').hide();
                    $('#' + targetSection).fadeIn(150);
                }
            });
        },

        bindAdminIpSettings: function() {
            $('#wafSaveAdminIp').on('click', function() {
                var btn = $(this);
                btn.prop('disabled', true).html('<span class="dashicons dashicons-update war-spin-icon"></span> Saving...');

                $.post(waf_fw_ajax.ajax_url, {
                    action: 'waf_harden_admin_ip_save',
                    enabled: $('#wafAdminIpEnabled').is(':checked') ? 1 : 0,
                    whitelist: $('#wafAdminIpWhitelist').val(),
                    blocked_countries: $('#wafAdminIpCountries').val(),
                    nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
                }, function(r) {
                    if (r && r.success) {
                        hardening.showToast('Admin IP & Geo restrictions saved successfully', 'success');
                    } else {
                        hardening.showToast('Failed to save Admin IP restrictions', 'error');
                    }
                }).always(function() {
                    btn.prop('disabled', false).html('<span class="dashicons dashicons-saved"></span> Save IP &amp; Geo Restrictions');
                });
            });
        },

        bindGlobalPreferences: function() {
            $('#wafHardenGlobalSettings').on('submit', function(e) {
                e.preventDefault();
                var btn = $(this).find('button[type="submit"]');
                btn.prop('disabled', true).html('<span class="dashicons dashicons-update war-spin-icon"></span> Saving...');

                hardening.showToast('Global hardening preferences saved', 'success');
                setTimeout(function() {
                    btn.prop('disabled', false).html('<span class="dashicons dashicons-saved"></span> Save Preferences');
                }, 500);
            });
        },

        bindRefreshStatus: function() {
            $('#wafHardenRefreshStatus').on('click', function() {
                var btn = $(this);
                btn.find('.dashicons').addClass('war-spin-icon');
                hardening.refreshStatus(function() {
                    hardening.updateScore();
                    setTimeout(function() {
                        btn.find('.dashicons').removeClass('war-spin-icon');
                    }, 500);
                });
            });
        },

        refreshStatus: function(callback) {
            $.post(waf_fw_ajax.ajax_url, {
                action: 'waf_harden_get_status',
                nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
            }, function(r) {
                if (r && r.success && r.data) {
                    $.each(r.data, function(feature, info) {
                        var card = $('.war-harden-card[data-feature="' + feature + '"]');
                        if (card.length) {
                            var isEnabled = (info.status === 'enabled');
                            card.find('.war-feature-switch').prop('checked', isEnabled);
                            card.toggleClass('is-active-rule', isEnabled).toggleClass('is-inactive-rule', !isEnabled);
                            card.find('.war-status-badge').toggleClass('badge-enabled', isEnabled).toggleClass('badge-disabled', !isEnabled).text(isEnabled ? '● ENABLED' : 'RECOMMENDED');
                            card.find('.war-card-icon-wrap').toggleClass('icon-active', isEnabled);
                        }
                    });
                    hardening.showToast('Hardening status synchronized', 'info');
                }
                if (typeof callback === 'function') callback();
            });
        },

        updateScore: function() {
            $.post(waf_fw_ajax.ajax_url, {
                action: 'waf_harden_report',
                nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
            }, function(r) {
                if (r && r.success && r.data) {
                    var d = r.data;
                    $('#wafHardenScoreValue').text(d.score);
                    $('#wafHardenEnabledCount').text(d.enabled_count + '/' + d.total_features);

                    var grade = (d.grade || 'F').toUpperCase();
                    var badge = $('#wafHardenGradeBadge');
                    badge.removeClass('war-grade-a war-grade-b war-grade-c war-grade-d war-grade-f')
                         .addClass('war-grade-' + grade.toLowerCase())
                         .text(grade);

                    $('#wafGradeLabel').text(grade === 'A' ? 'Maximum Protection' : (grade === 'B' ? 'High Security' : 'Action Recommended'));
                    $('#wafGradeBar').css('width', d.score + '%');
                    $('#wafScoreBar').css('width', d.score + '%');
                    $('#wafRulesBar').css('width', ((d.enabled_count / Math.max(1, d.total_features)) * 100) + '%');
                }
            });
        },

        showToast: function(message, type) {
            var toast = $('#wafHardenToast');
            if (!toast.length) {
                toast = $('<div id="wafHardenToast" class="war-harden-toast"></div>').appendTo('body');
            }
            toast.removeClass('success error info').addClass(type || 'info').html(message).fadeIn(150);
            clearTimeout(this._toastTimer);
            this._toastTimer = setTimeout(function() { toast.fadeOut(200); }, 4000);
        }
    };

    $(document).ready(function() {
        hardening.init();
    });
})(jQuery);
