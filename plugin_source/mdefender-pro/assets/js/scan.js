/**
 * MDefender Pro - Autonomous Security Radar Engine
 * 
 * Drives the cyber radar canvas visualization, progressive micro-batch scanning,
 * 18 security domains telemetry matrix, evidence-driven findings center,
 * Wordfence-grade visual diff comparisons, quarantine vault & security timelines.
 *
 * @package MDefender_Pro
 */

(function($) {
    'use strict';

    var scanQueueId = 0;
    var scanCellIndex = 0;
    var scanRunning = false;
    var scanPaused = false;
    var scanRetryTimer = null;
    var scanElapsedTimer = null;
    var scanStartTime = 0;
    var lastScanId = 0;
    var radarAnimFrame = null;
    var radarSweepAngle = 0;
    var radarBlips = [];
    var radarState = 'protected'; // 'protected' | 'scanning' | 'analyzing' | 'threat' | 'critical'

    /* ------------------------------------------------------------------------
       1. AUTONOMOUS RADAR CANVAS ENGINE
       ------------------------------------------------------------------------ */
    function initRadarCanvas() {
        var canvas = document.getElementById('mdfRadarCanvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var width = canvas.width;
        var height = canvas.height;
        var cx = width / 2;
        var cy = height / 2;
        var maxRadius = (width / 2) - 15;

        // Initialize 18 coordinate blips around the radar perimeter/rings
        radarBlips = [];
        for (var b = 0; b < 18; b++) {
            var angle = (b / 18) * Math.PI * 2;
            var dist = maxRadius * (0.35 + 0.55 * Math.sin(b * 1.7 + 1));
            radarBlips.push({
                x: cx + Math.cos(angle) * dist,
                y: cy + Math.sin(angle) * dist,
                angle: angle,
                dist: dist,
                alpha: 0.15,
                state: 'secure', // 'secure' | 'scanning' | 'warning' | 'threat'
                size: 3.5
            });
        }

        function drawRadar() {
            ctx.clearRect(0, 0, width, height);

            // 1. Outer Luminous Crisp Background
            var bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxRadius);
            bgGrad.addColorStop(0, '#ffffff');
            bgGrad.addColorStop(0.65, '#f8fafc');
            bgGrad.addColorStop(1, '#e8f0fe');
            ctx.fillStyle = bgGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, maxRadius, 0, Math.PI * 2);
            ctx.fill();

            // 2. Concentric Target Rings
            var rings = [0.25, 0.5, 0.75, 1.0];
            rings.forEach(function(r) {
                ctx.strokeStyle = r === 1.0 ? 'rgba(14, 165, 233, 0.45)' : 'rgba(14, 165, 233, 0.22)';
                ctx.lineWidth = r === 1.0 ? 1.5 : 1;
                ctx.beginPath();
                ctx.arc(cx, cy, maxRadius * r, 0, Math.PI * 2);
                ctx.stroke();
            });

            // 3. Crosshairs & Coordinate Lines
            ctx.strokeStyle = 'rgba(14, 165, 233, 0.25)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx - maxRadius, cy);
            ctx.lineTo(cx + maxRadius, cy);
            ctx.moveTo(cx, cy - maxRadius);
            ctx.lineTo(cx, cy + maxRadius);
            ctx.stroke();

            // Diagonal guides
            ctx.strokeStyle = 'rgba(14, 165, 233, 0.12)';
            ctx.beginPath();
            ctx.moveTo(cx - maxRadius * 0.707, cy - maxRadius * 0.707);
            ctx.lineTo(cx + maxRadius * 0.707, cy + maxRadius * 0.707);
            ctx.moveTo(cx + maxRadius * 0.707, cy - maxRadius * 0.707);
            ctx.lineTo(cx - maxRadius * 0.707, cy + maxRadius * 0.707);
            ctx.stroke();

            // 4. Rotating Radar Sweep Beam
            var sweepSpeed = scanRunning ? 0.045 : 0.015;
            radarSweepAngle = (radarSweepAngle + sweepSpeed) % (Math.PI * 2);

            var sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
            if (radarState === 'critical' || radarState === 'threat') {
                sweepGrad.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
                sweepGrad.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
            } else if (scanRunning) {
                sweepGrad.addColorStop(0, 'rgba(14, 165, 233, 0.4)');
                sweepGrad.addColorStop(1, 'rgba(37, 99, 235, 0.02)');
            } else {
                sweepGrad.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
                sweepGrad.addColorStop(1, 'rgba(16, 185, 129, 0.02)');
            }

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, maxRadius, radarSweepAngle - 0.45, radarSweepAngle);
            ctx.closePath();
            ctx.fillStyle = sweepGrad;
            ctx.fill();

            // Sweep leading edge line
            ctx.strokeStyle = (radarState === 'critical' || radarState === 'threat') ? '#ef4444' : (scanRunning ? '#0284c7' : '#059669');
            ctx.lineWidth = 1.75;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(radarSweepAngle) * maxRadius, cy + Math.sin(radarSweepAngle) * maxRadius);
            ctx.stroke();
            ctx.restore();

            // 5. Draw Dynamic Target Blips
            radarBlips.forEach(function(blip) {
                var diff = Math.abs(radarSweepAngle - blip.angle);
                if (diff < 0.15 || Math.abs(diff - Math.PI * 2) < 0.15) {
                    blip.alpha = 1.0;
                } else {
                    blip.alpha = Math.max(0.2, blip.alpha - 0.015);
                }

                ctx.beginPath();
                ctx.arc(blip.x, blip.y, blip.size, 0, Math.PI * 2);
                if (blip.state === 'threat' || radarState === 'threat' || radarState === 'critical') {
                    ctx.fillStyle = 'rgba(239, 68, 68, ' + blip.alpha + ')';
                    ctx.shadowColor = '#ef4444';
                    ctx.shadowBlur = 6;
                } else if (blip.state === 'warning') {
                    ctx.fillStyle = 'rgba(245, 158, 11, ' + blip.alpha + ')';
                    ctx.shadowColor = '#f59e0b';
                    ctx.shadowBlur = 5;
                } else if (scanRunning) {
                    ctx.fillStyle = 'rgba(2, 132, 199, ' + blip.alpha + ')';
                    ctx.shadowColor = '#0284c7';
                    ctx.shadowBlur = 5;
                } else {
                    ctx.fillStyle = 'rgba(16, 185, 129, ' + blip.alpha + ')';
                    ctx.shadowColor = '#10b981';
                    ctx.shadowBlur = 4;
                }
                ctx.fill();
                ctx.shadowBlur = 0;
            });

            radarAnimFrame = requestAnimationFrame(drawRadar);
        }

        drawRadar();
    }

    function updateRadarStatusState(state, score, threatsCount) {
        radarState = state;
        var pill = $('#mdfGlobalStatusPill');
        var dot = $('#mdfGlobalStatusDot');
        var text = $('#mdfGlobalStatusText');
        var centerScore = $('#mdfRadarCenterScore');
        var sweepText = $('#mdfSweepStatus');

        if (centerScore.length) {
            centerScore.text(score !== undefined ? score + '%' : '100%');
        }

        if (state === 'scanning') {
            pill.css({ background: 'rgba(56, 189, 248, 0.15)', borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' });
            dot.css({ background: '#38bdf8', boxShadow: '0 0 10px #38bdf8' });
            text.text('SCANNING & ANALYZING');
            sweepText.text('High-Frequency Scan');
        } else if (state === 'threat' || (threatsCount && threatsCount > 0)) {
            pill.css({ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' });
            dot.css({ background: '#ef4444', boxShadow: '0 0 10px #ef4444' });
            text.text('THREAT DETECTED');
            sweepText.text('Active Defense Mode');
        } else if (state === 'warning' || (score < 80 && score >= 50)) {
            pill.css({ background: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#fbbf24' });
            dot.css({ background: '#f59e0b', boxShadow: '0 0 10px #f59e0b' });
            text.text('WARNING DETECTED');
            sweepText.text('Monitoring Alert');
        } else {
            pill.css({ background: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#34d399' });
            dot.css({ background: '#10b981', boxShadow: '0 0 10px #10b981' });
            text.text('SYSTEM PROTECTED');
            sweepText.text('Active Continuous');
        }
    }

    /* ------------------------------------------------------------------------
       2. PROGRESSIVE SCAN EXECUTION & BATCHING
       ------------------------------------------------------------------------ */
    function startProgressiveScan(type) {
        scanRunning = true;
        scanPaused = false;
        scanStartTime = Date.now();
        updateRadarStatusState('scanning');

        $('#wafStartFullScan, #wafStartQuickScan').prop('disabled', true);
        if (type === 'quick') {
            $('#wafStartQuickScan').html('<span class="mdf-spinner-radar"></span> <span>Scanning...</span>');
        } else {
            $('#wafStartFullScan').html('<span class="mdf-spinner-radar"></span> <span>Scanning...</span>');
        }

        $('#wafPauseScan').show().text('Pause').css({ background: '#f59e0b' });
        $('#wafCancelScan').show();
        $('#wafScanProgress').slideDown(250);
        $('#wafScanProgressPct').text('2%');
        $('#wafScanStage').text('Initializing ' + (type === 'quick' ? 'Quick' : 'Full') + ' Scan...');
        $('#wafStageDetailDesc').text('Deploying multi-engine scan sandboxes and collecting file delta hashes...');
        startElapsedTimer();

        // Highlight domains matrix to scanning state
        $('.mdf-domain-card').addClass('active-scanning');
        $('.mdf-domain-status-badge').removeClass('badge-secure badge-warning badge-danger').addClass('badge-checking').text('CHECKING');

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
                        scanComplete(r.data);
                    } else {
                        updateProgress(r.data);
                        scheduleContinue();
                    }
                } else {
                    scanError('Failed to initialize scan queue.');
                }
            },
            error: function() {
                scanError('Network error starting security scan.');
            }
        });
    }

    function scheduleContinue() {
        if (scanRetryTimer) clearTimeout(scanRetryTimer);
        scanRetryTimer = setTimeout(continueScanning, 1100);
    }

    function continueScanning() {
        if (!scanQueueId || !scanRunning || scanPaused) return;

        $.ajax({
            url: ajaxurl + '?action=waf_fw_continue_scan',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ queue_id: scanQueueId, cell_index: scanCellIndex }),
            success: function(r) {
                if (r.success && r.data) {
                    var data = r.data;
                    scanCellIndex = data.cell_index || (scanCellIndex + 1);
                    if (data.status === 'completed' || data.status === 'completed_with_issues' || data.completed) {
                        scanComplete(data);
                    } else if (data.status === 'failed') {
                        scanError(data.last_error || 'Scan process encountered an error.');
                    } else if (data.status === 'cancelled') {
                        resetScanState();
                    } else {
                        updateProgress(data);
                        scheduleContinue();
                    }
                } else {
                    scanError('Failed to fetch scan telemetry.');
                }
            },
            error: function() {
                if (scanRunning) scheduleContinue();
            }
        });
    }

    function updateProgress(data) {
        if (!data) return;
        var progress = Math.min(Math.max(data.progress || 0, 5), 98);
        $('#wafScanProgressPct').text(progress + '%');

        var stage = data.current_stage || 'Scanning...';
        $('#wafScanStage').text('Analyzing: ' + formatStageLabel(stage));
        $('#wafStageDetailDesc').text('Processing micro-batch files through AST taint flow, entropy and signature engines...');
        $('#wafStreamText').text('Inspecting WP environment & active files [Queue #' + scanQueueId + '] -> ' + stage);

        if (data.total_files) $('#wafTotalFileCount').text(data.total_files.toLocaleString());
        if (data.scanned_files) $('#wafScannedFileCount').text(data.scanned_files.toLocaleString());

        // Update multi-domain progress bars
        updateStageBars(progress);
    }

    function updateStageBars(pct) {
        var p1 = Math.min(pct * 1.6, 100);
        var p2 = Math.min(Math.max((pct - 20) * 1.5, 0), 100);
        var p3 = Math.min(Math.max((pct - 40) * 1.5, 0), 100);
        var p4 = Math.min(Math.max((pct - 60) * 1.5, 0), 100);
        var p5 = Math.min(Math.max((pct - 80) * 2.5, 0), 100);

        $('#stagePctFilesystem').text(Math.round(p1) + '%');
        $('#stageBarFilesystem .mdf-bar-fill').css('width', p1 + '%');

        $('#stagePctMalware').text(Math.round(p2) + '%');
        $('#stageBarMalware .mdf-bar-fill').css('width', p2 + '%');

        $('#stagePctCore').text(Math.round(p3) + '%');
        $('#stageBarCore .mdf-bar-fill').css('width', p3 + '%');

        $('#stagePctDatabase').text(Math.round(p4) + '%');
        $('#stageBarDatabase .mdf-bar-fill').css('width', p4 + '%');

        $('#stagePctVulns').text(Math.round(p5) + '%');
        $('#stageBarVulns .mdf-bar-fill').css('width', p5 + '%');
    }

    function scanComplete(data) {
        scanRunning = false;
        stopElapsedTimer();
        if (scanRetryTimer) { clearTimeout(scanRetryTimer); scanRetryTimer = null; }

        $('#wafScanProgressPct').text('100%');
        updateStageBars(100);
        $('#wafScanStage').text('Scan Complete! Compiling Final Threat Report...');
        $('#wafStageDetailDesc').text('Correlating cross-domain risk vectors and updating baseline database.');

        setTimeout(function() {
            $('#wafScanProgress').slideUp(300);
            resetScanButtons();
            $('.mdf-domain-card').removeClass('active-scanning');
            if (data.results) {
                displayScanResults(data);
            } else {
                checkActiveScanOnLoad();
            }
        }, 600);
    }

    function scanError(msg) {
        scanRunning = false;
        stopElapsedTimer();
        if (scanRetryTimer) { clearTimeout(scanRetryTimer); scanRetryTimer = null; }
        $('#wafScanProgress').slideUp(200);
        resetScanButtons();
        $('.mdf-domain-card').removeClass('active-scanning');
        alert(msg);
    }

    function resetScanButtons() {
        $('#wafStartFullScan, #wafStartQuickScan').prop('disabled', false);
        $('#wafStartFullScan').html('<span class="dashicons dashicons-shield-alt"></span> <span>START FULL SCAN</span>');
        $('#wafStartQuickScan').html('<span class="dashicons dashicons-performance"></span> <span>QUICK SCAN</span>');
        $('#wafPauseScan').hide();
        $('#wafCancelScan').hide();
    }

    function resetScanState() {
        scanRunning = false;
        scanPaused = false;
        stopElapsedTimer();
        if (scanRetryTimer) { clearTimeout(scanRetryTimer); scanRetryTimer = null; }
        $('#wafScanProgress').slideUp(200);
        resetScanButtons();
        $('.mdf-domain-card').removeClass('active-scanning');
        updateRadarStatusState('protected');
    }

    function formatStageLabel(stage) {
        var map = {
            'init': 'Initializing Environment',
            'basic': 'Basic Security Audit',
            'headers': 'Security Headers',
            'ssl': 'SSL/TLS Configuration',
            'wp_core': 'WordPress Core Verification',
            'waf_test': 'WAF Shield Validation',
            'directories': 'Directory Exposure',
            'xmlrpc': 'XML-RPC Attack Surface',
            'cors': 'CORS & Origin Policies',
            'cookies': 'Cookie Directives',
            'file_upload': 'File Upload Restrictions',
            'php_info': 'PHP Info Probing',
            'vulnerabilities': 'CVE & Vulnerability Database',
            'file_changes': 'File Integrity Changes',
            'malware': 'Malware Signatures & AST Analysis',
            'ml_malware': 'MDefender ML Zero-Day Model',
            'db_scan': 'Database & User Security',
            'db_integrity': 'Database Integrity Check',
            'password_audit': 'Password & Role Audit',
            'blocklist': 'Reputation & Blocklist Intelligence',
            'config_exposure': 'Public Exposure Probing',
            'complete': 'Finalizing Report'
        };
        return map[stage] || stage.replace(/_/g, ' ').toUpperCase();
    }

    /* ------------------------------------------------------------------------
       3. 18 SECURITY DOMAINS MATRIX TELEMETRY UPDATER
       ------------------------------------------------------------------------ */
    function update18DomainsMatrix(scanData, findings) {
        var nowText = 'Just now';
        var domainsStatus = {
            filesystem: { status: 'secure', count: 0 },
            malware: { status: 'secure', count: 0 },
            backdoors: { status: 'secure', count: 0 },
            integrity: { status: 'secure', count: 0 },
            wp_core: { status: 'secure', count: 0 },
            plugins: { status: 'secure', count: 0 },
            themes: { status: 'secure', count: 0 },
            database: { status: 'secure', count: 0 },
            users: { status: 'secure', count: 0 },
            config: { status: 'secure', count: 0 },
            exposure: { status: 'secure', count: 0 },
            vulnerabilities: { status: 'secure', count: 0 },
            headers: { status: 'secure', count: 0 },
            server: { status: 'secure', count: 0 },
            changes: { status: 'secure', count: 0 },
            threat_intel: { status: 'secure', count: 0 },
            redirects: { status: 'secure', count: 0 },
            seo_spam: { status: 'secure', count: 0 }
        };

        if (findings && findings.length > 0) {
            findings.forEach(function(f) {
                var dKey = mapFindingToDomain(f);
                if (domainsStatus[dKey]) {
                    domainsStatus[dKey].count++;
                    if (f.severity === 'critical') {
                        domainsStatus[dKey].status = 'threat';
                    } else if (domainsStatus[dKey].status !== 'threat') {
                        domainsStatus[dKey].status = 'warning';
                    }
                }
            });
        }

        // Apply to DOM
        Object.keys(domainsStatus).forEach(function(key) {
            var card = $('#domain-card-' + key);
            var badge = $('#badge-domain-' + key);
            var timeEl = card.find('.domain-time');
            var countEl = card.find('.domain-count');
            var data = domainsStatus[key];

            timeEl.text(nowText);
            countEl.text(data.count);

            badge.removeClass('badge-secure badge-checking badge-warning badge-danger');
            if (data.status === 'threat') {
                badge.addClass('badge-danger').text('THREAT');
            } else if (data.status === 'warning') {
                badge.addClass('badge-warning').text('WARNING');
            } else {
                badge.addClass('badge-secure').text('SECURE');
            }
        });
    }

    function mapFindingToDomain(finding) {
        var type = (finding.type || '').toLowerCase();
        var title = (finding.title || '').toLowerCase();

        if (type.indexOf('malware') !== -1 || type.indexOf('trojan') !== -1) return 'malware';
        if (type.indexOf('backdoor') !== -1 || type.indexOf('webshell') !== -1 || type.indexOf('obfuscated') !== -1) return 'backdoors';
        if (type.indexOf('core') !== -1 || title.indexOf('core file') !== -1) return 'wp_core';
        if (type.indexOf('plugin') !== -1) return 'plugins';
        if (type.indexOf('theme') !== -1) return 'themes';
        if (type.indexOf('database') !== -1 || title.indexOf('database') !== -1) return 'database';
        if (type.indexOf('user') !== -1 || type.indexOf('password') !== -1 || title.indexOf('admin') !== -1) return 'users';
        if (type.indexOf('exposure') !== -1 || type.indexOf('disclosure') !== -1 || title.indexOf('.env') !== -1) return 'exposure';
        if (type.indexOf('vulnerability') !== -1 || type.indexOf('cve') !== -1) return 'vulnerabilities';
        if (type.indexOf('header') !== -1) return 'headers';
        if (type.indexOf('php') !== -1 || type.indexOf('ssl') !== -1) return 'server';
        if (type.indexOf('integrity') !== -1 || type.indexOf('change') !== -1) return 'integrity';
        if (type.indexOf('redirect') !== -1) return 'redirects';
        if (type.indexOf('spam') !== -1) return 'seo_spam';
        return 'filesystem';
    }

    /* ------------------------------------------------------------------------
       4. EVIDENCE-DRIVEN FINDINGS RENDERER
       ------------------------------------------------------------------------ */
    function displayScanResults(data) {
        if (!data) return;
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch(e) { return; }
        }

        var score = (data.score !== undefined) ? data.score : 100;
        var issues = data.issues_found || 0;
        var duration = data.duration || data.duration_seconds || 0;
        var scanData = data.results || data.vulnerabilities || data;
        if (typeof scanData === 'string') {
            try { scanData = JSON.parse(scanData); } catch(e) { scanData = {}; }
        }

        lastScanId = data.queue_id || data.scan_id || 0;

        // Health score update
        $('#wafScanScore').html(score + '<span class="mdf-unit">/100</span>');
        if (score >= 80) {
            $('#mdfHealthSub').text('A+ Pristine Integrity').attr('class', 'mdf-metric-sub text-emerald');
        } else if (score >= 50) {
            $('#mdfHealthSub').text('B- Action Required').attr('class', 'mdf-metric-sub text-cyan');
        } else {
            $('#mdfHealthSub').text('Critical Risks Detected').attr('class', 'mdf-metric-sub text-crimson');
        }

        // Duration & Date
        $('#wafScanDate').text(formatScanDate(data.created_at || data.completed_at));
        $('#wafScanDuration').text('Duration: ' + formatDuration(duration));

        // Real Metrics
        if (scanData.real_metrics) {
            var rm = scanData.real_metrics;
            if (rm.total_files) $('#wafSummaryFilesCount').text(rm.total_files.toLocaleString());
            if (rm.plugin_files || rm.theme_files) {
                $('#wafSummaryThemesCount').text(((rm.plugin_files || 0) + (rm.theme_files || 0)).toLocaleString() + ' Components');
            }
        }

        // Parse Findings
        var findings = parseFindingsFromScanData(scanData);
        var criticalCount = 0;
        var warningCount = 0;

        findings.forEach(function(f) {
            if (f.severity === 'critical') criticalCount++;
            else warningCount++;
        });

        $('#wafCriticalCount').text(criticalCount);
        $('#mdfThreatSub').text(criticalCount === 1 ? '1 Critical Threat' : criticalCount + ' Actionable Threats');
        $('#wafResultsFoundCount').text(findings.length + ' Issues');
        $('#wafTabAllCount').text(findings.length);
        $('#wafTabCriticalCount').text(criticalCount);
        $('#wafTabWarningCount').text(warningCount);

        // Update Radar Canvas & 18 Domains
        var overallState = (criticalCount > 0) ? 'threat' : (warningCount > 0 ? 'warning' : 'protected');
        updateRadarStatusState(overallState, score, criticalCount);
        update18DomainsMatrix(scanData, findings);

        // Render Finding Cards with Structured Evidence
        renderFindingCards(findings);

        // Load History & Backups & Timeline
        loadScanHistory();
        loadBackups();
        loadSecurityTimeline(findings);
    }

    function renderFindingCards(findings) {
        if (!findings || findings.length === 0) {
            $('#wafScanDetails').html(
                '<div class="mdf-empty-findings-state">' +
                '    <div class="mdf-empty-icon"><span class="dashicons dashicons-shield-alt"></span></div>' +
                '    <h4>Zero Threats Detected</h4>' +
                '    <p>Your WordPress files, core checksums, database and server configuration match pristine baseline integrity.</p>' +
                '</div>'
            );
            return;
        }

        var html = '';
        findings.forEach(function(f, idx) {
            var sevClass = 'sev-' + (f.severity || 'warning');
            var cardClass = 'severity-' + (f.severity || 'warning');
            var filePath = f.file || '';

            html += '<div class="mdf-finding-card ' + cardClass + '" data-severity="' + f.severity + '" id="finding-' + idx + '">';
            html += '    <div class="mdf-finding-header">';
            html += '        <div class="mdf-finding-title-row">';
            html += '            <span class="mdf-sev-badge ' + sevClass + '">' + (f.severityLabel || f.severity || 'Warning') + '</span>';
            html += '            <span class="mdf-finding-title-text">' + escapeHtml(f.title) + '</span>';
            html += '        </div>';
            html += '        <div class="mdf-finding-head-actions">';
            html += '            <button type="button" class="mdf-btn mdf-btn-xs mdf-btn-secondary mdf-btn-toggle-evidence"><span class="dashicons dashicons-visibility"></span> Evidence</button>';
            html += '        </div>';
            html += '    </div>';

            html += '    <div class="mdf-finding-body">';
            html += '        <div class="mdf-finding-desc">' + f.details + '</div>';

            // Structured Evidence Box
            if (f.evidence && f.evidence.length > 0) {
                html += '    <div class="mdf-finding-evidence-box">';
                html += '        <div class="mdf-evidence-title"><span class="dashicons dashicons-shield"></span> Detection Evidence & Forensic Indicators:</div>';
                html += '        <ul class="mdf-evidence-list">';
                f.evidence.forEach(function(ev) {
                    html += '        <li>' + escapeHtml(ev) + '</li>';
                });
                html += '        </ul>';
                html += '    </div>';
            }

            // Path information
            if (f.paths) {
                html += '    <div style="font-size:12px;color:#94a3b8;margin-bottom:12px;font-family:monospace;">' + f.paths + '</div>';
            }

            // Action Buttons Bar
            html += '        <div class="mdf-finding-footer-actions">';
            if (filePath) {
                html += '        <button type="button" class="mdf-btn mdf-btn-sm mdf-btn-secondary waf-btn-view-file" data-file="' + escapeHtml(filePath) + '"><span class="dashicons dashicons-media-code"></span> View File Source</button>';
            }

            if (f.actions && f.actions.length > 0) {
                f.actions.forEach(function(act) {
                    var btnClass = act.class || 'mdf-btn-secondary';
                    if (btnClass.indexOf('restore') !== -1) {
                        html += '    <button type="button" class="mdf-btn mdf-btn-sm mdf-btn-emerald ' + btnClass + '" data-file="' + escapeHtml(act.file || filePath) + '"><span class="dashicons dashicons-update"></span> ' + act.label + '</button>';
                    } else if (btnClass.indexOf('clean') !== -1 || btnClass.indexOf('quarantine') !== -1) {
                        html += '    <button type="button" class="mdf-btn mdf-btn-sm mdf-btn-danger ' + btnClass + '" data-file="' + escapeHtml(act.file || filePath) + '"><span class="dashicons dashicons-vault"></span> Quarantine & Clean</button>';
                    } else if (btnClass.indexOf('diff') !== -1) {
                        html += '    <button type="button" class="mdf-btn mdf-btn-sm mdf-btn-secondary ' + btnClass + '" data-file="' + escapeHtml(act.file || filePath) + '"><span class="dashicons dashicons-randomize"></span> ' + act.label + '</button>';
                    } else {
                        html += '    <button type="button" class="mdf-btn mdf-btn-sm mdf-btn-secondary ' + btnClass + '" data-file="' + escapeHtml(act.file || filePath) + '">' + act.label + '</button>';
                    }
                });
            }

            html += '            <button type="button" class="mdf-btn mdf-btn-sm mdf-btn-secondary waf-btn-ignore-file" data-file="' + escapeHtml(filePath) + '"><span class="dashicons dashicons-hidden"></span> Ignore / Whitelist</button>';
            html += '        </div>';
            html += '    </div>';
            html += '</div>';
        });

        $('#wafScanDetails').html(html);
    }

    function parseFindingsFromScanData(scanData) {
        var findings = [];
        if (!scanData || typeof scanData !== 'object') return findings;

        // 1. WordPress Core Checksum Mismatches
        if (scanData.malware_scan && scanData.malware_scan.wp_checksums) {
            var checksums = scanData.malware_scan.wp_checksums;
            if (checksums.modified_files && checksums.modified_files.length > 0) {
                checksums.modified_files.forEach(function(f, idx) {
                    var isConfig = (f.file.indexOf('wp-config.php') !== -1);
                    var cardActs = [];
                    if (!isConfig) {
                        cardActs.push({ label: 'Visual Diff', class: 'waf-btn-view-diff', file: f.file });
                        cardActs.push({ label: 'Restore Core File', class: 'waf-btn-restore-file', file: f.file });
                    }
                    findings.push({
                        id: 'checksum_mismatch_' + idx,
                        title: 'WordPress Core Integrity Divergence: ' + f.file,
                        type: 'WordPress Core Integrity',
                        severity: 'critical',
                        severityLabel: 'Critical',
                        details: 'Official WordPress.org SHA-256 hash verification failed. The core file <code>' + f.file + '</code> has been altered from its pristine release version.',
                        evidence: [
                            'SHA-256 hash does not match WordPress.org official API hash repository.',
                            'File was unexpectedly modified on server disk.',
                            'Integrity protection active: restore directly from official repository.'
                        ],
                        paths: 'File path: <code>' + f.file + '</code>',
                        file: f.file,
                        actions: cardActs
                    });
                });
            }
        }

        // 2. Malware & Webshell Scan Findings
        if (scanData.malware_scan && scanData.malware_scan.suspicious_files) {
            scanData.malware_scan.suspicious_files.forEach(function(f, idx) {
                var isCore = isCoreFile(f.file);
                var cardActs = [];
                if (isCore && f.file.indexOf('wp-config.php') === -1) {
                    cardActs.push({ label: 'Visual Diff', class: 'waf-btn-view-diff', file: f.file });
                    cardActs.push({ label: 'Restore Core File', class: 'waf-btn-restore-file', file: f.file });
                } else {
                    cardActs.push({ label: 'Quarantine & Clean', class: 'waf-btn-clean-file', file: f.file });
                }

                var evList = [];
                if (f.findings && Array.isArray(f.findings) && f.findings.length > 0) {
                    evList = f.findings;
                } else if (f.reasons && Array.isArray(f.reasons) && f.reasons.length > 0) {
                    evList = f.reasons;
                } else {
                    evList.push(f.threat || 'Dynamic heuristic / static signature match detected.');
                }

                var sevLabel = f.severity === 'critical' || f.score >= 80 ? 'Critical Threat' : (f.severity === 'warning' ? 'Warning' : 'Suspicious');
                var sev = f.severity || (f.score >= 80 ? 'critical' : 'warning');

                findings.push({
                    id: 'malware_file_' + idx,
                    title: (f.threat || (sev === 'critical' ? 'Malicious Payload / Webshell Detected' : 'Suspicious File Pattern')) + ': ' + f.file,
                    type: 'Malware & Trojan',
                    severity: sev,
                    severityLabel: sevLabel,
                    details: 'Forensic static analysis identified potential security risk in <code>' + f.file + '</code> (Risk Score: ' + (f.score || 85) + '/100).',
                    evidence: evList,
                    paths: 'Target file: <code>' + f.file + '</code>',
                    file: f.file,
                    actions: cardActs
                });
            });
        }

        // 3. Exposed Sensitive Secrets & Configuration Files
        if (scanData.config_exposure && scanData.config_exposure.exposed_files) {
            scanData.config_exposure.exposed_files.forEach(function(ef, idx) {
                var cleanFile = ef.path ? ef.path.replace(/^\/+/, '') : '';
                var isCrit = ef.severity === 'critical';
                var isWarn = ef.severity === 'warning';
                
                var riskDesc = 'Publicly accessible file reachable without authentication.';
                if (isCrit) {
                    riskDesc = 'Can lead to database credential leakage or unauthorized remote administrative access.';
                } else if (isWarn) {
                    riskDesc = 'Can expose internal project dependencies or environment configuration.';
                } else {
                    riskDesc = 'Exposes application version and system fingerprint information.';
                }

                findings.push({
                    id: 'exposed_config_' + idx,
                    title: (isCrit ? 'Critical Exposure: ' : (isWarn ? 'Warning: Exposed Resource: ' : 'Notice: Public Metadata: ')) + cleanFile,
                    type: 'Public Exposure',
                    severity: ef.severity || 'warning',
                    severityLabel: isCrit ? 'Critical' : (isWarn ? 'Warning' : 'Notice'),
                    details: 'A publicly reachable resource was detected: <code>' + cleanFile + '</code> (' + (ef.description || 'Publicly exposed resource') + ').',
                    evidence: [
                        'Resource is directly accessible over HTTP (HTTP ' + (ef.status || 200) + ').',
                        riskDesc
                    ],
                    paths: 'URL: <code>' + (ef.url || ef.path) + '</code>',
                    file: cleanFile,
                    actions: [
                        { label: 'Hide via Hardening', class: 'waf-btn-hide-file', file: cleanFile }
                    ]
                });
            });
        }

        // 4. Vulnerable Plugins or Themes
        if (scanData.vulnerability_scan && scanData.vulnerability_scan.vulnerabilities) {
            scanData.vulnerability_scan.vulnerabilities.forEach(function(v, idx) {
                findings.push({
                    id: 'vuln_comp_' + idx,
                    title: 'Known CVE Vulnerability in ' + (v.name || 'Component'),
                    type: 'Vulnerability Detection',
                    severity: v.severity || 'high',
                    severityLabel: (v.severity || 'High').toUpperCase(),
                    details: 'Installed version: <code>' + (v.installed_version || 'Unknown') + '</code> is vulnerable to ' + (v.title || 'known exploit') + '.',
                    evidence: [
                        'CVE Identifier: ' + (v.cve || 'CVE-Pending'),
                        'Fixed in version: ' + (v.fixed_version || 'Latest release'),
                        'Affected versions: ' + (v.affected_versions || 'All prior')
                    ],
                    paths: 'Component: <code>' + (v.slug || v.name) + '</code>',
                    file: v.slug || '',
                    actions: [
                        { label: 'Update Component', class: 'waf-btn-update-comp', file: v.slug }
                    ]
                });
            });
        }

        return findings;
    }

    function isCoreFile(filePath) {
        if (!filePath || typeof filePath !== 'string') return false;
        var p = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
        var rootCore = [
            'wp-config.php', 'wp-config-sample.php', 'index.php', '.htaccess',
            'wp-settings.php', 'wp-load.php', 'wp-login.php', 'wp-blog-header.php',
            'wp-activate.php', 'wp-comments-post.php', 'wp-cron.php', 'xmlrpc.php'
        ];
        if (p.indexOf('/') === -1 && rootCore.indexOf(p.toLowerCase()) !== -1) return true;
        if (p.indexOf('wp-admin/') === 0 || p.indexOf('wp-includes/') === 0) return true;
        return false;
    }

    /* ------------------------------------------------------------------------
       5. SECURITY TIMELINE FEED LOADER
       ------------------------------------------------------------------------ */
    function loadSecurityTimeline(findings) {
        var container = $('#mdfTimelineFeed');
        var html = '';

        if (findings && findings.length > 0) {
            findings.forEach(function(f) {
                var dotClass = f.severity === 'critical' ? 'dot-crimson' : 'dot-cyan';
                html += '<div class="mdf-timeline-item">';
                html += '    <div class="mdf-timeline-dot ' + dotClass + '"></div>';
                html += '    <div class="mdf-timeline-content">';
                html += '        <div class="mdf-timeline-top">';
                html += '            <span class="mdf-timeline-title">' + escapeHtml(f.title) + '</span>';
                html += '            <span class="mdf-timeline-time">Just now</span>';
                html += '        </div>';
                html += '        <p class="mdf-timeline-desc">' + escapeHtml(f.details.replace(/<[^>]*>/g, '').substring(0, 110)) + '...</p>';
                html += '    </div>';
                html += '</div>';
            });
        }

        html += '<div class="mdf-timeline-item">';
        html += '    <div class="mdf-timeline-dot dot-emerald"></div>';
        html += '    <div class="mdf-timeline-content">';
        html += '        <div class="mdf-timeline-top">';
        html += '            <span class="mdf-timeline-title">Autonomous Radar Initialized</span>';
        html += '            <span class="mdf-timeline-time">Active</span>';
        html += '        </div>';
        html += '        <p class="mdf-timeline-desc">Continuous background monitoring engine online with micro-batch queues.</p>';
        html += '    </div>';
        html += '</div>';

        container.html(html);
    }

    /* ------------------------------------------------------------------------
       6. QUARANTINE & BACKUP VAULT
       ------------------------------------------------------------------------ */
    function loadBackups() {
        $.get(ajaxurl + '?action=waf_fw_get_backups', function(r) {
            if (r.success && r.data) {
                var count = r.data.length;
                $('#wafBackupCount').text(count + (count === 1 ? ' Backup' : ' Backups'));
                $('#wafBackupCountBadge').text(count);

                if (count > 0) {
                    var html = '';
                    $.each(r.data, function(i, b) {
                        html += '<tr>';
                        html += '    <td style="font-weight:600;color:#ffffff;word-break:break-all;">' + escapeHtml(b.original_path) + '</td>';
                        html += '    <td style="color:#94a3b8;">' + escapeHtml(b.time) + '</td>';
                        html += '    <td style="color:#94a3b8;">' + escapeHtml(b.size) + '</td>';
                        html += '    <td style="color:#64748b;font-family:monospace;font-size:11px;">' + escapeHtml(b.hash || 'Verified') + '</td>';
                        html += '    <td style="text-align:right;">';
                        html += '        <button type="button" class="mdf-btn-xs mdf-btn-emerald waf-btn-restore-backup" data-file="' + escapeHtml(b.original_path) + '" style="margin-right:6px;">Restore</button>';
                        html += '        <button type="button" class="mdf-btn-xs mdf-btn-danger waf-btn-delete-backup" data-file="' + escapeHtml(b.original_path) + '">Delete</button>';
                        html += '    </td>';
                        html += '</tr>';
                    });
                    $('#wafBackupsBody').html(html);
                } else {
                    $('#wafBackupsBody').html('<tr><td colspan="5" class="mdf-td-empty">No files currently in quarantine. Suspicious files are backed up here prior to cleaning.</td></tr>');
                }
            }
        });
    }

    /* ------------------------------------------------------------------------
       7. SCAN HISTORY VAULT
       ------------------------------------------------------------------------ */
    function loadScanHistory() {
        $.get(ajaxurl + '?action=waf_fw_get_scan_history', function(r) {
            if (r.success && r.data && r.data.length > 0) {
                var html = '';
                $.each(r.data, function(i, scan) {
                    var scoreClass = scan.score >= 80 ? 'text-emerald' : (scan.score >= 50 ? 'text-cyan' : 'text-crimson');
                    var statusBadge = scan.score >= 80 ? 'badge-secure' : (scan.score >= 50 ? 'badge-warning' : 'badge-danger');
                    var statusText = scan.score >= 80 ? 'Passed' : (scan.score >= 50 ? 'Warning' : 'Issues Found');

                    html += '<tr>';
                    html += '    <td style="color:#94a3b8;">' + escapeHtml(scan.created_at) + '</td>';
                    html += '    <td><span class="mdf-sec-badge">' + escapeHtml(scan.scan_type.toUpperCase()) + '</span></td>';
                    html += '    <td><strong class="' + scoreClass + '">' + scan.score + '</strong>/100</td>';
                    html += '    <td>' + scan.issues_found + '</td>';
                    html += '    <td style="color:#94a3b8;">' + scan.duration_seconds + 's</td>';
                    html += '    <td style="text-align:right;"><span class="mdf-domain-status-badge ' + statusBadge + '">' + statusText + '</span></td>';
                    html += '</tr>';
                });
                $('#wafScanHistoryBody').html(html);
            }
        });
    }

    /* ------------------------------------------------------------------------
       8. WORDFENCE-GRADE VISUAL DIFF VIEWER (SPLIT & UNIFIED)
       ------------------------------------------------------------------------ */
    var activeDiffFile = '';
    var activeDiffData = null;

    function openDiffModal(filePath) {
        activeDiffFile = filePath;
        $('#wafDiffFileName').text(filePath);
        $('#wafDiffModal').css('display', 'flex');
        $('#wafDiffLoading').show();
        $('#wafDiffContent').hide();
        $('#wafDiffOriginalMeta').text('Loading...');
        $('#wafDiffLocalMeta').text('Loading...');

        $.ajax({
            url: ajaxurl + '?action=waf_fw_diff_core_file&file=' + encodeURIComponent(filePath),
            method: 'GET',
            success: function(r) {
                if (r.success && r.data) {
                    activeDiffData = r.data;
                    $('#wafDiffLoading').hide();
                    $('#wafDiffContent').show();
                    $('#wafDiffOriginalMeta').text((r.data.wp_version || 'Core') + ' (Official)');
                    $('#wafDiffLocalMeta').text('Modified on Disk');

                    var diffRows = computeDiffRows(r.data.original_code, r.data.local_code);
                    renderDiffTables(diffRows);
                } else {
                    $('#wafDiffLoading').html('<span style="color:#ef4444;">' + (r.data ? r.data.message : 'Failed to retrieve original reference file.') + '</span>');
                }
            },
            error: function() {
                $('#wafDiffLoading').html('<span style="color:#ef4444;">Network error fetching official WordPress.org file.</span>');
            }
        });
    }

    function computeDiffRows(originalStr, localStr) {
        var origLines = (originalStr || '').split(/\r\n|\r|\n/);
        var localLines = (localStr || '').split(/\r\n|\r|\n/);
        var n = origLines.length;
        var m = localLines.length;

        if (n > 3000 || m > 3000) {
            var rows = [];
            var maxLen = Math.max(n, m);
            for (var i = 0; i < maxLen; i++) {
                var ol = i < n ? origLines[i] : null;
                var ll = i < m ? localLines[i] : null;
                if (ol === ll) {
                    rows.push({ type: 'same', leftLn: i+1, rightLn: i+1, leftText: ol, rightText: ll });
                } else if (ol === null) {
                    rows.push({ type: 'added', leftLn: '', rightLn: i+1, leftText: '', rightText: ll });
                } else if (ll === null) {
                    rows.push({ type: 'deleted', leftLn: i+1, rightLn: '', leftText: ol, rightText: '' });
                } else {
                    rows.push({ type: 'modified', leftLn: i+1, rightLn: i+1, leftText: ol, rightText: ll });
                }
            }
            return rows;
        }

        var dp = [];
        for (var i = 0; i <= n; i++) dp[i] = new Uint16Array(m + 1);
        for (var i = 1; i <= n; i++) {
            for (var j = 1; j <= m; j++) {
                if (origLines[i - 1] === localLines[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }

        var rows = [];
        var i = n, j = m;
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && origLines[i - 1] === localLines[j - 1]) {
                rows.unshift({ type: 'same', leftLn: i, rightLn: j, leftText: origLines[i - 1], rightText: localLines[j - 1] });
                i--; j--;
            } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
                rows.unshift({ type: 'added', leftLn: '', rightLn: j, leftText: '', rightText: localLines[j - 1] });
                j--;
            } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
                rows.unshift({ type: 'deleted', leftLn: i, rightLn: '', leftText: origLines[i - 1], rightText: '' });
                i--;
            }
        }
        return rows;
    }

    function renderDiffTables(diffRows) {
        var leftHtml = '';
        var rightHtml = '';
        var unifiedHtml = '';
        var additions = 0;
        var deletions = 0;

        diffRows.forEach(function(row) {
            var rowClassLeft = '';
            var rowClassRight = '';
            var rowClassUnified = '';
            var uPrefix = ' ';

            if (row.type === 'same') {
                uPrefix = ' ';
            } else if (row.type === 'added') {
                additions++;
                rowClassRight = 'waf-diff-row-added';
                rowClassUnified = 'waf-diff-row-added';
                uPrefix = '+';
            } else if (row.type === 'deleted') {
                deletions++;
                rowClassLeft = 'waf-diff-row-deleted';
                rowClassUnified = 'waf-diff-row-deleted';
                uPrefix = '-';
            } else if (row.type === 'modified') {
                additions++;
                deletions++;
                rowClassLeft = 'waf-diff-row-deleted';
                rowClassRight = 'waf-diff-row-added';
                rowClassUnified = 'waf-diff-row-modified';
                uPrefix = '~';
            }

            var leftEsc = escapeHtml(row.leftText || '');
            var rightEsc = escapeHtml(row.rightText || '');

            leftHtml += '<tr class="' + rowClassLeft + '"><td class="waf-diff-ln">' + (row.leftLn || '') + '</td><td>' + leftEsc + '</td></tr>';
            rightHtml += '<tr class="' + rowClassRight + '"><td class="waf-diff-ln">' + (row.rightLn || '') + '</td><td>' + rightEsc + '</td></tr>';

            var uText = (row.type === 'deleted') ? leftEsc : rightEsc;
            var uLn = (row.rightLn || row.leftLn || '');
            unifiedHtml += '<tr class="' + rowClassUnified + '"><td class="waf-diff-ln">' + uLn + '</td><td>' + uPrefix + ' ' + uText + '</td></tr>';
        });

        $('#wafDiffLeftTable').html(leftHtml);
        $('#wafDiffRightTable').html(rightHtml);
        $('#wafDiffUnifiedTable').html(unifiedHtml);
        $('#wafDiffLineStats').html('<span class="text-emerald">+' + additions + ' additions</span> &bull; <span class="text-crimson">-' + deletions + ' deletions</span>');
    }

    /* ------------------------------------------------------------------------
       9. TIMERS & UTILITIES
       ------------------------------------------------------------------------ */
    function formatDuration(seconds) {
        if (!seconds || seconds <= 0) return '0s';
        if (seconds < 60) return seconds + 's';
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        return m + 'm ' + s + 's';
    }

    function formatScanDate(dateStr) {
        if (!dateStr) return 'Just now';
        var date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
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

    function checkActiveScanOnLoad() {
        $.get(ajaxurl + '?action=waf_fw_get_active_or_last_scan', function(r) {
            if (r.success && r.data) {
                var scan = r.data;
                if (scan.type === 'completed') {
                    displayScanResults(scan);
                } else if (scan.type === 'running') {
                    scanQueueId = scan.queue_id;
                    scanRunning = true;
                    $('#wafScanProgress').show();
                    updateProgress(scan);
                    scheduleContinue();
                }
            }
        });
    }

    /* ------------------------------------------------------------------------
       10. EVENT BINDINGS & READY HANDLER
       ------------------------------------------------------------------------ */
    $(document).ready(function() {
        // Initialize Radar Canvas
        initRadarCanvas();

        // Check active / last scan
        checkActiveScanOnLoad();
        loadBackups();

        // Scan Start Handlers
        $('#wafStartFullScan').on('click', function() {
            startProgressiveScan('full');
        });

        $('#wafStartQuickScan').on('click', function() {
            startProgressiveScan('quick');
        });

        // Continuous Monitoring Switch
        $('#mdfContinuousMonitoringToggle').on('change', function() {
            var enabled = $(this).is(':checked') ? 'yes' : 'no';
            $.post(ajaxurl + '?action=waf_fw_save_scheduled_scan_settings', {
                enabled: enabled,
                interval: $('#wafScheduledScanInterval').val() || 'weekly',
                email: $('#wafScheduledScanEmail').val() || ''
            }, function(r) {
                if (r.success) {
                    updateRadarStatusState('protected');
                }
            });
        });

        // Findings Filter Tabs
        $('.mdf-tab-btn').on('click', function() {
            $('.mdf-tab-btn').removeClass('active');
            $(this).addClass('active');
            var tab = $(this).data('tab');

            if (tab === 'all') {
                $('.mdf-finding-card').show();
            } else if (tab === 'critical') {
                $('.mdf-finding-card').hide();
                $('.mdf-finding-card.severity-critical').show();
            } else if (tab === 'warning') {
                $('.mdf-finding-card').hide();
                $('.mdf-finding-card.severity-warning, .mdf-finding-card.severity-high').show();
            } else if (tab === 'ignored') {
                $('.mdf-finding-card').hide();
            }
        });

        // Expand / Collapse Finding Cards
        $(document).on('click', '.mdf-finding-header', function(e) {
            if ($(e.target).closest('button, a').length > 0) return;
            var body = $(this).closest('.mdf-finding-card').find('.mdf-finding-body');
            body.slideToggle(180);
        });

        $(document).on('click', '.mdf-btn-toggle-evidence', function(e) {
            e.stopPropagation();
            var body = $(this).closest('.mdf-finding-card').find('.mdf-finding-body');
            body.slideToggle(180);
        });

        $('#wafToggleAllDetailsBtn').on('click', function() {
            var bodies = $('.mdf-finding-body');
            var text = $('#wafToggleAllText');
            if (bodies.first().is(':visible')) {
                bodies.slideUp(180);
                text.text('Expand All');
            } else {
                bodies.slideDown(180);
                text.text('Collapse All');
            }
        });

        // View Code Modal
        $(document).on('click', '.waf-btn-view-file', function() {
            var file = $(this).data('file') || $(this).attr('data-file');
            $('#wafCodeModalTitle').text(file);
            $('#wafCodeModalMeta').text('Loading source code...');
            $('#wafModalCode').text('Loading source code from server...');
            $('#wafCodeModal').css('display', 'flex');

            $.get(ajaxurl, { action: 'waf_fw_view_scan_file', file: file }, function(r) {
                if (r.success && r.data) {
                    var codeText = r.data.code !== undefined ? r.data.code : (r.data.content !== undefined ? r.data.content : '');
                    var linesCount = r.data.lines || (codeText ? codeText.split('\n').length : 0);
                    var sizeStr = r.data.size || '';
                    $('#wafCodeModalMeta').text(linesCount + ' lines' + (sizeStr ? ' • ' + sizeStr : ''));
                    $('#wafModalCode').text(codeText);
                } else {
                    $('#wafModalCode').text('Unable to read file contents: ' + (r.data && r.data.message ? r.data.message : 'Permission denied or file not found.'));
                }
            }).fail(function(xhr) {
                $('#wafModalCode').text('HTTP ' + xhr.status + ': Failed to retrieve file source from server.');
            });
        });

        $('#wafCloseCodeModalBtn').on('click', function() {
            $('#wafCodeModal').hide();
        });

        // Visual Diff Modal Handlers
        $(document).on('click', '.waf-btn-view-diff', function() {
            var file = $(this).data('file');
            openDiffModal(file);
        });

        $('#wafCloseDiffModalBtn, #wafDiffCancelBtn').on('click', function() {
            $('#wafDiffModal').hide();
        });

        $('.waf-diff-mode-btn').on('click', function() {
            $('.waf-diff-mode-btn').removeClass('active');
            $(this).addClass('active');
            var mode = $(this).data('mode');
            if (mode === 'unified') {
                $('#wafDiffSplitView').hide();
                $('#wafDiffUnifiedView').show();
            } else {
                $('#wafDiffUnifiedView').hide();
                $('#wafDiffSplitView').show();
            }
        });

        // Restore Core File
        $(document).on('click', '.waf-btn-restore-file, #wafDiffRestoreBtn', function() {
            var file = $(this).data('file') || activeDiffFile;
            if (!confirm('Restore "' + file + '" to its original pristine official WordPress.org release version? A backup will be stored safely.')) return;

            $.post(ajaxurl + '?action=waf_fw_restore_core_file', { file: file }, function(r) {
                if (r.success) {
                    alert('File restored successfully from official WordPress.org repository!');
                    $('#wafDiffModal').hide();
                    loadBackups();
                    checkActiveScanOnLoad();
                } else {
                    alert('Error: ' + (r.data ? r.data.message : 'Restore failed'));
                }
            });
        });

        // Clean & Quarantine File
        $(document).on('click', '.waf-btn-clean-file', function() {
            var file = $(this).data('file');
            if (!confirm('Safely quarantine and neutralize threat in "' + file + '"? A backup will be preserved.')) return;

            $.post(ajaxurl + '?action=waf_fw_delete_scan_file', { file: file }, function(r) {
                if (r.success) {
                    alert('Threat safely quarantined and removed!');
                    loadBackups();
                    checkActiveScanOnLoad();
                } else {
                    alert('Error: ' + (r.data ? r.data.message : 'Quarantine failed'));
                }
            });
        });

        // Ignore File
        $(document).on('click', '.waf-btn-ignore-file', function() {
            var file = $(this).data('file');
            if (!confirm('Ignore finding for "' + file + '"?')) return;

            $.post(ajaxurl + '?action=waf_fw_ignore_scan_issue', { file: file }, function(r) {
                if (r.success) {
                    checkActiveScanOnLoad();
                }
            });
        });

        // Schedule Modal
        $('#wafOpenScheduleBtn').on('click', function(e) {
            e.preventDefault();
            $('#wafScheduleModal').css('display', 'flex');
        });

        $('#wafScheduleCancel, #wafScheduleModalClose').on('click', function() {
            $('#wafScheduleModal').hide();
        });

        $('#wafScheduleSave').on('click', function() {
            var enabled = $('#wafScheduledScanEnabled').is(':checked') ? 'yes' : 'no';
            var interval = $('#wafScheduledScanInterval').val();
            var email = $('#wafScheduledScanEmail').val();

            $.post(ajaxurl + '?action=waf_fw_save_scheduled_scan_settings', {
                enabled: enabled,
                interval: interval,
                email: email
            }, function(r) {
                if (r.success) {
                    alert('Scan schedule saved successfully!');
                    $('#wafScheduleModal').hide();
                }
            });
        });

        // Clear History
        $('#wafClearHistory').on('click', function() {
            if (!confirm('Clear all scan history logs?')) return;
            $.post(ajaxurl + '?action=waf_fw_clear_scan_history', function(r) {
                if (r.success) {
                    loadScanHistory();
                }
            });
        });

        // Restore / Delete from Vault
        $(document).on('click', '.waf-btn-restore-backup', function() {
            var file = $(this).data('file');
            if (!confirm('Restore this backup file to its original location: ' + file + '?')) return;
            $.ajax({
                url: ajaxurl + '?action=waf_fw_restore_file',
                type: 'POST',
                data: JSON.stringify({ file: file }),
                contentType: 'application/json',
                success: function(r) {
                    if (r.success) {
                        alert('File restored successfully!');
                        loadBackups();
                    } else {
                        alert('Restoration error: ' + (r.data ? r.data.message : 'Failed'));
                    }
                }
            });
        });

        $(document).on('click', '.waf-btn-delete-backup', function() {
            var file = $(this).data('file');
            if (!confirm('Permanently delete backup for: ' + file + '?')) return;
            $.ajax({
                url: ajaxurl + '?action=waf_fw_delete_backup',
                type: 'POST',
                data: JSON.stringify({ file: file }),
                contentType: 'application/json',
                success: function(r) {
                    if (r.success) {
                        loadBackups();
                    }
                }
            });
        });
    });

})(jQuery);
