/**
 * MDefender-Pro Enterprise Backup & Restore Client Logic
 */
(function($) {
    'use strict';

    var backupApp = {
        _toastTimer: null,
        _selectedRestoreFile: null,
        _progressInterval: null,

        init: function() {
            this.bindTabs();
            this.bindScopeSelector();
            this.bindCreateBackup();
            this.bindRestoreFlow();
            this.bindDeleteFlow();
            this.bindScheduleForm();
            this.bindUploadDropzone();
            this.bindRefreshBtn();
        },

        bindTabs: function() {
            $(document).on('click', '.mdf-backup-tab', function() {
                var tabId = $(this).data('tab');
                $('.mdf-backup-tab').removeClass('active');
                $(this).addClass('active');

                $('.mdf-backup-tab-pane').hide();
                $('#' + tabId).fadeIn(150);
            });

            // Quick trigger buttons
            $('#mdfOpenCreateBackupModal, #mdfEmptyCreateBtn').on('click', function() {
                $('.mdf-backup-tab[data-tab="mdf-tab-create"]').trigger('click');
            });

            $('#mdfTabBtnUpload').on('click', function() {
                $('.mdf-backup-tab[data-tab="mdf-tab-upload"]').trigger('click');
            });
        },

        bindScopeSelector: function() {
            $(document).on('change', 'input[name="backup_type"]', function() {
                $('.mdf-scope-box').removeClass('active');
                $(this).closest('.mdf-scope-box').addClass('active');

                var val = $(this).val();
                if (val === 'custom') {
                    $('#mdfCustomComponentsWrap').slideDown(150);
                } else {
                    $('#mdfCustomComponentsWrap').slideUp(150);
                }
            });
        },

        startProgressSimulation: function(title, baseMessage, steps) {
            var stepIndex = 0;
            var progress = 10;
            $('#mdfProgressTitle').text(title);
            $('#mdfProgressMessage').text(steps[0] || baseMessage);
            $('#mdfProgressBarFill').css('width', progress + '%');
            $('#mdfProgressModal').fadeIn(150);

            if (this._progressInterval) clearInterval(this._progressInterval);
            this._progressInterval = setInterval(function() {
                if (progress < 92) {
                    progress += Math.floor(Math.random() * 8) + 2;
                    if (progress > 92) progress = 92;
                    $('#mdfProgressBarFill').css('width', progress + '%');

                    var targetStep = Math.min(steps.length - 1, Math.floor((progress / 92) * steps.length));
                    if (targetStep !== stepIndex && steps[targetStep]) {
                        stepIndex = targetStep;
                        $('#mdfProgressMessage').text(steps[stepIndex]);
                    }
                }
            }, 800);
        },

        stopProgressSimulation: function(callback) {
            if (this._progressInterval) {
                clearInterval(this._progressInterval);
                this._progressInterval = null;
            }
            $('#mdfProgressBarFill').css('width', '100%');
            setTimeout(function() {
                $('#mdfProgressModal').fadeOut(150, function() {
                    $('#mdfProgressBarFill').css('width', '0%');
                    if (typeof callback === 'function') callback();
                });
            }, 300);
        },

        bindCreateBackup: function() {
            $('#mdfCreateBackupForm').on('submit', function(e) {
                e.preventDefault();

                var type = $('input[name="backup_type"]:checked').val() || 'full';
                var note = $('#mdfBackupNote').val() || '';
                var components = [];

                if (type === 'custom') {
                    $('input[name="components[]"]:checked').each(function() {
                        components.push($(this).val());
                    });
                    if (components.length === 0) {
                        backupApp.showToast('Please select at least one component to backup.', 'error');
                        return;
                    }
                }

                var steps = [
                    'Analyzing WordPress file system and active database tables...',
                    'Streaming MySQL database tables into binary-safe SQL dump...',
                    'Compressing plugins, themes, and media uploads into secure package...',
                    'Generating backup manifest and verifying archive integrity...',
                    'Finalizing backup archive storage...'
                ];

                backupApp.startProgressSimulation('Creating Site Backup...', 'Processing...', steps);

                var data = {
                    action: 'waf_fw_create_backup',
                    type: type,
                    note: note,
                    nonce: (typeof waf_fw_ajax !== 'undefined') ? waf_fw_ajax.nonce : ''
                };

                if (type === 'custom') {
                    data.components = components;
                }

                var submitBtn = $('#mdfSubmitCreateBackup');
                submitBtn.prop('disabled', true);

                $.post(waf_fw_ajax.ajax_url, data, function(r) {
                    submitBtn.prop('disabled', false);
                    backupApp.stopProgressSimulation(function() {
                        if (r && r.success) {
                            backupApp.showToast(r.data.message || 'Backup created successfully!', 'success');
                            $('#mdfBackupNote').val('');
                            backupApp.reloadBackupsTable();
                            $('.mdf-backup-tab[data-tab="mdf-tab-backups"]').trigger('click');
                        } else {
                            var msg = (r && r.data && r.data.message) ? r.data.message : 'Failed to create backup.';
                            backupApp.showToast('Backup Error: ' + msg, 'error');
                        }
                    });
                }).fail(function() {
                    submitBtn.prop('disabled', false);
                    backupApp.stopProgressSimulation(function() {
                        backupApp.showToast('Server/network error while generating backup archive.', 'error');
                    });
                });
            });
        },

        bindRestoreFlow: function() {
            // Open restore confirmation modal
            $(document).on('click', '.mdf-btn-restore', function(e) {
                e.preventDefault();
                backupApp._selectedRestoreFile = $(this).data('filename');
                $('#mdfRestoreTargetFilename').text(backupApp._selectedRestoreFile);
                $('#mdfRestoreModal').fadeIn(150);
            });

            // Close restore modal
            $('#mdfCloseRestoreModal, #mdfCancelRestoreBtn').on('click', function() {
                $('#mdfRestoreModal').fadeOut(150);
                backupApp._selectedRestoreFile = null;
            });

            // Confirm restoration
            $('#mdfConfirmRestoreBtn').on('click', function() {
                var filename = backupApp._selectedRestoreFile;
                if (!filename) return;

                $('#mdfRestoreModal').fadeOut(100);

                var restoreSteps = [
                    'Validating archive integrity and extracting packages to staging...',
                    'Parsing and streaming MySQL database statements into tables...',
                    'Restoring WordPress plugins, themes, and uploaded files...',
                    'Resetting bytecode opcache and flushing object cache...',
                    'Finalizing site disaster recovery restoration...'
                ];

                backupApp.startProgressSimulation('Restoring Website from Snapshot...', 'Restoring site...', restoreSteps);

                $.post(waf_fw_ajax.ajax_url, {
                    action: 'waf_fw_restore_backup',
                    filename: filename,
                    nonce: (typeof waf_fw_ajax !== 'undefined') ? waf_fw_ajax.nonce : ''
                }, function(r) {
                    backupApp.stopProgressSimulation(function() {
                        if (r && r.success) {
                            backupApp.showToast('<strong>Restoration Successful!</strong> ' + (r.data.message || 'Site restored to snapshot.'), 'success');
                            setTimeout(function() {
                                window.location.reload();
                            }, 2000);
                        } else {
                            var msg = (r && r.data && r.data.message) ? r.data.message : 'Failed to restore backup.';
                            backupApp.showToast('Restore Error: ' + msg, 'error');
                        }
                    });
                }).fail(function() {
                    backupApp.stopProgressSimulation(function() {
                        backupApp.showToast('Server error during site restoration.', 'error');
                    });
                });
            });
        },

        bindDeleteFlow: function() {
            $(document).on('click', '.mdf-btn-delete', function(e) {
                e.preventDefault();
                var filename = $(this).data('filename');
                var row = $(this).closest('tr');

                if (!confirm('Are you sure you want to permanently delete archive: ' + filename + '? This cannot be undone.')) {
                    return;
                }

                $.post(waf_fw_ajax.ajax_url, {
                    action: 'waf_fw_delete_site_backup',
                    filename: filename,
                    nonce: (typeof waf_fw_ajax !== 'undefined') ? waf_fw_ajax.nonce : ''
                }, function(r) {
                    if (r && r.success) {
                        row.fadeOut(200, function() {
                            $(this).remove();
                            backupApp.reloadBackupsTable();
                        });
                        backupApp.showToast('Archive deleted: ' + filename, 'info');
                    } else {
                        backupApp.showToast('Failed to delete backup archive.', 'error');
                    }
                });
            });
        },

        bindScheduleForm: function() {
            $('#mdfScheduleForm').on('submit', function(e) {
                e.preventDefault();

                var enabled = $('#mdfSchedEnabled').is(':checked') ? 1 : 0;
                var freq = $('#mdfSchedFreq').val();
                var type = $('#mdfSchedType').val();
                var retention = $('#mdfSchedRetention').val();

                $.post(waf_fw_ajax.ajax_url, {
                    action: 'waf_fw_save_backup_schedule',
                    enabled: enabled,
                    frequency: freq,
                    type: type,
                    retention: retention,
                    nonce: (typeof waf_fw_ajax !== 'undefined') ? waf_fw_ajax.nonce : ''
                }, function(r) {
                    if (r && r.success) {
                        backupApp.showToast('Automated backup schedule saved successfully.', 'success');
                    } else {
                        backupApp.showToast('Failed to save schedule settings.', 'error');
                    }
                });
            });
        },

        bindUploadDropzone: function() {
            var fileInput = $('#mdfBackupFileInput');
            var dropzone = $('#mdfUploadDropzone');
            var submitBtn = $('#mdfSubmitUploadBtn');
            var fileLabel = $('#mdfSelectedFileLabel');

            $('#mdfBrowseBtn, #mdfUploadDropzone').on('click', function(e) {
                if (e.target.id !== 'mdfBrowseBtn' && e.target.id !== 'mdfUploadDropzone') return;
                fileInput.trigger('click');
            });

            fileInput.on('change', function() {
                var file = this.files[0];
                if (file) {
                    fileLabel.text('Selected File: ' + file.name + ' (' + (file.size / (1024 * 1024)).toFixed(2) + ' MB)').show();
                    submitBtn.prop('disabled', false);
                } else {
                    fileLabel.hide();
                    submitBtn.prop('disabled', true);
                }
            });

            // Drag & Drop
            dropzone.on('dragover dragenter', function(e) {
                e.preventDefault();
                e.stopPropagation();
                $(this).css('border-color', '#4f46e5');
            });

            dropzone.on('dragleave dragend drop', function(e) {
                e.preventDefault();
                e.stopPropagation();
                $(this).css('border-color', '#cbd5e1');
            });

            dropzone.on('drop', function(e) {
                var dt = e.originalEvent.dataTransfer;
                if (dt && dt.files.length) {
                    fileInput[0].files = dt.files;
                    fileInput.trigger('change');
                }
            });

            // Upload Form Submit
            $('#mdfUploadBackupForm').on('submit', function(e) {
                e.preventDefault();
                var file = fileInput[0].files[0];
                if (!file) return;

                var formData = new FormData();
                formData.append('action', 'waf_fw_upload_backup');
                formData.append('backup_file', file);
                formData.append('nonce', (typeof waf_fw_ajax !== 'undefined') ? waf_fw_ajax.nonce : '');

                backupApp.startProgressSimulation('Uploading Archive...', 'Transferring backup package to server...', [
                    'Uploading archive package to server...',
                    'Verifying checksums and unpacking structure...',
                    'Registering archive in disaster recovery catalog...'
                ]);

                $.ajax({
                    url: waf_fw_ajax.ajax_url,
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function(r) {
                        backupApp.stopProgressSimulation(function() {
                            if (r && r.success) {
                                backupApp.showToast(r.data.message || 'Backup archive uploaded successfully!', 'success');
                                fileInput.val('');
                                fileLabel.hide();
                                submitBtn.prop('disabled', true);
                                backupApp.reloadBackupsTable();
                                $('.mdf-backup-tab[data-tab="mdf-tab-backups"]').trigger('click');
                            } else {
                                var msg = (r && r.data && r.data.message) ? r.data.message : 'Upload failed.';
                                backupApp.showToast('Upload Error: ' + msg, 'error');
                            }
                        });
                    },
                    error: function() {
                        backupApp.stopProgressSimulation(function() {
                            backupApp.showToast('Network error during file upload.', 'error');
                        });
                    }
                });
            });
        },

        bindRefreshBtn: function() {
            $('#mdfRefreshBackups').on('click', function() {
                var btn = $(this);
                btn.find('.dashicons').addClass('war-spin-icon');
                backupApp.reloadBackupsTable(function() {
                    btn.find('.dashicons').removeClass('war-spin-icon');
                    backupApp.showToast('Backups catalog synchronized.', 'info');
                });
            });
        },

        reloadBackupsTable: function(callback) {
            $.get(waf_fw_ajax.ajax_url, {
                action: 'waf_fw_get_backups'
            }, function(r) {
                if (r && r.success && r.data && r.data.backups) {
                    var backups = r.data.backups;
                    var tbody = $('#mdfBackupsTableBody');
                    tbody.empty();

                    var totalCount = backups.length;
                    var totalSizeBytes = 0;

                    if (totalCount === 0) {
                        var emptyHtml = '<tr class="mdf-empty-row"><td colspan="6">' +
                            '<div class="mdf-empty-state">' +
                            '<span class="dashicons dashicons-backup"></span>' +
                            '<h4>No Backups Created Yet</h4>' +
                            '<p>Protect your website from data loss by generating a snapshot.</p>' +
                            '<button type="button" class="mdf-btn mdf-btn-emerald" id="mdfEmptyCreateBtn">Create First Backup</button>' +
                            '</div></td></tr>';
                        tbody.html(emptyHtml);
                    } else {
                        var downloadNonce = (typeof waf_fw_ajax !== 'undefined' && waf_fw_ajax.download_nonce) ? waf_fw_ajax.download_nonce : ((typeof waf_fw_ajax !== 'undefined') ? waf_fw_ajax.nonce : '');

                        $.each(backups, function(idx, b) {
                            totalSizeBytes += (b.size || 0);
                            var bType = b.type || 'full';
                            var bName = b.filename || '';
                            var comps = b.components || ['Full Site'];
                            var compPills = '';

                            $.each(comps, function(i, c) {
                                compPills += '<span class="mdf-comp-pill">' + c + '</span> ';
                            });

                            var downloadUrl = 'admin.php?action=waf_fw_download_backup&file=' + encodeURIComponent(bName) + '&_wpnonce=' + encodeURIComponent(downloadNonce);

                            var rowHtml = '<tr data-filename="' + bName + '">' +
                                '<td><div class="mdf-file-col">' +
                                '<span class="dashicons ' + (bType === 'database' ? 'dashicons-database' : 'dashicons-media-archive') + '"></span>' +
                                '<div><strong class="mdf-filename">' + bName + '</strong>' +
                                (b.note ? '<small class="mdf-note-tag">' + b.note + '</small>' : '') +
                                '</div></div></td>' +
                                '<td><span class="mdf-type-badge mdf-badge-' + bType + '">' + bType.toUpperCase() + '</span></td>' +
                                '<td><div class="mdf-comp-pills">' + compPills + '</div></td>' +
                                '<td><strong>' + (b.size_formatted || '0 MB') + '</strong></td>' +
                                '<td>' + (b.created_at || '') + '</td>' +
                                '<td><div class="mdf-actions-col">' +
                                '<button type="button" class="mdf-action-btn mdf-btn-restore" data-filename="' + bName + '" title="Restore website"><span class="dashicons dashicons-backup"></span> Restore</button>' +
                                '<a href="' + downloadUrl + '" class="mdf-action-btn mdf-btn-download" title="Download"><span class="dashicons dashicons-download"></span> Download</a>' +
                                '<button type="button" class="mdf-action-btn mdf-btn-delete" data-filename="' + bName + '" title="Delete"><span class="dashicons dashicons-trash"></span></button>' +
                                '</div></td>' +
                                '</tr>';
                            tbody.append(rowHtml);
                        });
                    }

                    $('#mdfKpiCount').text(totalCount + ' Archives');
                    $('.mdf-backup-tab[data-tab="mdf-tab-backups"] span:last-child').text('Backup Archives (' + totalCount + ')');
                }
                if (typeof callback === 'function') callback();
            });
        },

        showToast: function(message, type) {
            var toast = $('#mdfBackupToast');
            if (this._toastTimer) clearTimeout(this._toastTimer);

            toast.removeClass('toast-error').html(message);
            if (type === 'error') toast.addClass('toast-error');

            toast.stop(true, true).fadeIn(200);
            this._toastTimer = setTimeout(function() {
                toast.fadeOut(300);
            }, 4000);
        }
    };

    $(document).ready(function() {
        backupApp.init();
    });

})(jQuery);
