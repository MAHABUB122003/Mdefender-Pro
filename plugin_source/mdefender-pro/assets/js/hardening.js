(function($) {
    'use strict';

    var hardening = {
        _toastTimer: null,

        init: function() {
            this.bindControlToggles();
            this.bindControlExpanders();
            this.bindFeatureApplyBtns();
            this.bindOneClickHarden();
            this.bindAuditReportModal();
            this.bindNavTabs();
            this.bindSubfilters();
            this.bindProfiles();
            this.bindLivePermissions();
            this.bindSecurityHeadersSuite();
            this.bindFileIntegrity();
            this.bindUploadsScan();
            this.bindDbAudit();
            this.bindBaselineAndDrift();
            this.bindRollback();
            this.bindAdminIpSettings();
            this.bindActivityLog();
            this.bindRefreshStatus();
        },

        bindControlToggles: function() {
            $(document).on('change', '.war-feature-switch', function() {
                var row = $(this).closest('.war-control-row');
                var feature = row.data('feature');
                var enabled = $(this).is(':checked');

                if (enabled) {
                    hardening.applyFeature(feature, row);
                } else {
                    hardening.removeFeature(feature, row);
                }
            });
        },

        bindControlExpanders: function() {
            $(document).on('click', '.war-control-toggle-btn, .war-control-name', function(e) {
                e.preventDefault();
                var row = $(this).closest('.war-control-row');
                var body = row.find('.war-control-body');
                var icon = row.find('.war-control-toggle-btn .dashicons');

                body.slideToggle(150, function() {
                    if (body.is(':visible')) {
                        icon.removeClass('dashicons-arrow-down-alt2').addClass('dashicons-arrow-up-alt2');
                    } else {
                        icon.removeClass('dashicons-arrow-up-alt2').addClass('dashicons-arrow-down-alt2');
                    }
                });
            });
        },

        bindFeatureApplyBtns: function() {
            $(document).on('click', '.war-harden-apply-btn', function(e) {
                e.preventDefault();
                var row = $(this).closest('.war-control-row');
                var feature = row.data('feature');
                var btn = $(this);
                
                btn.prop('disabled', true).html('<span class="dashicons dashicons-update war-spin-icon"></span> Saving...');
                hardening.applyFeature(feature, row, function() {
                    btn.prop('disabled', false).html('<span class="dashicons dashicons-saved"></span> Saved');
                    setTimeout(function() {
                        btn.html('<span class="dashicons dashicons-saved"></span> Save Configuration');
                    }, 2000);
                });
            });
        },

        applyFeature: function(feature, row, callback) {
            var data = {
                action: 'waf_harden_apply',
                feature: feature,
                nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
            };

            row.find('input, select, textarea').each(function() {
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
                    row.removeClass('is-disabled').addClass('is-enabled');
                    row.find('.war-feature-switch').prop('checked', true);
                    row.find('.war-status-pill').removeClass('pill-disabled').addClass('pill-enabled').text('PASS • ACTIVE');

                    var actionMsg = (r.data && r.data.actions && r.data.actions.length) 
                        ? r.data.actions.join('; ') 
                        : 'Control verified & active';
                    hardening.showToast('<strong>' + (row.find('.war-control-name').text() || feature) + ':</strong> ' + actionMsg, 'success');
                    hardening.updateScore();
                } else {
                    var errMsg = (r && r.data && r.data.message) ? r.data.message : 'Failed to apply security rule';
                    hardening.showToast('Error: ' + errMsg, 'error');
                }
                if (typeof callback === 'function') callback(r);
            }).fail(function() {
                hardening.showToast('Network error while applying security rule', 'error');
                if (typeof callback === 'function') callback(false);
            });
        },

        removeFeature: function(feature, row) {
            $.post(waf_fw_ajax.ajax_url, {
                action: 'waf_harden_remove',
                feature: feature,
                nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
            }, function(r) {
                if (r && r.success) {
                    row.removeClass('is-enabled').addClass('is-disabled');
                    row.find('.war-feature-switch').prop('checked', false);
                    row.find('.war-status-pill').removeClass('pill-enabled').addClass('pill-disabled').text('DISABLED');

                    hardening.showToast('<strong>' + (row.find('.war-control-name').text() || feature) + ':</strong> Protection disabled', 'info');
                    hardening.updateScore();
                } else {
                    hardening.showToast('Failed to disable security rule', 'error');
                }
            });
        },

        bindProfiles: function() {
            $('.war-profile-btn').on('click', function(e) {
                e.preventDefault();
                var btn = $(this);
                var profile = btn.data('profile');

                if (profile === 'custom') {
                    $('.war-harden-tab[data-tab="tab-controls"]').trigger('click');
                    return;
                }

                if (!confirm('Switch to ' + profile.toUpperCase() + ' hardening profile? This will automatically calibrate security rules for this profile.')) {
                    return;
                }

                $('.war-profile-btn').removeClass('active');
                btn.addClass('active');

                $.post(waf_fw_ajax.ajax_url, {
                    action: 'waf_harden_apply_profile',
                    profile: profile,
                    nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
                }, function(r) {
                    if (r && r.success) {
                        hardening.showToast('<strong>' + (r.data.message || 'Profile applied') + '</strong>', 'success');
                        hardening.refreshStatus();
                        hardening.updateScore();
                    } else {
                        hardening.showToast('Failed to apply profile: ' + (r.data.message || 'Unknown error'), 'error');
                    }
                });
            });
        },

        bindOneClickHarden: function() {
            var handleOneClick = function(triggerBtn) {
                if (!confirm('Execute 1-Click Hardening? This applies the Balanced Production security profile with automated pre-change safety snapshots.')) {
                    return;
                }

                var origHtml = triggerBtn.html();
                triggerBtn.prop('disabled', true).html('<span class="dashicons dashicons-update war-spin-icon"></span> Hardening...');

                $.post(waf_fw_ajax.ajax_url, {
                    action: 'waf_harden_one_click',
                    nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
                }, function(r) {
                    if (r && r.success) {
                        hardening.showToast('<strong>1-Click Hardening Complete:</strong> Production hardening suite successfully applied and active!', 'success');
                        hardening.refreshStatus();
                        hardening.updateScore();
                    } else {
                        var msg = (r && r.data && r.data.message) ? r.data.message : 'Unknown error';
                        hardening.showToast('Hardening error: ' + msg, 'error');
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

                content.html('<div style="text-align:center;padding:40px;"><span class="dashicons dashicons-update war-spin-icon" style="font-size:32px;width:32px;height:32px;color:#4f46e5;"></span><p style="margin-top:12px;color:#64748b;font-weight:600;">Evaluating WordPress hardening defense posture...</p></div>');

                $.post(waf_fw_ajax.ajax_url, {
                    action: 'waf_harden_report',
                    nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
                }, function(r) {
                    if (r && r.success && r.data) {
                        hardening.renderAuditReport(r.data);
                    } else {
                        content.html('<div style="text-align:center;padding:30px;color:#dc2626;"><span class="dashicons dashicons-warning" style="font-size:32px;width:32px;height:32px;"></span><p>Could not generate audit report.</p></div>');
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
            html += '    <div class="war-grade-pill ' + gradeClass + '" style="font-size:18px;padding:4px 14px;margin:0 auto 8px;">Grade ' + report.grade + '</div>';
            html += '    <div class="war-audit-kpi-lbl">Defense Index: ' + report.score + '/100</div>';
            html += '  </div>';
            html += '  <div class="war-audit-kpi">';
            html += '    <div class="war-audit-kpi-val" style="color:#059669;">' + report.enabled_count + ' Passed</div>';
            html += '    <div class="war-audit-kpi-lbl">Hardened Controls</div>';
            html += '  </div>';
            html += '  <div class="war-audit-kpi">';
            html += '    <div class="war-audit-kpi-val" style="color:#dc2626;">' + (report.total_features - report.enabled_count) + ' Needs Action</div>';
            html += '    <div class="war-audit-kpi-lbl">Unprotected Vectors</div>';
            html += '  </div>';
            html += '</div>';

            html += '<table class="war-data-table" style="margin-top:16px;">';
            html += '  <thead>';
            html += '    <tr>';
            html += '      <th>Security Control</th>';
            html += '      <th>Current Status</th>';
            html += '      <th>Recommendation</th>';
            html += '    </tr>';
            html += '  </thead>';
            html += '  <tbody>';

            $.each(report.details || [], function(i, d) {
                var isPass = (d.status === 'enabled');
                var tag = isPass 
                    ? '<span class="war-status-pill pill-enabled">PASS</span>' 
                    : '<span class="war-status-pill pill-disabled">DISABLED</span>';

                html += '    <tr>';
                html += '      <td><strong>' + d.label + '</strong></td>';
                html += '      <td>' + tag + '</td>';
                html += '      <td style="color:' + (isPass ? '#059669' : '#dc2626') + ';font-size:12px;">' + (d.recommendation || 'Verified & Active') + '</td>';
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

                var targetTab = btn.data('tab');
                $('.war-tab-pane').hide();
                $('#' + targetTab).fadeIn(150);
            });

            // Click category card in score breakdown
            $('.war-cat-card').on('click', function() {
                var cat = $(this).data('category-filter');
                $('.war-harden-tab[data-tab="tab-controls"]').trigger('click');
                $('.war-subfilter-btn[data-filter="' + cat + '"]').trigger('click');
            });
        },

        bindSubfilters: function() {
            $('.war-subfilter-btn').on('click', function() {
                var btn = $(this);
                $('.war-subfilter-btn').removeClass('active');
                btn.addClass('active');

                var filter = btn.data('filter');
                if (filter === 'all' || !filter) {
                    $('.war-control-row').show();
                } else {
                    $('.war-control-row').hide();
                    $('.war-control-row[data-category="' + filter + '"]').fadeIn(150);
                }
            });
        },

        bindFileIntegrity: function() {
            $('#wafRunIntegrityScan').on('click', function() {
                var btn = $(this);
                btn.prop('disabled', true).html('<span class="dashicons dashicons-update war-spin-icon"></span> Scanning SHA-256 Hashes...');

                $.post(waf_fw_ajax.ajax_url, {
                    action: 'waf_harden_scan_integrity',
                    nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
                }, function(r) {
                    btn.prop('disabled', false).html('<span class="dashicons dashicons-search"></span> Scan File Integrity');
                    if (r && r.success && r.data) {
                        var tbody = $('#wafIntegrityTableBody');
                        tbody.empty();

                        var findings = r.data.findings || [];
                        if (findings.length === 0) {
                            tbody.html('<tr><td colspan="6" class="war-table-empty" style="color:#059669;"><strong>All core files and entry points match cryptographic baseline (0 anomalies).</strong></td></tr>');
                        } else {
                            $.each(findings, function(idx, f) {
                                var row = '<tr>' +
                                    '<td><code>' + f.file + '</code></td>' +
                                    '<td><strong style="color:#dc2626;">' + f.change_type + '</strong></td>' +
                                    '<td><span class="war-severity-badge severity-high">' + f.severity + '</span></td>' +
                                    '<td><code>' + f.current_hash + '</code></td>' +
                                    '<td><code>' + f.baseline_hash + '</code></td>' +
                                    '<td>' + f.detected_at + '</td>' +
                                    '</tr>';
                                tbody.append(row);
                            });
                        }
                        hardening.showToast('File integrity audit completed (' + r.data.scanned_count + ' checked)', 'success');
                    }
                }).fail(function() {
                    btn.prop('disabled', false).html('<span class="dashicons dashicons-search"></span> Scan File Integrity');
                    hardening.showToast('Network error during file integrity scan', 'error');
                });
            });
        },

        bindUploadsScan: function() {
            $('#wafRunUploadsScan').on('click', function() {
                var btn = $(this);
                btn.prop('disabled', true).html('<span class="dashicons dashicons-update war-spin-icon"></span> Scanning Media Storage...');

                $.post(waf_fw_ajax.ajax_url, {
                    action: 'waf_harden_scan_uploads',
                    nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
                }, function(r) {
                    btn.prop('disabled', false).html('<span class="dashicons dashicons-upload"></span> Scan Uploads Folder');
                    if (r && r.success && r.data) {
                        var tbody = $('#wafUploadsTableBody');
                        tbody.empty();

                        var issues = r.data.issues || [];
                        if (issues.length === 0) {
                            tbody.html('<tr><td colspan="5" class="war-table-empty" style="color:#059669;"><strong>No executable scripts or dangerous files discovered in uploads storage (' + r.data.scanned_files + ' files clean).</strong></td></tr>');
                        } else {
                            $.each(issues, function(idx, item) {
                                var row = '<tr>' +
                                    '<td><code>' + item.file + '</code></td>' +
                                    '<td><strong style="color:#dc2626;">' + item.issue + '</strong></td>' +
                                    '<td><span class="war-severity-badge severity-high">' + item.severity + '</span></td>' +
                                    '<td>' + item.size + '</td>' +
                                    '<td><span class="war-status-pill pill-disabled">Blocked by .htaccess</span></td>' +
                                    '</tr>';
                                tbody.append(row);
                            });
                        }
                        hardening.showToast('Uploads audit complete (' + r.data.scanned_files + ' inspected)', 'info');
                    }
                }).fail(function() {
                    btn.prop('disabled', false).html('<span class="dashicons dashicons-upload"></span> Scan Uploads Folder');
                    hardening.showToast('Network error scanning uploads', 'error');
                });
            });
        },

        bindDbAudit: function() {
            $('#wafRunDbAudit').on('click', function() {
                var btn = $(this);
                btn.prop('disabled', true).html('<span class="dashicons dashicons-update war-spin-icon"></span> Inspecting Database...');

                $.post(waf_fw_ajax.ajax_url, {
                    action: 'waf_harden_db_audit',
                    nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
                }, function(r) {
                    btn.prop('disabled', false).html('<span class="dashicons dashicons-search"></span> Run Database Audit');
                    if (r && r.success && r.data) {
                        var tbody = $('#wafDbAuditTableBody');
                        tbody.empty();

                        var findings = r.data.findings || [];
                        if (findings.length === 0) {
                            tbody.html('<tr><td colspan="4" class="war-table-empty" style="color:#059669;"><strong>Database security check passed! No exposed SQL dumps, rogue admins, or code injections detected.</strong></td></tr>');
                        } else {
                            $.each(findings, function(idx, f) {
                                var row = '<tr>' +
                                    '<td><strong>' + f.type + '</strong></td>' +
                                    '<td><code>' + f.target + '</code></td>' +
                                    '<td><span class="war-severity-badge severity-high">' + f.severity + '</span></td>' +
                                    '<td>' + f.description + '</td>' +
                                    '</tr>';
                                tbody.append(row);
                            });
                        }
                        hardening.showToast('Database audit completed (' + findings.length + ' findings)', 'info');
                    }
                }).fail(function() {
                    btn.prop('disabled', false).html('<span class="dashicons dashicons-search"></span> Run Database Audit');
                    hardening.showToast('Network error during database audit', 'error');
                });
            });
        },

        bindBaselineAndDrift: function() {
            $('#wafCreateBaselineBtn').on('click', function() {
                var btn = $(this);
                btn.prop('disabled', true).html('<span class="dashicons dashicons-update war-spin-icon"></span> Creating Baseline...');

                $.post(waf_fw_ajax.ajax_url, {
                    action: 'waf_harden_create_baseline',
                    nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
                }, function(r) {
                    btn.prop('disabled', false).html('<span class="dashicons dashicons-saved"></span> Create Security Baseline');
                    if (r && r.success) {
                        $('#wafBaselineDateText').text('Active (Created ' + (r.data.baseline ? r.data.baseline.created_at : 'Just now') + ')');
                        hardening.showToast(r.data.message || 'Security baseline created', 'success');
                    } else {
                        hardening.showToast('Failed to create baseline', 'error');
                    }
                });
            });

            $('#wafCheckDriftBtn').on('click', function() {
                var btn = $(this);
                btn.prop('disabled', true).html('<span class="dashicons dashicons-update war-spin-icon"></span> Checking Drift...');

                $.post(waf_fw_ajax.ajax_url, {
                    action: 'waf_harden_check_drift',
                    nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
                }, function(r) {
                    btn.prop('disabled', false).html('<span class="dashicons dashicons-randomize"></span> Check Configuration Drift');
                    if (r && r.success && r.data) {
                        $('#wafLastDriftCheckText').text(r.data.last_check || 'Just now');
                        var tbody = $('#wafDriftTableBody');
                        tbody.empty();

                        var drifts = r.data.drifts || [];
                        if (drifts.length === 0) {
                            tbody.html('<tr><td colspan="6" class="war-table-empty" style="color:#059669;"><strong>No configuration drift detected. All hardened controls match baseline.</strong></td></tr>');
                        } else {
                            $.each(drifts, function(idx, d) {
                                var row = '<tr>' +
                                    '<td><strong>' + (d.label || d.control) + '</strong></td>' +
                                    '<td>' + d.type + '</td>' +
                                    '<td><span class="war-severity-badge severity-high">' + d.severity + '</span></td>' +
                                    '<td><code>' + d.expected + '</code></td>' +
                                    '<td><code style="color:#dc2626;">' + d.current + '</code></td>' +
                                    '<td><button type="button" class="war-btn-compact war-btn-remediate" data-control="' + d.control + '">Fix Drift</button></td>' +
                                    '</tr>';
                                tbody.append(row);
                            });
                        }
                        hardening.showToast('Drift analysis complete (' + drifts.length + ' drifts detected)', 'info');
                    }
                });
            });

            $(document).on('click', '.war-btn-remediate', function() {
                var btn = $(this);
                var control = btn.data('control');
                btn.prop('disabled', true).text('Fixing...');

                $.post(waf_fw_ajax.ajax_url, {
                    action: 'waf_harden_remediate_drift',
                    control: control,
                    nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
                }, function(r) {
                    if (r && r.success) {
                        btn.closest('tr').fadeOut(200, function() { $(this).remove(); });
                        hardening.showToast('Remediated control: ' + control, 'success');
                        hardening.refreshStatus();
                    } else {
                        btn.prop('disabled', false).text('Fix Drift');
                        hardening.showToast('Failed to remediate drift', 'error');
                    }
                });
            });
        },

        bindRollback: function() {
            $(document).on('click', '.war-btn-rollback', function() {
                var snapId = $(this).data('snapshot-id');
                if (!confirm('Revert configuration to snapshot ' + snapId + '? This will restore the file to its exact snapshot state.')) {
                    return;
                }

                var btn = $(this);
                btn.prop('disabled', true).text('Restoring...');

                $.post(waf_fw_ajax.ajax_url, {
                    action: 'waf_harden_rollback',
                    snapshot_id: snapId,
                    nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
                }, function(r) {
                    btn.prop('disabled', false).html('<span class="dashicons dashicons-undo"></span> Rollback');
                    if (r && r.success) {
                        hardening.showToast('<strong>' + (r.data.message || 'Snapshot restored successfully') + '</strong>', 'success');
                        setTimeout(function() { window.location.reload(); }, 1800);
                    } else {
                        hardening.showToast('Rollback error: ' + (r.data.message || 'Unknown error'), 'error');
                    }
                });
            });

            $('#wafCreateManualSnapshotBtn').on('click', function() {
                var btn = $(this);
                btn.prop('disabled', true).text('Creating Snapshot...');

                $.post(waf_fw_ajax.ajax_url, {
                    action: 'waf_harden_apply',
                    feature: 'wp_config',
                    backup_config: 1,
                    nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
                }, function() {
                    btn.prop('disabled', false).html('<span class="dashicons dashicons-camera"></span> Create Safety Snapshot');
                    hardening.showToast('Safety snapshot created', 'success');
                    setTimeout(function() { window.location.reload(); }, 1000);
                });
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

            $('#wafSaveHeadersTabBtn').on('click', function() {
                $('.war-harden-tab[data-tab="tab-controls"]').trigger('click');
                $('.war-subfilter-btn[data-filter="headers"]').trigger('click');
                var headerRow = $('.war-control-row[data-feature="security_headers"]');
                headerRow.find('.war-control-body').slideDown(150);
            });
        },

        bindLivePermissions: function() {
            $('#wafScanPermissionsBtn').on('click', function() {
                var btn = $(this);
                btn.prop('disabled', true).html('<span class="dashicons dashicons-update war-spin-icon"></span> Scanning Live...');

                $.post(waf_fw_ajax.ajax_url, {
                    action: 'waf_harden_scan_permissions',
                    nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
                }, function(r) {
                    btn.prop('disabled', false).html('<span class="dashicons dashicons-update"></span> Scan Live Permissions');
                    if (r && r.success && r.data) {
                        hardening.renderPermissionsTable(r.data);
                        hardening.showToast('Live file permissions audit completed (' + r.data.optimal_count + ' optimal, ' + r.data.risk_count + ' risks)', 'success');
                    } else {
                        hardening.showToast('Failed to scan file permissions', 'error');
                    }
                }).fail(function() {
                    btn.prop('disabled', false).html('<span class="dashicons dashicons-update"></span> Scan Live Permissions');
                    hardening.showToast('Network error during file permissions scan', 'error');
                });
            });

            $('#wafFixAllPermissionsBtn').on('click', function() {
                if (!confirm('Execute 1-Click Permission Fix on all WordPress core files and directories? This safely sets standard permissions (0644/0600 for files, 0755 for directories).')) {
                    return;
                }

                var btn = $(this);
                btn.prop('disabled', true).html('<span class="dashicons dashicons-update war-spin-icon"></span> Fortifying Permissions...');

                $.post(waf_fw_ajax.ajax_url, {
                    action: 'waf_harden_fix_permissions',
                    nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
                }, function(r) {
                    btn.prop('disabled', false).html('<span class="dashicons dashicons-admin-tools"></span> 1-Click Fix All Permissions');
                    if (r && r.success && r.data) {
                        if (r.data.live_scan) {
                            hardening.renderPermissionsTable(r.data.live_scan);
                        }
                        hardening.showToast('<strong>1-Click Fix:</strong> ' + r.data.message, 'success');
                        hardening.updateScore();
                    } else {
                        hardening.showToast('Failed to apply 1-click permission fixes', 'error');
                    }
                }).fail(function() {
                    btn.prop('disabled', false).html('<span class="dashicons dashicons-admin-tools"></span> 1-Click Fix All Permissions');
                    hardening.showToast('Network error while fixing permissions', 'error');
                });
            });

            $(document).on('click', '.waf-fix-single-perm-btn', function() {
                var btn = $(this);
                var key = btn.data('key');
                var tr = btn.closest('tr');

                btn.prop('disabled', true).html('<span class="dashicons dashicons-update war-spin-icon"></span> Setting...');

                $.post(waf_fw_ajax.ajax_url, {
                    action: 'waf_harden_fix_single_permission',
                    key: key,
                    nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
                }, function(r) {
                    if (r && r.success && r.data) {
                        tr.find('.war-perm-octal').removeClass('text-risk').addClass('text-optimal').text(r.data.new_octal);
                        tr.find('.war-status-pill').removeClass('pill-disabled').addClass('pill-enabled').text('OPTIMAL');
                        btn.prop('disabled', true).html('<span class="dashicons dashicons-yes"></span> Fortified');
                        hardening.showToast(r.data.message, 'success');
                    } else {
                        btn.prop('disabled', false).html('<span class="dashicons dashicons-yes"></span> Retry');
                        hardening.showToast((r && r.data && r.data.message) ? r.data.message : 'Failed to set permission', 'error');
                    }
                });
            });
        },

        renderPermissionsTable: function(data) {
            $('#wafPermsCountTotal').text(data.total_scanned || 13);
            $('#wafPermsCountOptimal').text(data.optimal_count || 0);
            $('#wafPermsCountRisk').text(data.risk_count || 0);

            var tbody = $('#wafPermissionsTableBody');
            if (!data.items || !data.items.length) return;

            var html = '';
            $.each(data.items, function(i, item) {
                var icon = item.is_dir ? 'dashicons-category' : (item.key === 'wp_config' ? 'dashicons-admin-settings' : 'dashicons-media-code');
                var iconColor = item.is_optimal ? '#10b981' : '#f59e0b';
                var octalClass = item.is_optimal ? 'text-optimal' : 'text-risk';
                var pillClass = item.is_optimal ? 'pill-enabled' : 'pill-disabled';
                var statusText = item.is_optimal ? 'OPTIMAL' : 'RISK DEVIATION';

                html += '<tr data-perm-key="' + item.key + '">';
                html += '<td><strong style="display:flex;align-items:center;gap:6px;"><span class="dashicons ' + icon + '" style="color:' + iconColor + ';"></span><code>' + item.name + '</code></strong><small style="color:#64748b;font-size:11px;">' + (item.description || '') + '</small></td>';
                html += '<td><span class="war-cat-pill">' + item.type + '</span></td>';
                html += '<td><strong class="war-perm-octal ' + octalClass + '">' + item.current_octal + '</strong></td>';
                html += '<td><code class="war-perm-symbolic">' + item.current_symbolic + '</code></td>';
                html += '<td><code style="color:#4f46e5;font-weight:700;">' + item.recommended_octal + '</code></td>';
                html += '<td><span class="war-status-pill ' + pillClass + '">' + statusText + '</span></td>';
                html += '<td style="text-align:right;">';
                if (item.is_optimal) {
                    html += '<button type="button" class="war-btn-compact war-btn-remediate waf-fix-single-perm-btn" data-key="' + item.key + '" disabled><span class="dashicons dashicons-yes"></span> Fortified</button>';
                } else {
                    html += '<button type="button" class="war-btn-compact war-btn-remediate waf-fix-single-perm-btn" data-key="' + item.key + '"><span class="dashicons dashicons-yes"></span> Set ' + item.recommended_octal + '</button>';
                }
                html += '</td>';
                html += '</tr>';
            });

            tbody.html(html);
        },

        bindSecurityHeadersSuite: function() {
            $('#wafApplyRecommendedHeadersBtn').on('click', function() {
                if (!confirm('Apply the Recommended Full HTTP Security Headers Suite? This enables HSTS, CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, COOP, and CORP.')) {
                    return;
                }

                var btn = $(this);
                btn.prop('disabled', true).html('<span class="dashicons dashicons-update war-spin-icon"></span> Enforcing Full Suite...');

                $.post(waf_fw_ajax.ajax_url, {
                    action: 'waf_harden_apply_recommended_headers',
                    nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
                }, function(r) {
                    btn.prop('disabled', false).html('<span class="dashicons dashicons-shield"></span> 1-Click Apply Recommended Full Suite');
                    if (r && r.success) {
                        hardening.showToast('<strong>Security Headers Suite Enforced:</strong> ' + r.data.message, 'success');
                        hardening.updateScore();
                        setTimeout(function() { window.location.reload(); }, 1200);
                    } else {
                        hardening.showToast('Failed to enforce security headers', 'error');
                    }
                }).fail(function() {
                    btn.prop('disabled', false).html('<span class="dashicons dashicons-shield"></span> 1-Click Apply Recommended Full Suite');
                    hardening.showToast('Network error while applying security headers', 'error');
                });
            });
        },

        bindActivityLog: function() {
            $('#wafClearActivityLogBtn').on('click', function() {
                if (!confirm('Clear the entire hardening activity log history?')) return;

                $.post(waf_fw_ajax.ajax_url, {
                    action: 'waf_harden_clear_activity_log',
                    nonce: typeof waf_fw_ajax !== 'undefined' ? waf_fw_ajax.nonce : ''
                }, function(r) {
                    if (r && r.success) {
                        $('#wafActivityLogTableBody').html('<tr><td colspan="6" class="war-table-empty">Activity history log cleared.</td></tr>');
                        hardening.showToast('Activity history cleared', 'info');
                    }
                });
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
                    }, 400);
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
                        var row = $('.war-control-row[data-feature="' + feature + '"]');
                        if (row.length) {
                            var isEnabled = (info.status === 'enabled');
                            row.find('.war-feature-switch').prop('checked', isEnabled);
                            row.toggleClass('is-enabled', isEnabled).toggleClass('is-disabled', !isEnabled);
                            row.find('.war-status-pill').toggleClass('pill-enabled', isEnabled).toggleClass('pill-disabled', !isEnabled).text(isEnabled ? 'PASS • ACTIVE' : 'DISABLED');
                        }
                    });
                    hardening.showToast('Security posture synchronized', 'info');
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

                    var grade = (d.grade || 'F').toUpperCase();
                    var badge = $('#wafHardenGradeBadge');
                    badge.removeClass('war-grade-a war-grade-b war-grade-c war-grade-d war-grade-f')
                         .addClass('war-grade-' + grade.toLowerCase())
                         .text(grade);

                    $('#wafProtectionStatusLabel')
                        .removeClass('status-optimal status-warning')
                        .addClass(d.score >= 75 ? 'status-optimal' : 'status-warning')
                        .html(d.score >= 75 ? 'Active &bull; Fortified' : 'Needs Attention');

                    // Update category cards
                    if (d.category_scores) {
                        $.each(d.category_scores, function(ckey, cval) {
                            var card = $('.war-cat-card[data-category-filter="' + ckey + '"]');
                            if (card.length) {
                                var colClass = cval.score >= 80 ? 'color-green' : (cval.score >= 50 ? 'color-yellow' : 'color-red');
                                card.find('.war-cat-score-badge').removeClass('color-green color-yellow color-red').addClass(colClass).text(cval.score + '%');
                                card.find('.war-cat-bar-fill').removeClass('color-green color-yellow color-red').addClass(colClass).css('width', cval.score + '%');
                                card.find('.war-cat-meta span:first-child').text(cval.passed + ' Passed');
                                card.find('.war-cat-meta span:last-child').text(cval.failed + ' Failed').toggleClass('text-failed', cval.failed > 0);
                            }
                        });
                    }
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
            this._toastTimer = setTimeout(function() { toast.fadeOut(200); }, 3500);
        }
    };

    $(document).ready(function() {
        hardening.init();
    });
})(jQuery);
