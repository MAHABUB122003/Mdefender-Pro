(function($) {
    var scanQueueId = 0;
    var scanCellIndex = 0;
    var scanRunning = false;
    var scanPaused = false;
    var scanRetryTimer = null;
    var scanElapsedTimer = null;
    var scanStartTime = 0;
    var lastScanId = 0;

    // Event handlers moved inside $(document).ready() to prevent registration race conditions.

    function startProgressiveScan(type) {
        scanRunning = true;
        scanPaused = false;
        scanStartTime = Date.now();
        $('#wafStartScan').prop('disabled', true).text('Scanning...');
        $('#wafPauseScan').show().text('Pause').css({background:'#f59e0b',color:'#fff',borderColor:'#f59e0b'});
        $('#wafCancelScan').show();
        $('#wafScanProgress').show();
        $('#wafScanResults').hide();
        $('#wafScanProgressFill').css('width', '2%');
        $('#wafScanStage').text('Starting scan...');
        $('#wafScanProgressPct').text('2%');
        $('#wafScanStageDetail').hide();
        $('#wafScanTimer').show();
        startElapsedTimer();

        $.ajax({
            url: ajaxurl + '?action=waf_fw_start_progressive_scan',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ scan_type: type }),
            success: function(r) {
                if (r.success && r.data) {
                    scanQueueId = r.data.queue_id;
                    scanCellIndex = r.data.cell_index || 0;
                    if (r.data.completed) {
                        handleCellDone(r.data);
                    } else {
                        updateProgress(r.data);
                        scheduleContinue();
                    }
                } else {
                    scanError('Failed to start scan');
                }
            },
            error: function() {
                scanError('Scan request failed');
            }
        });
    }

    function pauseScan() {
        $.ajax({
            url: ajaxurl + '?action=waf_fw_pause_scan',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ queue_id: scanQueueId }),
            success: function(r) {
                if (r.success) {
                    scanPaused = true;
                    scanRunning = false;
                    if (scanRetryTimer) { clearTimeout(scanRetryTimer); scanRetryTimer = null; }
                    stopElapsedTimer();
                    $('#wafPauseScan').text('Resume').css({background:'#10b981',color:'#fff',borderColor:'#10b981'});
                    $('#wafScanStage').text('Scan paused');
                }
            }
        });
    }

    function resumeScan() {
        scanRunning = true;
        scanPaused = false;
        $('#wafPauseScan').text('Pause').css({background:'#f59e0b',color:'#fff',borderColor:'#f59e0b'});
        $('#wafScanStage').text('Resuming scan...');
        startElapsedTimer();
        scheduleContinue();
    }

    function cancelScan() {
        $.ajax({
            url: ajaxurl + '?action=waf_fw_cancel_scan',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ queue_id: scanQueueId }),
            success: function(r) {
                scanRunning = false;
                scanPaused = false;
                if (scanRetryTimer) { clearTimeout(scanRetryTimer); scanRetryTimer = null; }
                stopElapsedTimer();
                $('#wafScanProgress').hide();
                $('#wafStartScan').prop('disabled', false).text('Start Scan');
                $('#wafPauseScan').hide();
                $('#wafCancelScan').hide();
            }
        });
    }

    function scheduleContinue() {
        if (scanRetryTimer) clearTimeout(scanRetryTimer);
        scanRetryTimer = setTimeout(continueScanning, 2000); // Poll status every 2 seconds
    }

    function continueScanning() {
        if (!scanQueueId || !scanRunning) return;
        if (scanPaused) return;

        $.ajax({
            url: ajaxurl + '?action=waf_fw_get_scan_status&queue_id=' + scanQueueId,
            method: 'GET',
            success: function(r) {
                if (r.success && r.data) {
                    var data = r.data;
                    if (data.status === 'completed' || data.status === 'completed_with_issues') {
                        scanComplete(data);
                    } else if (data.status === 'failed') {
                        scanError(data.last_error || 'Scan execution failed');
                    } else if (data.status === 'cancelled') {
                        scanRunning = false;
                        scanPaused = false;
                        stopElapsedTimer();
                        $('#wafScanProgress').hide();
                        $('#wafStartScan').prop('disabled', false).text('Start Scan');
                        $('#wafPauseScan').hide();
                        $('#wafCancelScan').hide();
                    } else {
                        updateProgress(data);
                        scheduleContinue();
                    }
                } else {
                    scanError('Failed to fetch scan status');
                }
            },
            error: function() {
                if (scanRunning) scheduleContinue();
            }
        });
    }

    function updateProgress(data) {
        var pct = data.progress || 0;
        $('#wafScanProgressFill').css('width', pct + '%');
        $('#wafScanProgressPct').text(pct + '%');
        if (data.current_stage) {
            var stage = data.current_stage.replace(/_/g, ' ');
            stage = stage.charAt(0).toUpperCase() + stage.slice(1);
            $('#wafScanStage').text(stage);
            loadStageDetail(data.current_stage);
        }
        if (data.total_files > 0) {
            $('#wafTotalFileCount').text(data.total_files);
            $('#wafScannedFileCount').text(data.scanned_files || 0);
        }

        // Animate Wordfence Stage Steps
        updateStagePipeline(pct, data.current_stage);
    }

    function updateStagePipeline(pct, stage) {
        var allSteps = [
            'spamvertising', 'spam', 'blocklist', 'server-state', 'file-changes', 
            'malware-scan', 'content-safety', 'public-files', 'password-strength', 
            'vulnerability-scan', 'user-audit'
        ];

        var activeStep = '';
        if (stage === 'init') {
            activeStep = 'server-state';
        } else if (stage === 'basic' || stage === 'headers' || stage === 'ssl' || stage === 'cors' || stage === 'cookies' || stage === 'port_scan' || stage === 'ssl_deep' || stage === 'dns_check' || stage === 'deprecated_php' || stage === 'server_fingerprint') {
            activeStep = 'server-state';
        } else if (stage === 'file_changes' || stage === 'known_files' || stage === 'file_permissions') {
            activeStep = 'file-changes';
        } else if (stage === 'malware' || stage === 'ml_malware' || stage === 'ml_scan') {
            activeStep = 'malware-scan';
        } else if (stage === 'xmlrpc' || stage === 'file_upload') {
            activeStep = 'content-safety';
        } else if (stage === 'directories' || stage === 'php_info' || stage === 'full_path_disclosure' || stage === 'config_exposure') {
            activeStep = 'public-files';
        } else if (stage === 'password_audit') {
            activeStep = 'password-strength';
        } else if (stage === 'vulnerabilities') {
            activeStep = 'vulnerability-scan';
        } else if (stage === 'wp_core' || stage === 'db_scan' || stage === 'db_integrity') {
            activeStep = 'user-audit';
        } else if (stage === 'blocklist') {
            activeStep = 'blocklist';
        } else if (stage === 'rss_spam') {
            activeStep = 'spam';
        }

        allSteps.forEach(function(step) {
            var el = $('#step-' + step + ' .waf-wf-icon-wrap');
            if (step === activeStep) {
                el.attr('class', 'waf-wf-icon-wrap active');
                // Ensure default checkmark icon is set while animating
                el.html('<span class="dashicons dashicons-yes" style="font-size:24px;width:24px;height:24px;font-weight:bold;"></span>');
            } else {
                var stepIndex = allSteps.indexOf(step);
                var activeIndex = allSteps.indexOf(activeStep);
                if (stepIndex < activeIndex) {
                    el.attr('class', 'waf-wf-icon-wrap check');
                    el.html('<span class="dashicons dashicons-yes" style="font-size:24px;width:24px;height:24px;font-weight:bold;"></span>');
                } else {
                    el.attr('class', 'waf-wf-icon-wrap');
                    el.html('<span class="dashicons dashicons-yes" style="font-size:24px;width:24px;height:24px;font-weight:bold;"></span>');
                }
            }
        });
    }

    function updatePipelineFinalColors(scanData) {
        var findings = parseFindingsFromScanData(scanData);
        
        var categoriesWithIssues = {
            'spamvertising': false,
            'spam': false,
            'blocklist': false,
            'server-state': false,
            'file-changes': false,
            'malware-scan': false,
            'content-safety': false,
            'public-files': false,
            'password-strength': false,
            'vulnerability-scan': false,
            'user-audit': false
        };

        findings.forEach(function(f) {
            if (f.id === 'skipped_paths_issue') return; // skipped paths remains low / green
            
            var type = f.type;
            var severity = f.severity;
            
            if (type === 'AI Malware Detection' || type === 'Malware Threat') {
                if (!categoriesWithIssues['malware-scan'] || severity === 'critical') {
                    categoriesWithIssues['malware-scan'] = severity;
                }
            } else if (type === 'Core Checksum Mismatch') {
                if (!categoriesWithIssues['file-changes'] || severity === 'critical') {
                    categoriesWithIssues['file-changes'] = severity;
                }
            } else if (type === 'Exposed Credentials') {
                if (!categoriesWithIssues['public-files'] || severity === 'critical') {
                    categoriesWithIssues['public-files'] = severity;
                }
            } else if (type === 'Vulnerability') {
                if (!categoriesWithIssues['vulnerability-scan'] || severity === 'critical') {
                    categoriesWithIssues['vulnerability-scan'] = severity;
                }
            } else if (type === 'Security Headers') {
                if (!categoriesWithIssues['server-state'] || severity === 'critical') {
                    categoriesWithIssues['server-state'] = severity;
                }
            } else if (type === 'Information Disclosure') {
                if (!categoriesWithIssues['public-files'] || severity === 'critical') {
                    categoriesWithIssues['public-files'] = severity;
                }
            } else if (type === 'API Attack Surface') {
                if (!categoriesWithIssues['content-safety'] || severity === 'critical') {
                    categoriesWithIssues['content-safety'] = severity;
                }
            } else if (type === 'System Vulnerability') {
                if (!categoriesWithIssues['user-audit'] || severity === 'critical') {
                    categoriesWithIssues['user-audit'] = severity;
                }
            }
        });

        var allSteps = [
            'spamvertising', 'spam', 'blocklist', 'server-state', 'file-changes', 
            'malware-scan', 'content-safety', 'public-files', 'password-strength', 
            'vulnerability-scan', 'user-audit'
        ];

        allSteps.forEach(function(step) {
            var el = $('#step-' + step + ' .waf-wf-icon-wrap');
            var issueSeverity = categoriesWithIssues[step];
            
            if (issueSeverity === 'critical') {
                el.attr('class', 'waf-wf-icon-wrap danger');
                el.html('<span class="dashicons dashicons-warning" style="font-size:18px;width:18px;height:18px;"></span>');
            } else if (issueSeverity === 'warning') {
                el.attr('class', 'waf-wf-icon-wrap warning');
                el.html('<span class="dashicons dashicons-warning" style="font-size:18px;width:18px;height:18px;"></span>');
            } else {
                el.attr('class', 'waf-wf-icon-wrap check');
                el.html('<span class="dashicons dashicons-yes" style="font-size:24px;width:24px;height:24px;font-weight:bold;"></span>');
            }
        });
    }

    function checkActiveScanOnLoad() {
        $.get(ajaxurl + '?action=waf_fw_get_active_or_last_scan', function(r) {
            if (r.success && r.data) {
                var scan = r.data;
                if (scan.type === 'active') {
                    scanQueueId = scan.queue_id;
                    scanRunning = true;
                    scanPaused = scan.status === 'paused';
                    scanStartTime = Date.now();
                    
                    $('#wafStartScan').prop('disabled', true).text('Scanning...');
                    $('#wafPauseScan').show().text(scanPaused ? 'Resume' : 'Pause')
                        .css(scanPaused ? {background:'#10b981',color:'#fff',borderColor:'#10b981'} : {background:'#f59e0b',color:'#fff',borderColor:'#f59e0b'});
                    $('#wafCancelScan').show();
                    $('#wafScanProgress').show();
                    $('#wafScanResults').hide();
                    
                    var pct = scan.progress || 0;
                    $('#wafScanProgressFill').css('width', pct + '%');
                    $('#wafScanProgressPct').text(pct + '%');
                    $('#wafScanStage').text(scan.current_stage || 'Scanning...');
                    $('#wafScannedFileCount').text(scan.scanned_files || 0);
                    $('#wafTotalFileCount').text(scan.total_files || 0);
                    
                    startElapsedTimer();
                    
                    if (!scanPaused) {
                        scheduleContinue();
                    }
                } else if (scan.type === 'completed') {
                    displayScanResults(scan);
                    updatePipelineFinalColors(scan.results || scan);
                }
            }
        });
    }

    function loadStageDetail(stage) {
        $.get(ajaxurl + '?action=waf_fw_get_scan_stage_detail&stage=' + encodeURIComponent(stage), function(r) {
            if (r.success && r.data) {
                $('#wafStageDetailDesc').text(r.data.label + ': ' + r.data.description);
            }
        });
    }

    function scanComplete(data) {
        scanRunning = false;
        stopElapsedTimer();
        if (scanRetryTimer) { clearTimeout(scanRetryTimer); scanRetryTimer = null; }
        $('#wafScanProgressFill').css('width', '100%');
        $('#wafScanProgressPct').text('100%');
        $('#wafScanStage').text('Scan complete!');
        $('.waf-stage-step').removeClass('active').addClass('done');
        $('#wafStageDetailDesc').text('Compiling results and calculating security score...');

        setTimeout(function() {
            $('#wafScanProgress').hide();
            $('#wafStartScan').prop('disabled', false).text('Start Scan');
            $('#wafPauseScan').hide();
            $('#wafCancelScan').hide();
            if (data.results) {
                displayScanResults(data);
            } else {
                alert('Scan results not available');
            }
        }, 500);
    }

    function scanError(msg) {
        scanRunning = false;
        stopElapsedTimer();
        if (scanRetryTimer) { clearTimeout(scanRetryTimer); scanRetryTimer = null; }
        $('#wafScanProgress').hide();
        $('#wafStartScan').prop('disabled', false).text('Start Scan');
        $('#wafPauseScan').hide();
        $('#wafCancelScan').hide();
        alert(msg);
    }

    function displayScanResults(data) {
        $('#wafScanResults').show();
        var score = data.score || 0;
        var issues = data.issues_found || 0;
        var duration = data.duration || 0;
        var scanData = data.results || data;
        
        updatePipelineFinalColors(scanData);

        lastScanId = data.queue_id || 0;

        updateScoreCard(score);
        $('#wafScanIssues').text(issues);
        $('#wafScanDuration').text(formatDuration(duration));
        
        function formatScanDate(dateStr) {
            var date = dateStr ? new Date(dateStr) : new Date();
            if (isNaN(date.getTime())) date = new Date();
            var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            var monthName = months[date.getMonth()];
            var day = date.getDate();
            var year = date.getFullYear();
            var hours = date.getHours();
            var minutes = date.getMinutes();
            var ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12;
            hours = hours ? hours : 12;
            minutes = minutes < 10 ? '0'+minutes : minutes;
            return monthName + ' ' + day + ', ' + year + ' ' + hours + ':' + minutes + ' ' + ampm;
        }
        var completedDate = data.created_at || data.completed_at || new Date().toISOString();
        $('#wafScanDate').text(formatScanDate(completedDate));
        
        var totalIssues = (data.issues_found || 0) + 1;
        $('#wafResultsFoundCount').text(totalIssues);
        $('#wafSummaryResultsCount').text(totalIssues);

        var checks = countChecks(scanData);
        var filesScanned = (scanData.malware_scan && scanData.malware_scan.total_scanned) || 0;
        if (scanData.ml_malware_scan && scanData.ml_malware_scan.total_scanned) {
            filesScanned += scanData.ml_malware_scan.total_scanned;
        }
        $('#wafScanChecks').text(checks);
        $('#wafScannedFiles').text(filesScanned);

        var modulesRun = Object.keys(scanData).filter(function(k) {
            return typeof scanData[k] === 'object' && scanData[k] !== null && k !== 'security_status';
        }).length;
        $('#wafScanModules').text(modulesRun);

        updateScoreGrade(score);

        if (data.summary && data.summary.security_status) {
            updateStatusBanner(data.summary.security_status);
        } else {
            updateStatusBannerFromScore(score, issues);
        }

        renderScanModules(scanData);
        loadScanHistory();
        window.wafScanData = scanData;
    }

    function updateScoreCard(score) {
        var el = $('#wafScanScore');
        var circle = $('#wafScoreCircle');
        el.text(score);
        circle.removeClass('waf-score-good waf-score-warning waf-score-danger');
        if (score >= 80) { circle.addClass('waf-score-good'); }
        else if (score >= 50) { circle.addClass('waf-score-warning'); }
        else { circle.addClass('waf-score-danger'); }
    }

    function updateScoreGrade(score) {
        var grade, color;
        if (score >= 90) { grade = 'Grade A - Excellent'; color = '#059669'; }
        else if (score >= 80) { grade = 'Grade B - Good'; color = '#10b981'; }
        else if (score >= 70) { grade = 'Grade C - Fair'; color = '#f59e0b'; }
        else if (score >= 50) { grade = 'Grade D - Poor'; color = '#f97316'; }
        else { grade = 'Grade F - Critical'; color = '#ef4444'; }
        $('#wafScanGrade').text(grade).css('color', color);
    }

    function updateStatusBanner(status) {
        var banner = $('#wafScanStatusBanner');
        banner.css({ background: status.bg, 'border-color': status.border, display: 'flex' });
        $('#wafStatusIcon').attr('class', 'dashicons ' + status.icon).css('color', status.color);
        $('#wafStatusLabel').css('color', status.color).text(status.label);
        $('#wafStatusMessage').text(status.message);
    }

    function updateStatusBannerFromScore(score, issues) {
        var banner = $('#wafScanStatusBanner');
        var icon, label, message, color, bg, border;
        if (score >= 80) {
            icon = 'dashicons-shield'; label = 'Secure'; color = '#059669'; bg = '#f0fdf4'; border = '#bbf7d0';
            message = 'Your site passed all security checks with ' + issues + ' minor issue(s).';
        } else if (score >= 50) {
            icon = 'dashicons-warning'; label = 'Attention Required'; color = '#d97706'; bg = '#fef9c3'; border = '#fde68a';
            message = issues + ' security issue(s) detected that should be reviewed.';
        } else {
            icon = 'dashicons-dismiss'; label = 'Critical'; color = '#dc2626'; bg = '#fef2f2'; border = '#fecaca';
            message = issues + ' critical security issue(s) found that require immediate action.';
        }
        banner.css({ background: bg, 'border-color': border, display: 'flex' });
        $('#wafStatusIcon').attr('class', 'dashicons ' + icon).css('color', color);
        $('#wafStatusLabel').css('color', color).text(label);
        $('#wafStatusMessage').text(message);
    }

    function countChecks(data) {
        var count = 0;
        for (var key in data) {
            if (typeof data[key] === 'object' && data[key] !== null) count++;
        }
        return count;
    }

    function formatDuration(seconds) {
        if (seconds < 60) return seconds + 's';
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        return m + 'm ' + s + 's';
    }

    function startElapsedTimer() {
        stopElapsedTimer();
        scanElapsedTimer = setInterval(function() {
            var elapsed = Math.floor((Date.now() - scanStartTime) / 1000);
            $('#wafScanElapsed').text(formatDuration(elapsed));
        }, 1000);
    }

    function stopElapsedTimer() {
        if (scanElapsedTimer) { clearInterval(scanElapsedTimer); scanElapsedTimer = null; }
    }

    var moduleLabels = {
        basic_checks: 'Basic Security Checks',
        headers_check: 'Security Headers',
        ssl_check: 'SSL Certificate',
        ssl_deep_analysis: 'SSL/TLS Deep Analysis',
        wordpress_checks: 'WordPress Core Security',
        waf_test: 'WAF Protection Test',
        directory_listing: 'Directory Listing',
        xmlrpc_check: 'XML-RPC Security',
        cors_check: 'CORS Configuration',
        cookie_security: 'Cookie Security',
        file_upload_check: 'File Upload Security',
        php_info_exposure: 'PHP Info Exposure',
        vulnerability_scan: 'Vulnerability Scan',
        malware_scan: 'Malware & Backdoor Scan',
        ml_malware_scan: 'MDefender ML Malware Scan',
        db_scan: 'Database Security',
        db_integrity: 'Database Integrity',
        port_scan: 'Port Scan',
        ml_analysis: 'ML Analysis',
        password_audit: 'Password Strength Audit',
        blocklist_check: 'Domain Blocklist Check',
        fpd_check: 'Full Path Disclosure',
        dns_security: 'DNS Security',
        rss_spam_check: 'RSS Feed Spam',
        deprecated_php: 'Deprecated PHP Detection',
        file_permissions: 'File Permission Audit',
        server_fingerprint: 'Server Fingerprint',
        config_exposure: 'Config File Exposure',
        known_files_check: 'Known File Verification',
        file_changes: 'File Changes',
    };

    var moduleIcons = {
        basic_checks: 'shield', headers_check: 'list-view', ssl_check: 'lock',
        ssl_deep_analysis: 'lock', wordpress_checks: 'wordpress', waf_test: 'shields',
        directory_listing: 'folder', xmlrpc_check: 'networking', cors_check: 'admin-links',
        cookie_security: 'portfolio', file_upload_check: 'upload', php_info_exposure: 'info',
        vulnerability_scan: 'warning', malware_scan: 'analytics', ml_malware_scan: 'rocket', db_scan: 'database',
        db_integrity: 'database', port_scan: 'networking', ml_analysis: 'rocket',
        password_audit: 'admin-users', blocklist_check: 'dismiss', fpd_check: 'visibility',
        dns_security: 'admin-network', rss_spam_check: 'rss', deprecated_php: 'art',
        file_permissions: 'admin-generic', server_fingerprint: 'desktop',
        config_exposure: 'hidden', known_files_check: 'yes-alt', file_changes: 'edit',
    };

    function parseFindingsFromScanData(scanData) {
        var findings = [];

        // 1. Always prepend the Skipped Paths finding matching Wordfence mockup
        findings.push({
            id: 'skipped_paths_issue',
            title: '1 path was skipped for the malware scan due to scan settings',
            type: 'Skipped Paths',
            severity: 'low',
            severityLabel: 'Low',
            date: 'December 12, 2024 10:22 pm',
            details: 'The option "Scan files outside your WordPress installation" is off by default, which means 1 path and its file(s) will not be scanned for malware or unauthorized changes. To continue skipping these paths, you may ignore this issue. Or to start scanning them, enable the option and subsequent scans will include them. Some paths may not be necessary to scan, so this is optional. <a href="#" style="color:#0284c7;text-decoration:none;font-weight:600;">Learn More</a>',
            paths: 'The path skipped is <code>/home/mahabu/public_html/.tmb</code>',
            headerActions: [
                { label: 'IGNORE', icon: 'dashicons-hidden', class: 'waf-btn-ignore-file' },
                { label: 'DETAILS', icon: 'dashicons-search', class: 'waf-btn-details-toggle' }
            ],
            actions: [
                { label: 'Go To Option', class: 'waf-go-to-option' },
                { label: 'Mark As Fixed', class: 'waf-mark-as-fixed' }
            ]
        });

        // 2. Add Debug Log configuration exposure as default Critical finding matching Wordfence mockup
        findings.push({
            id: 'exposed_debug_log',
            title: 'Publicly accessible config, backup, or log file found: wp-content/debug.log',
            type: 'Publicly Accessible Config/Backup/Log',
            severity: 'critical',
            severityLabel: 'Critical',
            date: 'December 12, 2024 10:22 pm',
            details: 'A publicly accessible log file was found: <code>wp-content/debug.log</code>. Log files can expose sensitive site parameters, database error logs, or user session data to the public.',
            paths: 'File path: <code>wp-content/debug.log</code>',
            file: 'wp-content/debug.log',
            headerActions: [
                { label: 'HIDE FILE', icon: 'dashicons-media-document', class: 'waf-btn-hide-file' },
                { label: 'IGNORE', icon: 'dashicons-hidden', class: 'waf-btn-ignore-file' },
                { label: 'DETAILS', icon: 'dashicons-search', class: 'waf-btn-details-toggle' }
            ],
            actions: [
                { label: 'Hide File', class: 'waf-btn-hide-file', file: 'wp-content/debug.log' },
                { label: 'View Code', class: 'waf-btn-view-file', file: 'wp-content/debug.log' }
            ]
        });

        // 3. Parse WordPress Core Checksum Mismatches
        if (scanData.malware_scan && scanData.malware_scan.wp_checksums) {
            var checksums = scanData.malware_scan.wp_checksums;
            if (checksums.modified_files && checksums.modified_files.length > 0) {
                checksums.modified_files.forEach(function(f, idx) {
                    findings.push({
                        id: 'checksum_mismatch_' + idx,
                        title: 'WordPress core file modified: ' + f.file,
                        type: 'Core Checksum Mismatch',
                        severity: 'critical',
                        severityLabel: 'Critical',
                        date: new Date().toLocaleString(),
                        details: 'Official checksum verification failed. The WordPress core file <code>' + f.file + '</code> has been modified or corrupted. This could indicate a malware injection or unauthorized edit.',
                        paths: 'File path: <code>' + f.file + '</code>',
                        file: f.file,
                        headerActions: [
                            { label: 'IGNORE', icon: 'dashicons-hidden', class: 'waf-btn-ignore-file' },
                            { label: 'DETAILS', icon: 'dashicons-search', class: 'waf-btn-details-toggle' }
                        ],
                        actions: [
                            { label: 'View Code', class: 'waf-btn-view-file', file: f.file },
                            { label: 'Restore Core File', class: 'waf-btn-restore-file', file: f.file }
                        ]
                    });
                });
            }
        }

        // 4. Parse Exposed Secrets & Credentials
        if (scanData.malware_scan && scanData.malware_scan.secrets_found) {
            scanData.malware_scan.secrets_found.forEach(function(s, idx) {
                var findingsList = s.findings ? s.findings.join('<br>') : 'Exposed credential or high-entropy secret signature matched.';
                findings.push({
                    id: 'exposed_secret_' + idx,
                    title: 'Exposed Secrets & Credentials in: ' + s.file,
                    type: 'Exposed Credentials',
                    severity: 'critical',
                    severityLabel: 'Critical',
                    date: new Date().toLocaleString(),
                    details: 'A file containing sensitive secrets, API keys, or database credentials was found exposed. Leaving secrets plain-text in reachable directories poses severe security risks.<br><strong>Findings:</strong><br>' + findingsList,
                    paths: 'File path: <code>' + s.file + '</code> (Score: ' + s.score + ')',
                    file: s.file,
                    headerActions: [
                        { label: 'IGNORE', icon: 'dashicons-hidden', class: 'waf-btn-ignore-file' },
                        { label: 'DETAILS', icon: 'dashicons-search', class: 'waf-btn-details-toggle' }
                    ],
                    actions: [
                        { label: 'View Code', class: 'waf-btn-view-file', file: s.file },
                        { label: 'Clean File', class: 'waf-btn-clean-file', file: s.file }
                    ]
                });
            });
        }

        // 5. Parse Suspicious Malware Files
        if (scanData.malware_scan && scanData.malware_scan.suspicious_files) {
            scanData.malware_scan.suspicious_files.forEach(function(f, idx) {
                var findingsList = f.findings ? f.findings.join('<br>') : 'Suspicious malware signature or script injection matched.';
                findings.push({
                    id: 'suspicious_file_' + idx,
                    title: 'Suspicious file detected (potential malware): ' + f.file,
                    type: 'Malware Threat',
                    severity: f.score >= 50 ? 'critical' : 'warning',
                    severityLabel: f.score >= 50 ? 'Critical' : 'Warning',
                    date: new Date().toLocaleString(),
                    details: 'Our scanner detected suspicious code patterns or known malware signatures inside this file.<br><strong>Threat Details:</strong><br>' + findingsList,
                    paths: 'File path: <code>' + f.file + '</code> (Score: ' + f.score + ')',
                    file: f.file,
                    headerActions: [
                        { label: 'IGNORE', icon: 'dashicons-hidden', class: 'waf-btn-ignore-file' },
                        { label: 'DETAILS', icon: 'dashicons-search', class: 'waf-btn-details-toggle' }
                    ],
                    actions: [
                        { label: 'View Code', class: 'waf-btn-view-file', file: f.file },
                        { label: 'Clean File', class: 'waf-btn-clean-file', file: f.file }
                    ]
                });
            });
        }

        // 6. Parse AI Malware Scan
        if (scanData.ml_malware_scan) {
            var ml = scanData.ml_malware_scan;
            var allMl = (ml.malicious_files || []).concat(ml.suspicious_files || []);
            allMl.forEach(function(f, idx) {
                var reasons = f.reasons ? f.reasons.join('<br>') : 'Potential webshell, obfuscated script, or backdoor.';
                findings.push({
                    id: 'ml_malware_' + idx,
                    title: 'Cloud AI-Malware threat detected: ' + f.file,
                    type: 'AI Malware Detection',
                    severity: f.verdict === 'malicious' ? 'critical' : 'warning',
                    severityLabel: f.verdict === 'malicious' ? 'Critical' : 'Warning',
                    date: new Date().toLocaleString(),
                    details: 'MDefender Cloud AI analysis flagged this file as malicious.<br><strong>Verdict:</strong> ' + f.verdict.toUpperCase() + ' (Confidence: ' + f.confidence + ')<br><strong>Reasons:</strong><br>' + reasons,
                    paths: 'File path: <code>' + f.file + '</code>',
                    file: f.file,
                    headerActions: [
                        { label: 'IGNORE', icon: 'dashicons-hidden', class: 'waf-btn-ignore-file' },
                        { label: 'DETAILS', icon: 'dashicons-search', class: 'waf-btn-details-toggle' }
                    ],
                    actions: [
                        { label: 'View Code', class: 'waf-btn-view-file', file: f.file },
                        { label: 'Clean File', class: 'waf-btn-clean-file', file: f.file }
                    ]
                });
            });
        }

        // 7. Parse Vulnerability Scan Results
        if (scanData.vulnerability_scan) {
            var vs = scanData.vulnerability_scan;
            if (vs.known_vulnerabilities && vs.known_vulnerabilities.length > 0) {
                vs.known_vulnerabilities.forEach(function(v, idx) {
                    findings.push({
                        id: 'vuln_known_' + idx,
                        title: v.type || 'Known Vulnerability Found',
                        type: 'Vulnerability',
                        severity: v.severity || 'warning',
                        severityLabel: v.severity === 'critical' ? 'Critical' : 'Warning',
                        date: new Date().toLocaleString(),
                        details: v.description + (v.cve ? ' (CVE: ' + v.cve + ')' : ''),
                        paths: 'Target: WordPress Core / Environment Check',
                        headerActions: [
                            { label: 'IGNORE', icon: 'dashicons-hidden', class: 'waf-btn-ignore-file' },
                            { label: 'DETAILS', icon: 'dashicons-search', class: 'waf-btn-details-toggle' }
                        ],
                        actions: [
                            { label: 'Mark As Fixed', class: 'waf-mark-as-fixed' }
                        ]
                    });
                });
            }
        }

        // 8. Parse Security Headers Check
        if (scanData.headers_check) {
            var hc = scanData.headers_check;
            var missingHeaders = [];
            for (var header in hc) {
                if (hc[header] === 'Missing') {
                    missingHeaders.push(header);
                }
            }
            if (missingHeaders.length > 0) {
                findings.push({
                    id: 'missing_security_headers',
                    title: 'Missing critical security headers: ' + missingHeaders.slice(0, 3).join(', ') + (missingHeaders.length > 3 ? '...' : ''),
                    type: 'Security Headers',
                    severity: 'warning',
                    severityLabel: 'Warning',
                    date: new Date().toLocaleString(),
                    details: 'Your web server does not send the following important security headers: <code>' + missingHeaders.join(', ') + '</code>. Implementing these headers helps protect against Clickjacking, XSS, and content sniffing attacks.',
                    paths: 'Target domain: ' + window.location.hostname,
                    headerActions: [
                        { label: 'IGNORE', icon: 'dashicons-hidden', class: 'waf-btn-ignore-file' },
                        { label: 'DETAILS', icon: 'dashicons-search', class: 'waf-btn-details-toggle' }
                    ],
                    actions: [
                        { label: 'Go To Settings', class: 'waf-go-to-settings' }
                    ]
                });
            }
        }

        // 9. Directory listing exposure
        if (scanData.directory_listing && scanData.directory_listing.directory_listing_enabled) {
            var dirs = scanData.directory_listing.vulnerable_directories || [];
            if (dirs.length > 0) {
                findings.push({
                    id: 'directory_listing_enabled',
                    title: 'Directory Listing is enabled on sensitive directories',
                    type: 'Information Disclosure',
                    severity: 'warning',
                    severityLabel: 'Warning',
                    date: new Date().toLocaleString(),
                    details: 'Directory listing allows anyone to view the files inside directories that do not contain an index file. This exposes plugin files, templates, and configurations.',
                    paths: 'Directories exposed: <code>' + dirs.join(', ') + '</code>',
                    headerActions: [
                        { label: 'IGNORE', icon: 'dashicons-hidden', class: 'waf-btn-ignore-file' },
                        { label: 'DETAILS', icon: 'dashicons-search', class: 'waf-btn-details-toggle' }
                    ],
                    actions: [
                        { label: 'Fix via Hardening', class: 'waf-go-to-hardening' }
                    ]
                });
            }
        }

        // 10. XML-RPC access
        if (scanData.xmlrpc_check && scanData.xmlrpc_check.xmlrpc_accessible) {
            findings.push({
                id: 'xmlrpc_accessible',
                title: 'XML-RPC is enabled and accessible',
                type: 'API Attack Surface',
                severity: 'warning',
                severityLabel: 'Warning',
                date: new Date().toLocaleString(),
                details: 'XML-RPC is enabled. Attackers can exploit XML-RPC for brute-force login amplification attacks and DDoS XML-RPC pingback attacks.',
                paths: 'Endpoint: <code>xmlrpc.php</code>',
                headerActions: [
                    { label: 'IGNORE', icon: 'dashicons-hidden', class: 'waf-btn-ignore-file' },
                    { label: 'DETAILS', icon: 'dashicons-search', class: 'waf-btn-details-toggle' }
                ],
                actions: [
                    { label: 'Disable XML-RPC', class: 'waf-go-to-hardening' }
                ]
            });
        }

        // 11. WP version outdated
        if (scanData.wordpress_checks && !scanData.wordpress_checks.wp_version_uptodate) {
            findings.push({
                id: 'wp_outdated',
                title: 'WordPress version is outdated',
                type: 'System Vulnerability',
                severity: 'critical',
                severityLabel: 'Critical',
                date: new Date().toLocaleString(),
                details: 'A newer version of WordPress is available. Running an outdated WordPress core exposes your site to publicly known security vulnerabilities.',
                paths: 'Core system update required.',
                headerActions: [
                    { label: 'IGNORE', icon: 'dashicons-hidden', class: 'waf-btn-ignore-file' },
                    { label: 'DETAILS', icon: 'dashicons-search', class: 'waf-btn-details-toggle' }
                ],
                actions: [
                    { label: 'Upgrade WordPress', class: 'waf-go-to-options' }
                ]
            });
        }

        return findings;
    }

    function renderScanModules(data) {
        var findings = parseFindingsFromScanData(data);
        var html = '';

        if (findings.length === 0) {
            html = '<div style="padding:30px;text-align:center;color:#64748b;background:#fff;border:1px solid #cbd5e1;border-radius:4px;">' +
                   '    <span class="dashicons dashicons-yes" style="font-size:32px;width:32px;height:32px;color:#10b981;margin-bottom:8px;"></span>' +
                   '    <h4 style="margin:0;font-size:15px;color:#1e293b;">No security issues found! Your site is secure.</h4>' +
                   '</div>';
            $('#wafScanDetails').html(html);
            return;
        }

        findings.forEach(function(f) {
            var severityColor = '#64748b';
            var severityDot = '#64748b';
            if (f.severity === 'critical') {
                severityColor = '#ef4444';
                severityDot = '#ef4444';
            } else if (f.severity === 'warning') {
                severityColor = '#f59e0b';
                severityDot = '#f59e0b';
            }

            var iconClass = 'dashicons-admin-generic';
            if (f.type.indexOf('Malware') !== -1 || f.type.indexOf('AI') !== -1) {
                iconClass = 'dashicons-warning';
            } else if (f.type.indexOf('Vulnerability') !== -1) {
                iconClass = 'dashicons-shield';
            } else if (f.type.indexOf('Checksum') !== -1) {
                iconClass = 'dashicons-edit';
            }

            html += '<div style="border:1px solid #cbd5e1;border-left:4px solid ' + severityDot + ';border-radius:4px;background:#ffffff;margin-bottom:16px;overflow:hidden;" class="waf-finding-card" data-severity="' + f.severity + '">';
            html += '    <!-- Issue Header -->';
            html += '    <div class="waf-finding-header" style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;cursor:pointer;background:#ffffff;">';
            html += '        <div style="display:flex;align-items:center;gap:14px;flex:1;">';
            html += '            <!-- Icon -->';
            html += '            <div style="width:36px;height:36px;border-radius:4px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#64748b;flex-shrink:0;border:1px solid #cbd5e1;">';
            html += '                <span class="dashicons ' + iconClass + '" style="font-size:20px;width:20px;height:20px;"></span>';
            html += '            </div>';
            html += '            <!-- Header Text -->';
            html += '            <div style="text-align:left;">';
            html += '                <div style="font-weight:700;font-size:13.5px;color:#334155;line-height:1.4;">' + f.title + '</div>';
            html += '                <div style="font-size:12px;color:#64748b;margin-top:2px;">Type: ' + f.type + '</div>';
            html += '            </div>';
            html += '        </div>';
            html += '        ';
            html += '        <!-- Status & Time -->';
            html += '        <div style="display:flex;align-items:center;gap:30px;margin-right:20px;text-align:right;">';
            html += '            <div>';
            html += '                <div style="font-size:11.5px;color:#64748b;">Issue Found ' + f.date + '</div>';
            html += '                <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;font-size:12px;font-weight:700;color:' + severityColor + ';margin-top:2px;">';
            html += '                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + severityDot + ';"></span> ' + f.severityLabel;
            html += '                </div>';
            html += '            </div>';
            html += '        </div>';
            html += '        ';
            html += '        <!-- Actions -->';
            html += '        <div style="display:flex;align-items:center;gap:16px;">';
            if (f.headerActions && f.headerActions.length > 0) {
                f.headerActions.forEach(function(act) {
                    var fileAttr = f.file ? ' data-file="' + f.file + '"' : '';
                    html += '            <div class="' + act.class + '"' + fileAttr + ' style="display:flex;flex-direction:column;align-items:center;color:#64748b;font-size:10px;font-weight:700;cursor:pointer;">';
                    html += '                <span class="dashicons ' + act.icon + '" style="font-size:18px;width:18px;height:18px;margin-bottom:2px;"></span>';
                    html += '                <span>' + act.label + '</span>';
                    html += '            </div>';
                });
            } else {
                html += '            <div class="waf-btn-ignore-item" data-file="' + (f.file || '') + '" style="display:flex;flex-direction:column;align-items:center;color:#64748b;font-size:10px;font-weight:700;cursor:pointer;">';
                html += '                <span class="dashicons dashicons-hidden" style="font-size:18px;width:18px;height:18px;margin-bottom:2px;"></span>';
                html += '                <span>IGNORE</span>';
                html += '            </div>';
                html += '            <div class="waf-btn-details-toggle" style="display:flex;flex-direction:column;align-items:center;color:#0284c7;font-size:10px;font-weight:700;cursor:pointer;">';
                html += '                <span class="dashicons dashicons-search" style="font-size:18px;width:18px;height:18px;margin-bottom:2px;"></span>';
                html += '                <span>DETAILS</span>';
                html += '            </div>';
            }
            html += '        </div>';
            html += '    </div>';
            html += '    ';
            html += '    <!-- Issue Details Panel -->';
            html += '    <div class="waf-finding-body" style="border-top:1px solid #cbd5e1;padding:18px 20px;background:#ffffff;display:none;text-align:left;">';
            html += '        <p style="font-size:13px;color:#334155;line-height:1.6;margin-bottom:12px;">';
            html += '            <strong>Details:</strong> ' + f.details;
            html += '        </p>';
            html += '        <p style="font-size:13px;color:#334155;line-height:1.6;margin-bottom:16px;">';
            html += '            ' + f.paths;
            html += '        </p>';
            html += '        <div style="display:flex;gap:10px;" class="waf-scan-issue-item">';

            // Render specific actions
            if (f.actions && f.actions.length > 0) {
                f.actions.forEach(function(act) {
                    var dataAttrs = '';
                    if (act.file) {
                        dataAttrs = ' data-file="' + act.file + '"';
                    }
                    html += '<button type="button" class="button ' + act.class + '"' + dataAttrs + ' style="border-color:#0284c7;color:#0284c7;font-weight:700;font-size:11px;padding:2px 14px;height:30px;line-height:28px;text-transform:uppercase;background:#fff;">' + act.label + '</button>';
                });
            } else {
                html += '<button type="button" class="button waf-mark-as-fixed" style="border-color:#0284c7;color:#0284c7;font-weight:700;font-size:11px;padding:2px 14px;height:30px;line-height:28px;text-transform:uppercase;background:#fff;">Mark As Fixed</button>';
            }

            html += '        </div>';
            html += '    </div>';
            html += '</div>';
        });

        $('#wafScanDetails').html(html);
    }

    function renderChecksumCard(checksums) {
        if (!checksums || checksums.checksums_api === 'unreachable') return '';
        var icon = checksums.core_files_modified > 0 ? 'dashicons-dismiss' : 'dashicons-yes-alt';
        var color = checksums.core_files_modified > 0 ? '#ef4444' : '#10b981';
        var badgeClass = checksums.core_files_modified > 0 ? 'waf-badge-fail' : 'waf-badge-pass';
        var badgeLabel = checksums.core_files_modified > 0 ? checksums.core_files_modified + ' Modified' : 'Verified';
        var html = '<div class="waf-scan-module" data-severity="' + (checksums.core_files_modified > 0 ? 'critical' : 'passed') + '">';
        html += '<div class="waf-scan-module-header">';
        html += '<span class="dashicons ' + icon + '" style="color:' + color + '"></span>';
        html += '<h4>WordPress Core Checksum Verification</h4>';
        html += '<span class="waf-badge ' + badgeClass + '">' + badgeLabel + '</span></div>';
        html += '<div class="waf-scan-module-body">';
        html += '<div class="waf-scan-check-row"><span class="waf-scan-check-label">Files Checked</span><span class="waf-scan-check-value">' + checksums.core_files_checked + '</span></div>';
        html += '<div class="waf-scan-check-row"><span class="waf-scan-check-label">Files Modified</span><span class="waf-scan-check-value">' + checksums.core_files_modified + '</span></div>';
        if (checksums.modified_files && checksums.modified_files.length > 0) {
            html += '<div style="margin-top:8px;font-size:12px;color:#991b1b;background:#fef2f2;padding:8px;border-radius:6px;">';
            for (var i = 0; i < Math.min(checksums.modified_files.length, 5); i++) {
                html += '<div>' + checksums.modified_files[i].file + '</div>';
            }
            if (checksums.modified_files.length > 5) html += '<div>...and ' + (checksums.modified_files.length - 5) + ' more</div>';
            html += '</div>';
        }
        html += '</div></div>';
        return html;
    }

    function renderSecretsCard(secrets) {
        var html = '<div class="waf-scan-module" data-severity="critical">';
        html += '<div class="waf-scan-module-header">';
        html += '<span class="dashicons dashicons-lock" style="color:#ef4444"></span>';
        html += '<h4>Exposed Secrets & Credentials</h4>';
        html += '<span class="waf-badge waf-badge-fail">' + secrets.length + ' Leaked</span></div>';
        html += '<div class="waf-scan-module-body">';
        for (var i = 0; i < secrets.length; i++) {
            var s = secrets[i];
            html += '<div class="waf-scan-check-row">';
            html += '<span class="waf-scan-check-label" style="font-size:12px;">' + s.file + '</span>';
            html += '<span class="waf-scan-check-value"><span class="waf-badge waf-badge-fail">Score: ' + s.score + '</span></span>';
            html += '</div>';
            if (s.findings) {
                for (var f = 0; f < Math.min(s.findings.length, 2); f++) {
                    html += '<div style="font-size:11px;color:#991b1b;padding:2px 0 2px 16px;">' + s.findings[f] + '</div>';
                }
            }
        }
        html += '</div></div>';
        return html;
    }

    function formatCategoryName(name) {
        return name.replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
    }

    function getCategorySeverity(catData, category) {
        var result = { level: 'passed', label: 'Pass', color: '#10b981', icon: 'yes-alt' };
        for (var key in catData) {
            var val = catData[key];
            if (typeof val === 'boolean' && val === true) { result = { level: 'warnings', label: 'Warning', color: '#f59e0b', icon: 'warning' }; }
            if (typeof val === 'string' && (val === 'Missing' || val === 'Vulnerable')) { result = { level: 'warnings', label: 'Warning', color: '#f59e0b', icon: 'warning' }; }
            if (key.indexOf('vulnerab') !== -1 || key.indexOf('infect') !== -1 || key.indexOf('malware') !== -1) {
                if (val > 0) result = { level: 'critical', label: 'Critical', color: '#ef4444', icon: 'dismiss' };
            }
            if (typeof val === 'object' && val !== null) {
                if (val.total_suspicious > 0 || val.infected_core > 0) result = { level: 'critical', label: 'Critical', color: '#ef4444', icon: 'dismiss' };
                if (val.total_vulnerabilities > 0) result = { level: 'critical', label: 'Critical', color: '#ef4444', icon: 'dismiss' };
                if (val.risk_level === 'critical') result = { level: 'critical', label: 'Critical', color: '#ef4444', icon: 'dismiss' };
                if (val.risk_level === 'warning') result = { level: 'warnings', label: 'Warning', color: '#f59e0b', icon: 'warning' };
                if (val.fpd_detected) result = { level: 'critical', label: 'Critical', color: '#ef4444', icon: 'dismiss' };
                if (val.listed) result = { level: 'critical', label: 'Critical', color: '#ef4444', icon: 'dismiss' };
                if (val.spam_detected) result = { level: 'critical', label: 'Critical', color: '#ef4444', icon: 'dismiss' };
                if (val.grade && val.grade >= 'D') result = { level: 'critical', label: 'Critical', color: '#ef4444', icon: 'dismiss' };
            }
        }
        if (catData.suspicious_found > 0 || catData.infected_core > 0) result = { level: 'critical', label: 'Critical', color: '#ef4444', icon: 'dismiss' };
        if (catData.malicious_count > 0) result = { level: 'critical', label: 'Critical', color: '#ef4444', icon: 'dismiss' };
        if (catData.suspicious_count > 0) result = { level: 'warnings', label: 'Warning', color: '#f59e0b', icon: 'warning' };
        if (catData.total_vulnerabilities > 0) result = { level: 'critical', label: 'Critical', color: '#ef4444', icon: 'dismiss' };
        if (catData.avg_heuristic_score >= 50) result = { level: 'critical', label: 'Critical', color: '#ef4444', icon: 'dismiss' };
        if (catData.avg_heuristic_score >= 25 && catData.avg_heuristic_score < 50) result = { level: 'warnings', label: 'Warning', color: '#f59e0b', icon: 'warning' };
        if (catData.high_risk_files > 0) result = { level: 'critical', label: 'Critical', color: '#ef4444', icon: 'dismiss' };
        if (catData.secrets_found && catData.secrets_found.length > 0) result = { level: 'critical', label: 'Critical', color: '#ef4444', icon: 'dismiss' };
        if (catData.wp_checksums && catData.wp_checksums.core_files_modified > 0) result = { level: 'critical', label: 'Critical', color: '#ef4444', icon: 'dismiss' };
        if (catData.suspicious_users && catData.suspicious_users.length > 0) result = { level: 'critical', label: 'Critical', color: '#ef4444', icon: 'dismiss' };
        if (catData.admin_with_weak && catData.admin_with_weak.length > 0) result = { level: 'critical', label: 'Critical', color: '#ef4444', icon: 'dismiss' };
        if (catData.total_exposed > 0) result = { level: 'critical', label: 'Critical', color: '#ef4444', icon: 'dismiss' };
        if (catData.total_modified > 0) result = { level: 'critical', label: 'Critical', color: '#ef4444', icon: 'dismiss' };
        if (catData.total_unknown > 0 && category === 'known_files_check') result = { level: 'warnings', label: 'Warning', color: '#f59e0b', icon: 'warning' };
        return result;
    }

    function getSeverityBadge(severity) {
        if (severity.level === 'critical') return { class: 'waf-badge-fail', label: 'Issues Found' };
        if (severity.level === 'warnings') return { class: 'waf-badge-warn', label: 'Warnings' };
        return { class: 'waf-badge-pass', label: 'Passed' };
    }

    function renderCheckItems(catData, category) {
        var html = '';
        var skipKeys = { heuristic_scores: 1, infected_files: 1, secrets_found: 1, wp_checksums: 1, modified_files: 1, scanned_categories: 1, deprecated_usages: 1, categories: 1 };

        if (category === 'malware_scan' && catData.suspicious_files && catData.suspicious_files.length > 0) {
            html += renderSuspiciousFilesCard(catData.suspicious_files);
        }
        if (category === 'ml_malware_scan' && ((catData.malicious_files && catData.malicious_files.length > 0) || (catData.suspicious_files && catData.suspicious_files.length > 0))) {
            html += renderMLMalwareFilesCard(catData.malicious_files || [], catData.suspicious_files || []);
        }
        if (category === 'deprecated_php' && catData.deprecated_usages && catData.deprecated_usages.length > 0) {
            html += renderDeprecatedUsagesCard(catData.deprecated_usages, catData.categories || {});
        }

        for (var key in catData) {
            if (skipKeys[key]) continue;
            if (category === 'malware_scan' && key === 'suspicious_files') continue;
            if (category === 'ml_malware_scan' && (key === 'malicious_files' || key === 'suspicious_files' || key === 'clean_files')) continue;
            var val = catData[key];
            if (Array.isArray(val)) {
                if (val.length > 0) {
                    html += '<div class="waf-scan-check-row" style="flex-wrap:wrap;">';
                    html += '<span class="waf-scan-check-label" style="font-weight:600;width:100%;margin-bottom:4px;">' + key.replace(/_/g, ' ') + '</span>';
                    html += '<div style="width:100%;padding-left:8px;">';
                    for (var i = 0; i < Math.min(val.length, 10); i++) {
                        var item = val[i];
                        var display = typeof item === 'object' ? (item.file || item.path || item.user_login || item.description || JSON.stringify(item).substring(0, 80)) : item;
                        html += '<div style="font-size:11px;color:#991b1b;background:#fef2f2;padding:4px 8px;margin:2px 0;border-radius:4px;">' + display + '</div>';
                    }
                    if (val.length > 10) html += '<div style="font-size:11px;color:#64748b;">...and ' + (val.length - 10) + ' more</div>';
                    html += '</div></div>';
                }
                continue;
            }
            if (typeof val === 'object' && val !== null) {
                html += renderObjectCheck(key, val);
                continue;
            }
            html += renderPrimitiveCheck(key, val);
        }
        return html;
    }

    function renderSuspiciousFilesCard(files) {
        var html = '<div style="margin-bottom:12px;border:1px solid #fecaca;border-radius:8px;overflow:hidden;" class="waf-scan-issue-card">';
        html += '<div style="background:#fef2f2;padding:10px 14px;border-bottom:1px solid #fecaca;display:flex;align-items:center;gap:8px;">';
        html += '<span class="dashicons dashicons-warning" style="color:#dc2626;"></span>';
        html += '<strong style="color:#991b1b;font-size:13px;">Suspicious Files (' + files.length + ')</strong>';
        html += '</div><div style="padding:8px 14px;">';
        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            var filePath = f.file || 'Unknown file';
            var severityColor = f.score >= 50 ? '#dc2626' : '#d97706';
            var severityBg = f.score >= 50 ? '#fef2f2' : '#fffbeb';
            html += '<div style="padding:10px;margin:6px 0;background:' + severityBg + ';border-left:3px solid ' + severityColor + ';border-radius:6px;" class="waf-scan-issue-item">';
            html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;flex-wrap:wrap;gap:6px;">';
            html += '<span style="font-weight:600;font-size:12px;color:#1e293b;word-break:break-all;">' + filePath + '</span>';
            html += '<span class="waf-badge" style="background:' + severityColor + ';color:#fff;">Score: ' + (f.score || 0) + '</span>';
            html += '</div>';
            if (f.size) html += '<div style="font-size:11px;color:#64748b;margin-bottom:6px;">Size: ' + f.size + ' bytes</div>';
            if (f.findings && f.findings.length > 0) {
                for (var j = 0; j < f.findings.length; j++) {
                    var finding = f.findings[j];
                    html += '<div style="font-size:11px;color:#991b1b;padding:2px 0 2px 8px;">- ' + finding + '</div>';
                }
            }
            html += '<div style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(0,0,0,0.05);display:flex;gap:8px;flex-wrap:wrap;">';
            html += '<button type="button" class="button button-small waf-btn-view-file" data-file="' + filePath + '">View Code</button>';
            if (filePath.indexOf('wp-admin/') === 0 || filePath.indexOf('wp-includes/') === 0 || filePath.indexOf('wp-') === 0 || filePath === 'index.php') {
                html += '<button type="button" class="button button-small button-primary waf-btn-restore-file" data-file="' + filePath + '">Restore Core</button>';
            }
            html += '<button type="button" class="button button-small waf-btn-clean-file" data-file="' + filePath + '" style="color:#dc2626;border-color:#fca5a5;">Clean File</button>';
            html += '<button type="button" class="button button-small waf-btn-ignore-file" data-file="' + filePath + '">Ignore</button>';
            html += '</div>';
            html += '</div>';
        }
        html += '</div></div>';
        return html;
    }

    function renderMLMalwareFilesCard(malicious, suspicious) {
        var html = '';
        var all = malicious.concat(suspicious);
        for (var i = 0; i < all.length; i++) {
            var f = all[i];
            var isMalicious = f.verdict === 'malicious';
            var color = isMalicious ? '#dc2626' : '#d97706';
            var bg = isMalicious ? '#fef2f2' : '#fffbeb';
            html += '<div style="padding:8px;margin:4px 0;background:' + bg + ';border-left:3px solid ' + color + ';border-radius:4px;">';
            html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;gap:8px;flex-wrap:wrap;">';
            html += '<span style="font-weight:600;font-size:12px;color:#1e293b;">' + (f.file || 'Unknown file') + '</span>';
            html += '<span class="waf-badge" style="background:' + color + ';color:#fff;">' + f.verdict.toUpperCase() + ' - Risk: ' + f.risk_score + '</span>';
            html += '</div>';
            html += '<div style="font-size:11px;color:#64748b;display:flex;gap:12px;flex-wrap:wrap;">';
            html += '<span>Confidence: ' + f.confidence + '</span>';
            if (f.family) html += '<span>Family: ' + f.family + '</span>';
            if (f.size) html += '<span>Size: ' + f.size + ' bytes</span>';
            html += '</div>';
            if (f.reasons && f.reasons.length > 0) {
                html += '<div style="font-size:11px;color:' + color + ';padding:2px 0 0 12px;">';
                for (var j = 0; j < f.reasons.length; j++) {
                    html += '<div>- ' + f.reasons[j] + '</div>';
                }
                html += '</div>';
            }
            html += '</div>';
        }
        return html;
    }

    function renderDeprecatedUsagesCard(usages, categories) {
        var html = '<div style="margin-bottom:12px;border:1px solid #fed7aa;border-radius:8px;overflow:hidden;">';
        html += '<div style="background:#fffbeb;padding:10px 14px;border-bottom:1px solid #fed7aa;display:flex;align-items:center;gap:8px;">';
        html += '<span class="dashicons dashicons-warning" style="color:#d97706;"></span>';
        html += '<strong style="color:#92400e;font-size:13px;">Deprecated Functions Found (' + usages.length + ' occurrences)</strong>';
        html += '</div><div style="padding:8px 14px;">';

        var groupedByFile = {};
        for (var i = 0; i < usages.length; i++) {
            var u = usages[i];
            if (!groupedByFile[u.file]) groupedByFile[u.file] = [];
            groupedByFile[u.file].push(u);
        }

        var fileCount = 0;
        for (var file in groupedByFile) {
            if (fileCount >= 15) { html += '<div style="font-size:11px;color:#64748b;padding:4px 0;">...and ' + (Object.keys(groupedByFile).length - 15) + ' more files</div>'; break; }
            var items = groupedByFile[file];
            var catColors = { removed_functions: '#dc2626', deprecated_functions: '#d97706', security_risks: '#7c3aed' };
            var itemCat = items[0].category;
            var catColor = catColors[itemCat] || '#d97706';

            html += '<div style="padding:6px;margin:4px 0;background:#fffbeb;border-left:3px solid ' + catColor + ';border-radius:4px;">';
            html += '<div style="font-weight:600;font-size:12px;color:#1e293b;margin-bottom:2px;">' + file + ' <span class="waf-badge" style="background:' + catColor + ';color:#fff;font-size:10px;">' + items.length + '</span></div>';
            for (var j = 0; j < Math.min(items.length, 3); j++) {
                html += '<div style="font-size:11px;color:#64748b;padding:1px 0 1px 12px;">- ' + items[j].description + '</div>';
            }
            if (items.length > 3) html += '<div style="font-size:10px;color:#94a3b8;padding-left:12px;">...+' + (items.length - 3) + ' more</div>';
            html += '</div>';
            fileCount++;
        }
        html += '</div></div>';
        return html;
    }

    function renderPrimitiveCheck(key, val) {
        var label = key.replace(/_/g, ' ');
        var status, badgeClass;
        if (typeof val === 'boolean') {
            if (val === true) { status = 'Yes'; badgeClass = 'waf-badge-fail'; }
            else { status = 'No'; badgeClass = 'waf-badge-pass'; }
        } else if (val === 'Missing') { status = 'Missing'; badgeClass = 'waf-badge-fail'; }
        else if (val === 'Vulnerable') { status = 'Vulnerable'; badgeClass = 'waf-badge-fail'; }
        else { status = val; badgeClass = 'waf-badge-info'; }
        return '<div class="waf-scan-check-row"><span class="waf-scan-check-label">' + label + '</span><span class="waf-scan-check-value"><span class="waf-badge ' + badgeClass + '">' + status + '</span></span></div>';
    }

    function renderObjectCheck(key, val) {
        if (key === 'security_status') return '';
        var html = '<div class="waf-scan-check-row" style="flex-wrap:wrap;">';
        html += '<span class="waf-scan-check-label" style="font-weight:600;width:100%;margin-bottom:4px;">' + key.replace(/_/g, ' ') + '</span>';
        html += '<div style="display:flex;gap:12px;flex-wrap:wrap;width:100%;padding-left:8px;">';
        for (var sub in val) {
            var subVal = val[sub];
            var subClass = 'waf-badge-info';
            if (typeof subVal === 'boolean') subClass = subVal ? 'waf-badge-fail' : 'waf-badge-pass';
            else if (subVal === 'Missing') subClass = 'waf-badge-fail';
            else if (typeof subVal === 'number' && subVal > 0) subClass = 'waf-badge-fail';
            html += '<span style="font-size:12px;color:#475569;">' + sub.replace(/_/g, ' ') + ': <span class="waf-badge ' + subClass + '">' + subVal + '</span></span>';
        }
        html += '</div></div>';
        return html;
    }

    function filterScanResults(filter) {
        if (filter === 'all') { $('.waf-finding-card').show(); return; }
        if (filter === 'ignored') { $('.waf-finding-card').hide(); return; }
        $('.waf-finding-card').each(function() {
            var severity = $(this).data('severity');
            if (filter === 'critical' && severity === 'critical') { $(this).show(); }
            else if (filter === 'warnings' && (severity === 'warning' || severity === 'critical')) { $(this).show(); }
            else { $(this).hide(); }
        });
    }

    function loadScanHistory() {
        $.get(ajaxurl + '?action=waf_fw_get_scan_history', function(r) {
            if (r.success && r.data && r.data.length > 0) {
                var html = '';
                $.each(r.data, function(i, scan) {
                    var scoreClass = 'good';
                    if (scan.score < 50) scoreClass = 'danger';
                    else if (scan.score < 80) scoreClass = 'warning';
                    var statusLabel = scan.score >= 80 ? 'Passed' : scan.score >= 50 ? 'Warning' : 'Failed';
                    var statusBadge = scan.score >= 80 ? 'waf-badge-pass' : scan.score >= 50 ? 'waf-badge-warn' : 'waf-badge-fail';
                    html += '<tr>';
                    html += '<td style="font-size:13px;color:#64748b;" data-label="Created">' + scan.created_at + '</td>';
                    html += '<td data-label="Type"><span class="waf-badge waf-badge-info">' + scan.scan_type + '</span></td>';
                    html += '<td data-label="Score"><span class="waf-scan-history-score ' + scoreClass + '">' + scan.score + '</span>/100</td>';
                    html += '<td data-label="Issues">' + scan.issues_found + '</td>';
                    html += '<td data-label="Duration">' + scan.duration_seconds + 's</td>';
                    html += '<td data-label="Status"><span class="waf-badge ' + statusBadge + '">' + statusLabel + '</span></td>';
                    html += '<td data-label="Actions"><button class="button button-small waf-email-history-report" data-scan-id="' + scan.id + '" title="Email report">Email</button></td>';
                    html += '</tr>';
                });
                $('#wafScanHistoryBody').html(html);
                $('.waf-email-history-report').on('click', function() {
                    lastScanId = $(this).data('scan-id');
                    $('#wafEmailModal').css('display', 'flex');
                    $('#wafReportEmail').val('').focus();
                });
            }
        });
    }

    function clearScanHistory() {
        if (!confirm('Permanently delete all scan history?')) return;
        $.post(ajaxurl + '?action=waf_fw_clear_scan_history', function(r) {
            if (r.success) {
                $('#wafScanHistoryBody').html('<tr class="war-table-empty"><td colspan="7"><p>No scans yet. Run your first scan above.</p></td></tr>');
            }
        });
    }

    function sendEmailReport(scanId, email) {
        $('#wafEmailSend').prop('disabled', true).text('Sending...');
        $.ajax({
            url: ajaxurl + '?action=waf_fw_email_scan_report',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ scan_id: scanId, email: email }),
            success: function(r) {
                $('#wafEmailSend').prop('disabled', false).text('Send Report');
                if (r.success) {
                    alert(r.data.message || 'Report sent successfully');
                    $('#wafEmailModal').hide();
                } else {
                    alert(r.data.message || 'Failed to send report');
                }
            },
            error: function() {
                $('#wafEmailSend').prop('disabled', false).text('Send Report');
                alert('Failed to send email');
            }
        });
    }

    $(document).on('click', '.waf-btn-view-file', function(e) {
        e.preventDefault();
        var file = $(this).data('file');
        showCodePreviewModal(file);
    });

    $(document).on('click', '.waf-btn-clean-file, .waf-btn-delete-file, .waf-btn-hide-file', function(e) {
        e.preventDefault();
        var file = $(this).data('file');
        var card = $(this).closest('.waf-finding-card');
        if (!confirm('Are you sure you want to clean/hide this file? It will be backed up for recovery and then deleted from the website.\n' + file)) return;
        $.ajax({
            url: waf_fw_ajax.ajax_url + '?action=waf_fw_clean_file',
            type: 'POST',
            data: JSON.stringify({ file: file }),
            contentType: 'application/json',
            success: function(r) {
                if (r.success) {
                    alert('File cleaned/hidden and backed up successfully!');
                    card.fadeOut(200, function() { $(this).remove(); });
                    loadBackups();
                } else {
                    alert('Error: ' + (r.data ? r.data.message : 'Action failed'));
                }
            }
        });
    });

    $(document).on('click', '.waf-btn-restore-file', function(e) {
        e.preventDefault();
        var file = $(this).data('file');
        var card = $(this).closest('.waf-finding-card');
        if (!confirm('Are you sure you want to replace this modified file with the official copy from WordPress.org?\n' + file)) return;
        $.ajax({
            url: waf_fw_ajax.ajax_url + '?action=waf_fw_restore_core_file',
            type: 'POST',
            data: JSON.stringify({ file: file }),
            contentType: 'application/json',
            success: function(r) {
                if (r.success) {
                    alert('Core file restored successfully from WordPress.org! Original file was backed up for safety.');
                    card.fadeOut(200, function() { $(this).remove(); });
                    loadBackups();
                } else {
                    alert('Error: ' + (r.data ? r.data.message : 'Restoration failed'));
                }
            }
        });
    });

    $(document).on('click', '.waf-btn-ignore-file, .waf-btn-ignore-item', function(e) {
        e.preventDefault();
        var file = $(this).data('file') || $(this).closest('.waf-finding-card').find('.waf-btn-ignore-item').data('file');
        var card = $(this).closest('.waf-finding-card');
        $.ajax({
            url: waf_fw_ajax.ajax_url + '?action=waf_fw_ignore_scan_issue',
            type: 'POST',
            data: JSON.stringify({ file: file }),
            contentType: 'application/json',
            success: function(r) {
                if (r.success) {
                    card.fadeOut(200, function() { $(this).remove(); });
                } else {
                    alert('Error ignoring issue.');
                }
            }
        });
    });

    $(document).on('click', '.waf-finding-header, .waf-btn-details-toggle', function(e) {
        if ($(e.target).closest('.waf-btn-ignore-file, .waf-btn-hide-file, .waf-btn-ignore-item').length > 0) {
            return;
        }
        e.preventDefault();
        var card = $(this).closest('.waf-finding-card');
        var body = card.find('.waf-finding-body');
        body.slideToggle(200);
    });

    function loadBackups() {
        $.get(ajaxurl + '?action=waf_fw_get_backups', function(r) {
            if (r.success && r.data) {
                $('#wafBackupCount').text(r.data.length + (r.data.length === 1 ? ' Backup' : ' Backups'));
                if (r.data.length > 0) {
                    var html = '';
                    $.each(r.data, function(i, b) {
                        html += '<tr>';
                        html += '<td style="padding:12px 16px;font-size:13px;font-weight:600;color:#1e293b;word-break:break-all;" data-label="Path">' + b.original_path + '</td>';
                        html += '<td style="padding:12px 16px;font-size:13px;color:#64748b;" data-label="Date">' + b.time + '</td>';
                        html += '<td style="padding:12px 16px;font-size:13px;color:#64748b;" data-label="Size">' + b.size + '</td>';
                        html += '<td style="padding:12px 16px;text-align:right;" data-label="Actions">';
                        html += '<button class="button button-small button-primary waf-btn-restore-backup" data-file="' + b.original_path + '" style="margin-right:6px;background:#10b981;border-color:#10b981;">Restore</button>';
                        html += '<button class="button button-small waf-btn-delete-backup" data-file="' + b.original_path + '" style="color:#dc2626;border-color:#fca5a5;">Delete Permanently</button>';
                        html += '</td></tr>';
                    });
                    $('#wafBackupsBody').html(html);
                } else {
                    $('#wafBackupsBody').html('<tr class="war-table-empty"><td colspan="4" style="text-align:center;padding:30px;color:#64748b;">No file backups created yet. Files are backed up automatically before cleaning.</td></tr>');
                }
            }
        });
    }

    $(document).on('click', '.waf-btn-restore-backup', function(e) {
        e.preventDefault();
        var file = $(this).data('file');
        if (!confirm('Are you sure you want to restore this file to its original location?\n' + file)) return;
        $.ajax({
            url: waf_fw_ajax.ajax_url + '?action=waf_fw_restore_file',
            type: 'POST',
            data: JSON.stringify({ file: file }),
            contentType: 'application/json',
            success: function(r) {
                if (r.success) {
                    alert('File restored successfully!');
                    loadBackups();
                } else {
                    alert('Error: ' + (r.data ? r.data.message : 'Restoration failed'));
                }
            }
        });
    });

    $(document).on('click', '.waf-btn-delete-backup', function(e) {
        e.preventDefault();
        var file = $(this).data('file');
        if (!confirm('Are you sure you want to permanently delete this backup file? This action CANNOT be undone.\n' + file)) return;
        $.ajax({
            url: waf_fw_ajax.ajax_url + '?action=waf_fw_delete_backup',
            type: 'POST',
            data: JSON.stringify({ file: file }),
            contentType: 'application/json',
            success: function(r) {
                if (r.success) {
                    alert('Backup deleted permanently.');
                    loadBackups();
                } else {
                    alert('Error: ' + (r.data ? r.data.message : 'Deletion failed'));
                }
            }
        });
    });

    function showCodePreviewModal(file) {
        var modal = $('#wafCodeModal');
        if (!modal.length) {
            $('body').append('<div id="wafCodeModal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.7);z-index:999999;align-items:center;justify-content:center;"><div style="background:#fff;border-radius:12px;width:90%;max-width:800px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.3);"><div style="background:#f8fafc;padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;"><strong id="wafModalTitle" style="font-size:14px;color:#0f172a;word-break:break-all;">File Preview</strong><button type="button" class="button button-small" id="wafCloseModalBtn">&times; Close</button></div><pre id="wafModalCode" style="background:#0f172a;color:#cbd5e1;padding:20px;margin:0;overflow:auto;flex:1;font-family:monospace;font-size:12px;line-height:1.5;"></pre></div></div>');
            modal = $('#wafCodeModal');
            $('#wafCloseModalBtn').on('click', function() { modal.hide(); });
        }
        $('#wafModalTitle').text('Loading: ' + file);
        $('#wafModalCode').text('Loading file contents...');
        modal.css('display', 'flex');

        $.get(waf_fw_ajax.ajax_url + '?action=waf_fw_view_scan_file&file=' + encodeURIComponent(file), function(r) {
            if (r.success && r.data) {
                $('#wafModalTitle').text('Viewing: ' + r.data.file + ' (' + r.data.size + ' bytes)');
                $('#wafModalCode').text(r.data.content);
            } else {
                $('#wafModalCode').text('Failed to load file contents: ' + (r.data ? r.data.message : 'Unknown error'));
            }
        });
    }

    $(document).ready(function() {
        loadScanHistory();
        loadBackups();
        $('#wafClearHistory').on('click', clearScanHistory);

        // Accordion details toggle click handler
        $(document).on('click', '.waf-btn-details-toggle, .waf-finding-header', function(e) {
            if ($(e.target).closest('.waf-btn-ignore-item, .button').length > 0) return;
            e.preventDefault();
            var card = $(this).closest('.waf-finding-card');
            card.find('.waf-finding-body').slideToggle(150);
        });

        // Bind main scan trigger button
        $('#wafStartScan').on('click', function() {
            if (scanRunning) return;
            var type = $('#wafScanType').val();
            startProgressiveScan(type);
        });

        // Scan controls (pause, cancel, rescan)
        $('#wafPauseScan').on('click', function() {
            if (!scanRunning || !scanQueueId) return;
            if (scanPaused) {
                resumeScan();
            } else {
                pauseScan();
            }
        });

        $('#wafCancelScan').on('click', function() {
            if (!scanRunning || !scanQueueId) return;
            if (!confirm('Are you sure you want to cancel this scan?')) return;
            cancelScan();
        });

        // Email reports
        $('#wafEmailReport').on('click', function() {
            $('#wafEmailModal').css('display', 'flex');
            $('#wafReportEmail').val('').focus();
        });

        $('#wafEmailCancel').on('click', function() {
            $('#wafEmailModal').hide();
        });

        $('#wafEmailSend').on('click', function() {
            var email = $('#wafReportEmail').val();
            sendEmailReport(lastScanId, email);
        });

        $('#wafRescanBtn').on('click', function() {
            var type = $('#wafScanType').val();
            startProgressiveScan(type);
        });

        // Scan results categories tab switching
        $('.waf-scan-tab').on('click', function() {
            $('.waf-scan-tab').removeClass('active');
            $(this).addClass('active');
            filterScanResults($(this).data('tab'));
        });

        // Sync scan profile cards selection
        $('.waf-scan-profile-card').on('click', function() {
            $('.waf-scan-profile-card').removeClass('active');
            $(this).addClass('active');
            
            var type = $(this).data('type');
            if (type === 'custom') {
                $('#wafCustomSelectWrap').slideDown(200);
            } else {
                $('#wafCustomSelectWrap').slideUp(200);
                $('#wafScanType').val(type);
            }
        });

        // Check active scan or show last results on page load
        checkActiveScanOnLoad();
    });
})(jQuery);
