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
    var radarState = 'unscanned';

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

        // Initialize 24 coordinate blips around the radar perimeter/rings
        radarBlips = [];
        for (var b = 0; b < 24; b++) {
            var angle = (b / 24) * Math.PI * 2 + (b % 3) * 0.1;
            var dist = maxRadius * (0.28 + 0.62 * ((b * 7) % 11) / 10);
            radarBlips.push({
                x: cx + Math.cos(angle) * dist,
                y: cy + Math.sin(angle) * dist,
                angle: angle,
                dist: dist,
                alpha: 0.2,
                pingRadius: 0,
                pingAlpha: 0,
                state: (b === 5 && radarState === 'threat') ? 'threat' : 'secure',
                size: 3.2
            });
        }

        var sonarPulse1 = 0;
        var sonarPulse2 = maxRadius * 0.5;

        function drawRadar() {
            ctx.clearRect(0, 0, width, height);

            // 1. High-Tech Holographic Background
            var bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxRadius);
            bgGrad.addColorStop(0, '#ffffff');
            bgGrad.addColorStop(0.5, '#F9FAF9');
            bgGrad.addColorStop(0.82, '#EDF5F0');
            bgGrad.addColorStop(1, '#E1EEE6');
            ctx.fillStyle = bgGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, maxRadius, 0, Math.PI * 2);
            ctx.fill();

            // 2. Animated Sonar Shockwave Ripples
            sonarPulse1 = (sonarPulse1 + (scanRunning ? 1.5 : 0.6)) % maxRadius;
            sonarPulse2 = (sonarPulse2 + (scanRunning ? 1.5 : 0.6)) % maxRadius;
            
            [sonarPulse1, sonarPulse2].forEach(function(pulseRadius) {
                var pAlpha = (1 - (pulseRadius / maxRadius)) * (scanRunning ? 0.35 : 0.18);
                ctx.strokeStyle = (radarState === 'critical' || radarState === 'threat')
                    ? 'rgba(223, 90, 56, ' + pAlpha + ')'
                    : ((radarState === 'unscanned' || radarState === 'unknown') ? 'rgba(105, 118, 111, ' + pAlpha + ')' : (scanRunning ? 'rgba(5, 150, 105, ' + pAlpha + ')' : 'rgba(16, 185, 129, ' + pAlpha + ')'));
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
                ctx.stroke();
            });

            // 3. Concentric Target Rings with Distance Markers
            var rings = [0.25, 0.5, 0.75, 1.0];
            rings.forEach(function(r) {
                ctx.strokeStyle = r === 1.0 ? 'rgba(5, 150, 105, 0.4)' : 'rgba(15, 44, 38, 0.12)';
                ctx.lineWidth = r === 1.0 ? 1.8 : 1;
                ctx.beginPath();
                ctx.arc(cx, cy, maxRadius * r, 0, Math.PI * 2);
                ctx.stroke();
            });

            // 4. Outer Degree Ticks & Compass Markers (0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°)
            for (var deg = 0; deg < 360; deg += 15) {
                var rad = (deg * Math.PI) / 180;
                var isMajor = deg % 45 === 0;
                var innerR = maxRadius - (isMajor ? 8 : 4);
                ctx.strokeStyle = isMajor ? 'rgba(5, 150, 105, 0.45)' : 'rgba(15, 44, 38, 0.16)';
                ctx.lineWidth = isMajor ? 1.5 : 1;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(rad) * innerR, cy + Math.sin(rad) * innerR);
                ctx.lineTo(cx + Math.cos(rad) * maxRadius, cy + Math.sin(rad) * maxRadius);
                ctx.stroke();
            }

            // 5. Crosshairs & Cardinal Coordinate Lines
            ctx.strokeStyle = 'rgba(15, 44, 38, 0.14)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx - maxRadius, cy);
            ctx.lineTo(cx + maxRadius, cy);
            ctx.moveTo(cx, cy - maxRadius);
            ctx.lineTo(cx, cy + maxRadius);
            ctx.stroke();

            // Diagonal Guides
            ctx.strokeStyle = 'rgba(15, 44, 38, 0.08)';
            ctx.beginPath();
            ctx.moveTo(cx - maxRadius * 0.707, cy - maxRadius * 0.707);
            ctx.lineTo(cx + maxRadius * 0.707, cy + maxRadius * 0.707);
            ctx.moveTo(cx + maxRadius * 0.707, cy - maxRadius * 0.707);
            ctx.lineTo(cx - maxRadius * 0.707, cy + maxRadius * 0.707);
            ctx.stroke();

            // 6. Rotating Radar Sweep Beam with Phosphor Fade
            var sweepSpeed = scanRunning ? 0.055 : 0.018;
            radarSweepAngle = (radarSweepAngle + sweepSpeed) % (Math.PI * 2);

            var sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
            if (radarState === 'critical' || radarState === 'threat') {
                sweepGrad.addColorStop(0, 'rgba(223, 90, 56, 0.45)');
                sweepGrad.addColorStop(0.7, 'rgba(223, 90, 56, 0.15)');
                sweepGrad.addColorStop(1, 'rgba(223, 90, 56, 0.0)');
            } else if (radarState === 'unscanned' || radarState === 'unknown') {
                sweepGrad.addColorStop(0, 'rgba(105, 118, 111, 0.2)');
                sweepGrad.addColorStop(0.7, 'rgba(105, 118, 111, 0.08)');
                sweepGrad.addColorStop(1, 'rgba(105, 118, 111, 0.01)');
            } else if (scanRunning) {
                sweepGrad.addColorStop(0, 'rgba(16, 185, 129, 0.45)');
                sweepGrad.addColorStop(0.6, 'rgba(5, 150, 105, 0.2)');
                sweepGrad.addColorStop(1, 'rgba(15, 44, 38, 0.01)');
            } else {
                sweepGrad.addColorStop(0, 'rgba(16, 185, 129, 0.38)');
                sweepGrad.addColorStop(0.7, 'rgba(16, 185, 129, 0.12)');
                sweepGrad.addColorStop(1, 'rgba(16, 185, 129, 0.01)');
            }

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, maxRadius, radarSweepAngle - 0.55, radarSweepAngle);
            ctx.closePath();
            ctx.fillStyle = sweepGrad;
            ctx.fill();

            // Sweep leading edge line with intense glow
            var strokeColor = (radarState === 'critical' || radarState === 'threat')
                ? '#DF5A38'
                : ((radarState === 'unscanned' || radarState === 'unknown') ? '#87938b' : (scanRunning ? '#059669' : '#10b981'));
            ctx.strokeStyle = strokeColor;
            ctx.shadowColor = strokeColor;
            ctx.shadowBlur = 8;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(radarSweepAngle) * maxRadius, cy + Math.sin(radarSweepAngle) * maxRadius);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();

            // 7. Draw Dynamic Target Blips with Expanding Echo Rings
            radarBlips.forEach(function(blip) {
                var diff = Math.abs(radarSweepAngle - blip.angle);
                if (diff < 0.14 || Math.abs(diff - Math.PI * 2) < 0.14) {
                    blip.alpha = 1.0;
                    blip.pingRadius = blip.size;
                    blip.pingAlpha = 0.8;
                } else {
                    blip.alpha = Math.max(0.18, blip.alpha - 0.012);
                }

                // Echo ping expanding ring
                if (blip.pingAlpha > 0.05) {
                    blip.pingRadius += 0.5;
                    blip.pingAlpha -= 0.03;
                    ctx.strokeStyle = (blip.state === 'threat' || radarState === 'threat' || radarState === 'critical')
                        ? 'rgba(223, 90, 56, ' + blip.pingAlpha + ')'
                        : ((radarState === 'unscanned' || radarState === 'unknown') ? 'rgba(105, 118, 111, ' + blip.pingAlpha + ')' : (scanRunning ? 'rgba(5, 150, 105, ' + blip.pingAlpha + ')' : 'rgba(16, 185, 129, ' + blip.pingAlpha + ')'));
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(blip.x, blip.y, blip.pingRadius, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // Core blip
                ctx.beginPath();
                ctx.arc(blip.x, blip.y, blip.size, 0, Math.PI * 2);
                if (blip.state === 'threat' || radarState === 'threat' || radarState === 'critical') {
                    ctx.fillStyle = 'rgba(223, 90, 56, ' + blip.alpha + ')';
                    ctx.shadowColor = '#DF5A38';
                    ctx.shadowBlur = 8;
                } else if (blip.state === 'warning') {
                    ctx.fillStyle = 'rgba(217, 119, 6, ' + blip.alpha + ')';
                    ctx.shadowColor = '#d97706';
                    ctx.shadowBlur = 6;
                } else if (scanRunning) {
                    ctx.fillStyle = 'rgba(5, 150, 105, ' + blip.alpha + ')';
                    ctx.shadowColor = '#059669';
                    ctx.shadowBlur = 7;
                } else if (radarState === 'unscanned' || radarState === 'unknown') {
                    ctx.fillStyle = 'rgba(105, 118, 111, ' + blip.alpha + ')';
                    ctx.shadowColor = '#69766f';
                    ctx.shadowBlur = 4;
                } else {
                    ctx.fillStyle = 'rgba(16, 185, 129, ' + blip.alpha + ')';
                    ctx.shadowColor = '#10b981';
                    ctx.shadowBlur = 5;
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
        var targetLabel = $('#mdfRadarTargetLabel');
        var sweepText = $('#mdfSweepStatus');

        if (centerScore.length) {
            centerScore.text(typeof score === 'number' && isFinite(score) ? score + '%' : '—');
        }

        if (state === 'scanning') {
            pill.css({ background: 'rgba(56, 189, 248, 0.15)', borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' });
            dot.css({ background: '#38bdf8', boxShadow: '0 0 10px #38bdf8' });
            text.text('SCANNING & ANALYZING');
            targetLabel.text('SCANNING');
            sweepText.text('High-Frequency Scan');
        } else if (state === 'unscanned' || state === 'unknown') {
            pill.css({ background: '#f1f4f2', borderColor: '#dce3de', color: '#69766f' });
            dot.css({ background: '#87938b', boxShadow: 'none' });
            text.text(state === 'unscanned' ? 'SCAN NOT RUN' : 'SCAN RESULT INCOMPLETE');
            targetLabel.text(state === 'unscanned' ? 'NOT SCANNED' : 'UNVERIFIED');
            sweepText.text(state === 'unscanned' ? 'Awaiting First Scan' : 'Score unavailable');
        } else if (state === 'threat' || (threatsCount && threatsCount > 0)) {
            pill.css({ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' });
            dot.css({ background: '#ef4444', boxShadow: '0 0 10px #ef4444' });
            text.text('THREAT DETECTED');
            targetLabel.text('THREAT');
            sweepText.text('Active Defense Mode');
        } else if (state === 'warning' || (score < 80 && score >= 50)) {
            pill.css({ background: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#fbbf24' });
            dot.css({ background: '#f59e0b', boxShadow: '0 0 10px #f59e0b' });
            text.text('WARNING DETECTED');
            targetLabel.text('REVIEW');
            sweepText.text('Monitoring Alert');
        } else {
            pill.css({ background: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#34d399' });
            dot.css({ background: '#10b981', boxShadow: '0 0 10px #10b981' });
            text.text('SYSTEM PROTECTED');
            targetLabel.text('SECURE');
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
        updateRadarStatusState('unknown');
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
        checkActiveScanOnLoad();
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
    function update18DomainsMatrix(scanData, findings, scanVerified) {
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
        if (!scanVerified) {
            Object.keys(domainsStatus).forEach(function(key) {
                domainsStatus[key].status = 'unknown';
            });
        }

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
            } else if (data.status === 'unknown') {
                badge.addClass('badge-idle').text('NOT VERIFIED');
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

        var scoreValue = Number(data.score);
        var hasScore = data.score !== undefined && data.score !== null && data.score !== '' && isFinite(scoreValue);
        var score = hasScore ? Math.max(0, Math.min(100, Math.round(scoreValue))) : null;
        var issues = data.issues_found || 0;
        var duration = data.duration || data.duration_seconds || 0;
        var scanData = data.results || data.vulnerabilities || data;
        if (typeof scanData === 'string') {
            try { scanData = JSON.parse(scanData); } catch(e) { scanData = {}; }
        }

        lastScanId = data.queue_id || data.scan_id || 0;

        // Health score update
        $('#wafScanScore').html(hasScore ? score + '<span class="mdf-unit">/100</span>' : '&mdash;');
        if (!hasScore) {
            $('#mdfHealthSub').text('Scan score unavailable').attr('class', 'mdf-telemetry-sub');
        } else if (score >= 80) {
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
            var hasMetric = function(key) {
                return Object.prototype.hasOwnProperty.call(rm, key) && isFinite(Number(rm[key]));
            };
            if (hasMetric('total_files')) {
                $('#wafSummaryFilesCount, #mdfStatFiles').text(Number(rm.total_files).toLocaleString());
            }
            if (hasMetric('plugin_files') && hasMetric('theme_files')) {
                var componentFiles = Number(rm.plugin_files) + Number(rm.theme_files);
                $('#wafSummaryThemesCount').text(componentFiles.toLocaleString());
                $('#mdfStatThemesPlugins').text(componentFiles.toLocaleString());
            }
            if (hasMetric('users_checked')) $('#mdfStatUsers').text(Number(rm.users_checked).toLocaleString());
            if (hasMetric('database_tables')) $('#mdfStatDatabaseTables').text(Number(rm.database_tables).toLocaleString());
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
        $('#mdfThreatLabel').text('Findings in last scan');
        $('#mdfThreatSub').text(criticalCount === 1 ? '1 Critical Threat' : criticalCount + ' Actionable Threats');
        $('#wafResultsFoundCount').text(findings.length + ' Issues');
        $('#wafTabAllCount').text(findings.length);
        $('#wafTabCriticalCount').text(criticalCount);
        $('#wafTabWarningCount').text(warningCount);

        // Update Radar Canvas & 18 Domains
        var overallState = !hasScore ? 'unknown' : ((criticalCount > 0) ? 'threat' : (warningCount > 0 ? 'warning' : 'protected'));
        updateRadarStatusState(overallState, score, criticalCount);
        update18DomainsMatrix(scanData, findings, hasScore);

        // Render Finding Cards with Structured Evidence
        cachedAllFindings = findings;
        loadIgnoredIssues(function() {
            renderCurrentTabFindings();
        });

        // Load History & Backups & Timeline
        loadScanHistory();
        loadBackups();
        loadSecurityTimeline(findings);
    }

    var currentScanTab = 'all';
    var cachedAllFindings = [];
    var ignoredIssuesMap = {};

    function loadIgnoredIssues(callback) {
        $.post(ajaxurl, { action: 'waf_fw_ignore_scan_issue', op: 'get' }, function(res) {
            if (res && res.success && res.data && res.data.ignored) {
                ignoredIssuesMap = {};
                res.data.ignored.forEach(function(item) {
                    var key = typeof item === 'string' ? item : (item.id || item.file);
                    if (key) ignoredIssuesMap[key] = item;
                });
            }
            if (callback) callback();
        }).fail(function() {
            if (callback) callback();
        });
    }

    function renderCurrentTabFindings() {
        var activeFindings = [];
        var ignoredFindings = [];

        cachedAllFindings.forEach(function(f) {
            var key = f.id || f.file;
            if (ignoredIssuesMap[key]) {
                ignoredFindings.push(f);
            } else {
                activeFindings.push(f);
            }
        });

        // Include any issues in ignoredIssuesMap not currently in cachedAllFindings
        Object.keys(ignoredIssuesMap).forEach(function(k) {
            var found = false;
            cachedAllFindings.forEach(function(f) {
                if ((f.id || f.file) === k) found = true;
            });
            if (!found) {
                var item = ignoredIssuesMap[k];
                ignoredFindings.push({
                    id: k,
                    file: item.file || k,
                    title: item.title || k,
                    type: item.type || 'Ignored Issue',
                    severity: item.severity || 'medium',
                    date: item.ignored_at || formatScanDate(new Date()),
                    details: 'This issue was previously reviewed and marked as ignored by the administrator.',
                    is_ignored: true
                });
            }
        });

        var criticalActive = [];
        var warningActive = [];
        activeFindings.forEach(function(f) {
            if (f.severity === 'critical') {
                criticalActive.push(f);
            } else {
                warningActive.push(f);
            }
        });

        // Update counts in header badge and tabs matching Image 1
        $('#wafHeaderIssuesBadge').text(activeFindings.length + ' Issues');
        $('#wafTabAllCount').text(activeFindings.length);
        $('#wafTabCriticalCount').text(criticalActive.length);
        $('#wafTabWarningCount').text(warningActive.length);
        $('#wafTabIgnoredCount').text(ignoredFindings.length);
        $('#wafResultsFoundCount').text(activeFindings.length + ' Issues');

        var findingsToRender = [];
        if (currentScanTab === 'ignored') {
            findingsToRender = ignoredFindings;
        } else if (currentScanTab === 'critical') {
            findingsToRender = criticalActive;
        } else if (currentScanTab === 'warning') {
            findingsToRender = warningActive;
        } else {
            findingsToRender = activeFindings;
        }

        if (findingsToRender.length === 0) {
            if (currentScanTab === 'ignored') {
                $('#wafScanDetails').html(
                    '<div class="mdf-empty-state" id="mdfNoIgnoredState">' +
                    '    <div class="mdf-empty-icon">' +
                    '        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>' +
                    '    </div>' +
                    '    <h4>Zero Ignored Issues</h4>' +
                    '    <p>You have not ignored any security findings. When you review an issue and click "IGNORE" or "MARK AS FIXED", it will safely appear here.</p>' +
                    '</div>'
                );
            } else if (currentScanTab === 'critical') {
                $('#wafScanDetails').html(
                    '<div class="mdf-empty-state">' +
                    '    <div class="mdf-empty-icon">' +
                    '        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>' +
                    '    </div>' +
                    '    <h4>Zero Critical Threats</h4>' +
                    '    <p>No critical security threats or backdoors found in this filter.</p>' +
                    '</div>'
                );
            } else {
                $('#wafScanDetails').html(
                    '<div class="mdf-empty-state" id="mdfNoFindingsState">' +
                    '    <div class="mdf-empty-icon">' +
                    '        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>' +
                    '    </div>' +
                    '    <h4>Zero Threats Detected</h4>' +
                    '    <p>Your WordPress files, core checksums, database and server configuration match pristine baseline integrity.</p>' +
                    '</div>'
                );
            }
            updateTopButtonStates(0, 0);
            return;
        }

        var deletableTotal = 0;
        var repairableTotal = 0;
        var isIgnoredTab = (currentScanTab === 'ignored');

        var html = '';
        findingsToRender.forEach(function(f, idx) {
            var sev = f.severity || 'warning';
            var sevLabel = sev === 'critical' ? 'Critical' : (sev === 'high' ? 'High' : (sev === 'medium' ? 'Medium' : 'Warning'));
            var filePath = f.file || '';
            var typeLabel = f.type || 'File';
            var isCore = isCoreFile(filePath);
            var isTheme = (filePath.indexOf('wp-content/themes/') !== -1);
            var isPlugin = (filePath.indexOf('wp-content/plugins/') !== -1);
            var isUploads = (filePath.indexOf('wp-content/uploads/') !== -1 || filePath.indexOf('wp-content/cache/') !== -1);
            var dateFound = f.date || formatScanDate(new Date());

            // SAFETY CLASSIFICATION:
            // 1. Core files: CAN NEVER BE DELETED! They are ONLY REPAIRABLE.
            var isRepairable = Boolean(!isIgnoredTab && isCore && filePath.indexOf('wp-config.php') === -1);
            if (isRepairable) repairableTotal++;

            // 2. Standalone malware: ONLY deletable if it is strictly NOT a core file, NOT a theme, NOT a plugin!
            // Injected backdoors in themes/plugins can NEVER have a raw delete button!
            var isDeletable = Boolean(!isIgnoredTab && f.is_deletable && !isCore && !isTheme && !isPlugin && isUploads);
            if (isDeletable) deletableTotal++;

            // SVG Icons based on type
            var iconSvg = '';
            if (typeLabel.indexOf('Password') !== -1 || typeLabel.indexOf('User') !== -1) {
                iconSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
            } else if (typeLabel.indexOf('Theme') !== -1 || typeLabel.indexOf('Upgrade') !== -1) {
                iconSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 11l-8-8-8.5 8.5a2.12 2.12 0 0 0 3 3L11 9"/><path d="M5 19l4-4"/><path d="M15 5l4 4"/></svg>';
            } else if (typeLabel.indexOf('Malware') !== -1 || typeLabel.indexOf('Webshell') !== -1 || typeLabel.indexOf('Backdoor') !== -1) {
                iconSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="11" r="3"/></svg>';
            } else {
                iconSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
            }

            var rowId = f.id || ('wf-finding-' + idx);
            html += '<div class="mdf-wf-finding-row severity-' + escapeHtml(sev) + '" data-file="' + escapeHtml(filePath) + '" data-severity="' + escapeHtml(sev) + '" data-repairable="' + (isRepairable ? '1' : '0') + '" data-deletable="' + (isDeletable ? '1' : '0') + '" id="' + escapeHtml(rowId) + '">';
            
            // 1. Finding Row Main Line
            html += '    <div class="mdf-wf-row-main">';
            html += '        <div class="mdf-wf-row-icon icon-' + escapeHtml(sev) + '">' + iconSvg + '</div>';
            html += '        <div class="mdf-wf-row-body">';
            html += '            <div class="mdf-wf-row-title">' + escapeHtml(f.title) + '</div>';
            html += '            <div class="mdf-wf-row-type">Type: ' + escapeHtml(typeLabel) + '</div>';
            html += '        </div>';
            html += '        <div class="mdf-wf-row-meta">';
            html += '            <span class="mdf-wf-meta-date">Issue Found ' + escapeHtml(dateFound) + '</span>';
            html += '            <span class="mdf-wf-meta-sev"><span class="sev-dot-' + escapeHtml(sev) + '">&bull;</span> ' + escapeHtml(sevLabel) + '</span>';
            html += '        </div>';
            
            // Action Buttons on Right
            html += '        <div class="mdf-wf-row-actions">';
            
            if (isIgnoredTab) {
                // In Ignored Tab: Offer RESTORE button to un-ignore
                html += '        <button type="button" class="mdf-wf-action-btn waf-btn-restore-issue" data-id="' + escapeHtml(rowId) + '" data-file="' + escapeHtml(filePath) + '" title="Restore issue to active scan findings">';
                html += '            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';
                html += '            <span>RESTORE</span>';
                html += '        </button>';
            } else {
                // In Active Tab:
                // ONLY repairable core files get the REPAIR button!
                if (isRepairable) {
                    html += '        <button type="button" class="mdf-wf-action-btn btn-act-repair waf-btn-open-repair-modal" data-file="' + escapeHtml(filePath) + '" title="Restore clean official WordPress.org file">';
                    html += '            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>';
                    html += '            <span>REPAIR</span>';
                    html += '        </button>';
                }
                
                // ONLY isolated rogue malware files in uploads get the DELETE button! Core, themes, and plugins NEVER get DELETE!
                if (isDeletable) {
                    html += '        <button type="button" class="mdf-wf-action-btn btn-act-delete waf-btn-clean-file" data-file="' + escapeHtml(filePath) + '" title="Quarantine / Delete isolated malware">';
                    html += '            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
                    html += '            <span>DELETE</span>';
                    html += '        </button>';
                }

                html += '            <button type="button" class="mdf-wf-action-btn waf-btn-ignore-file" data-id="' + escapeHtml(rowId) + '" data-file="' + escapeHtml(filePath) + '" title="Ignore / Whitelist">';
                html += '                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
                html += '                <span>IGNORE</span>';
                html += '            </button>';
            }

            html += '            <button type="button" class="mdf-wf-action-btn mdf-btn-wf-details" title="Details">';
            html += '                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
            html += '                <span>DETAILS</span>';
            html += '            </button>';
            html += '        </div>';
            html += '    </div>';

            // 2. Expandable DETAILS Drawer
            html += '    <div class="mdf-wf-drawer">';
            if (filePath) {
                html += '        <div class="mdf-wf-drawer-field"><strong>Filename:</strong> <span class="mdf-wf-path-code">' + escapeHtml(filePath) + '</span></div>';
                html += '        <div class="mdf-wf-drawer-field"><strong>File Type:</strong> ' + (isCore ? 'Core (Protected System File)' : (isPlugin ? 'Plugin File' : (isTheme ? 'Theme File' : 'Uploads / Script'))) + '</div>';
            }
            html += '        <div class="mdf-wf-drawer-field"><strong>Details:</strong> ' + (f.details || 'This file has been modified and differs from the original pristine release version.') + '</div>';

            // Forensic Evidence Bullet List
            if (f.evidence && Array.isArray(f.evidence) && f.evidence.length > 0) {
                html += '        <div class="mdf-wf-drawer-field" style="margin-top:6px;"><strong>Forensic Signals:</strong>';
                html += '            <ul style="margin:4px 0 0 18px;list-style-type:disc;color:#475569;font-size:12px;line-height:1.6;">';
                f.evidence.forEach(function(ev) {
                    html += '                <li>' + escapeHtml(ev) + '</li>';
                });
                html += '            </ul>';
                html += '        </div>';
            }

            // Forensic Code Snippet Box (Line Number & Malicious/Divergent Code)
            var snippetCode = f.code_snippet || '';
            var lineNum = f.line_number || '';
            if (f.evidence && Array.isArray(f.evidence)) {
                f.evidence.forEach(function(ev) {
                    var mLine = ev.match(/\[Line\s*(\d+)\]/i) || ev.match(/on line\s+(\d+)/i) || ev.match(/line\s+(\d+):/i);
                    if (mLine && !lineNum) lineNum = mLine[1];
                    var mCode = ev.match(/(eval\(|base64_decode|assert\(|system\(|passthru\(|exec\(|preg_replace\(|file_put_contents|curl_exec|shell_exec|wp_create_user)[^<]*/i);
                    if (mCode && !snippetCode) snippetCode = mCode[0];
                });
            }

            if (snippetCode || lineNum || isCore) {
                var lineTitle = lineNum ? 'LINE ' + escapeHtml(lineNum) + ': ' : 'LINE 12-18: ';
                var boxTitle = isCore ? lineTitle + 'CORE DIVERGENCE / INJECTED CODE' : lineTitle + 'MALICIOUS PATTERN / WEBSHELL PAYLOAD';
                html += '        <div class="mdf-wf-code-box">';
                html += '            <div class="mdf-wf-code-header">';
                html += '                <span>' + boxTitle + '</span>';
                html += '                <span>' + (isCore ? 'REPAIRABLE CORE FILE' : 'AST FORENSICS') + '</span>';
                html += '            </div>';
                html += '            <div class="mdf-wf-code-content">' + escapeHtml(snippetCode || (isCore ? 'Local file hash differs from WordPress.org release. An injected backdoor or modification was detected. Click "View Differences" to compare lines or "Repair File" to restore.' : 'Dynamic payload signature identified in execution flow.')) + '</div>';
                html += '        </div>';
            }

            // Drawer Action Buttons
            html += '        <div class="mdf-wf-drawer-actions">';
            if (filePath) {
                html += '            <button type="button" class="mdf-wf-outline-btn waf-btn-view-file" data-file="' + escapeHtml(filePath) + '" title="View complete file source with line numbers for manual inspection">VIEW FILE</button>';
            }
            if (isRepairable) {
                html += '            <button type="button" class="mdf-wf-outline-btn waf-btn-view-diff" data-file="' + escapeHtml(filePath) + '" title="Compare local modified file with pristine official WordPress.org file">VIEW DIFFERENCES</button>';
            }
            if (isIgnoredTab) {
                html += '            <button type="button" class="mdf-wf-outline-btn waf-btn-restore-issue" data-id="' + escapeHtml(rowId) + '" data-file="' + escapeHtml(filePath) + '" title="Restore issue to active scan findings">RESTORE ISSUE</button>';
            } else {
                html += '            <button type="button" class="mdf-wf-outline-btn mdf-wf-btn-mark waf-btn-ignore-file" data-id="' + escapeHtml(rowId) + '" data-file="' + escapeHtml(filePath) + '" title="Mark issue as fixed or whitelist if manually resolved">MARK AS FIXED</button>';
            }
            if (isRepairable) {
                html += '            <button type="button" class="mdf-wf-outline-btn mdf-wf-btn-do-repair waf-btn-open-repair-modal" data-file="' + escapeHtml(filePath) + '" title="Restore pristine official code from WordPress.org repository">REPAIR FILE</button>';
            } else if (isDeletable) {
                html += '            <button type="button" class="mdf-wf-outline-btn waf-btn-clean-file" data-file="' + escapeHtml(filePath) + '" style="color:#dc2626;border-color:#fca5a5;">DELETE FILE</button>';
            }
            html += '        </div>';
            html += '    </div>';

            html += '</div>'; // End finding row
        });

        $('#wafScanDetails').html(html);
        updateTopButtonStates(repairableTotal, deletableTotal);
    }

    function renderFindingCards(findings) {
        cachedAllFindings = findings || [];
        loadIgnoredIssues(function() {
            renderCurrentTabFindings();
        });
    }

    function updateTopButtonStates(repairableCount, deletableCount) {
        var repBtn = $('#wafBulkRestoreBtn');
        var delBtn = $('#wafBulkCleanBtn');

        if (repairableCount > 0) {
            repBtn.prop('disabled', false).css({ opacity: '1', cursor: 'pointer' });
            repBtn.text('REPAIR ALL REPAIRABLE FILES (' + repairableCount + ')');
        } else {
            repBtn.prop('disabled', true).css({ opacity: '0.6', cursor: 'not-allowed' });
            repBtn.text('REPAIR ALL REPAIRABLE FILES');
        }

        if (deletableCount > 0) {
            delBtn.prop('disabled', false).css({ opacity: '1', cursor: 'pointer' });
            delBtn.text('DELETE ALL DELETABLE FILES (' + deletableCount + ')');
        } else {
            delBtn.prop('disabled', false).css({ opacity: '0.7', cursor: 'pointer' });
            delBtn.text('DELETE ALL DELETABLE FILES');
        }
    }
    function parseFindingsFromScanData(scanData) {
        var findings = [];
        if (!scanData || typeof scanData !== 'object') return findings;

        var scanDateText = formatScanDate((scanData.completed_at || scanData.created_at || (scanData.summary && scanData.summary.timestamp)) || new Date());

        // 1. Real WordPress Core Checksum Mismatches (Only if actual modified core files found)
        var checksums = null;
        if (scanData.wordpress_checks && scanData.wordpress_checks.wp_checksums) {
            checksums = scanData.wordpress_checks.wp_checksums;
        } else if (scanData.malware_scan && scanData.malware_scan.wp_checksums) {
            checksums = scanData.malware_scan.wp_checksums;
        } else if (scanData.wp_checksums) {
            checksums = scanData.wp_checksums;
        }

        if (checksums && Array.isArray(checksums.modified_files) && checksums.modified_files.length > 0) {
            checksums.modified_files.forEach(function(mf, idx) {
                var filePath = (typeof mf === 'string') ? mf : (mf.file || mf.path || '');
                if (!filePath) return;
                findings.push({
                    id: 'core_mismatch_' + idx,
                    title: 'WordPress core file modified: ' + filePath,
                    type: 'Core Integrity',
                    severity: 'high',
                    severityLabel: 'High',
                    date: scanDateText,
                    details: 'This WordPress core file has been modified and differs from the official release distributed by WordPress.org.',
                    evidence: [
                        'Official SHA-256 baseline hash mismatch against WordPress.org repository.',
                        'Divergence detected in official core system file.'
                    ],
                    file: filePath,
                    line_number: mf.line_number || '',
                    code_snippet: mf.code_snippet || ('Core divergence detected on server disk: ' + filePath),
                    actions: [
                        { label: 'Visual Diff', class: 'waf-btn-view-diff', file: filePath },
                        { label: 'Repair File', class: 'waf-btn-open-repair-modal', file: filePath }
                    ]
                });
            });
        }

        // 2. Real Insecure Password & User Audit (Only if real weak admins detected)
        if (scanData.password_audit && Array.isArray(scanData.password_audit.admin_with_weak) && scanData.password_audit.admin_with_weak.length > 0) {
            scanData.password_audit.admin_with_weak.forEach(function(u, idx) {
                var loginName = escapeHtml(u.user_login || 'administrator');
                var userEmail = escapeHtml(u.user_email || '');
                findings.push({
                    id: 'user_insecure_' + idx,
                    title: 'User "' + loginName + '" with "administrator" access has an easy password.',
                    type: 'Insecure Password',
                    severity: 'critical',
                    severityLabel: 'Critical',
                    date: scanDateText,
                    details: 'A user with the role of \'administrator\' has a password that is easy to guess. Please change this password yourself or ask the user to change it.' + (userEmail ? '<br><br><strong>Login Name:</strong> ' + loginName + '<br><strong>User Email:</strong> ' + userEmail : ''),
                    evidence: ['Weak administrative credentials detected on active administrator account.'],
                    file: '',
                    actions: []
                });
            });
        }

        // Render only vulnerabilities returned by the scanner; an available update alone is not a vulnerability.
        if (scanData.vulnerability_scan) {
            var vulnerabilityGroups = [
                { key: 'known_vulnerabilities', label: 'WordPress security' },
                { key: 'plugin_vulnerabilities', label: 'Plugin vulnerability' },
                { key: 'theme_vulnerabilities', label: 'Theme vulnerability' }
            ];

            vulnerabilityGroups.forEach(function(group) {
                var records = scanData.vulnerability_scan[group.key];
                if (!Array.isArray(records)) return;

                records.forEach(function(vulnerability, idx) {
                    var severity = String(vulnerability.severity || 'info').toLowerCase();
                    if (['critical', 'high', 'medium', 'warning', 'info'].indexOf(severity) === -1) {
                        severity = 'info';
                    }

                    var cve = vulnerability.cve || vulnerability.vuln_id || '';
                    var component = vulnerability.plugin || vulnerability.theme || '';
                    var title = vulnerability.type || (component ? group.label + ': ' + component : group.label);
                    if (component && title.toLowerCase().indexOf(String(component).toLowerCase()) === -1) {
                        title += ': ' + component;
                    }
                    if (cve) title += ' (' + cve + ')';

                    var evidence = [];
                    if (cve) evidence.push('Vulnerability identifier: ' + cve);
                    if (component) evidence.push('Affected component: ' + component);

                    findings.push({
                        id: 'vulnerability_' + group.key + '_' + idx,
                        title: title,
                        type: group.label,
                        severity: severity,
                        severityLabel: severity.charAt(0).toUpperCase() + severity.slice(1),
                        date: scanDateText,
                        details: escapeHtml(vulnerability.description || 'The scanner reported a known security issue. Review the component and update guidance before taking action.'),
                        evidence: evidence,
                        file: '',
                        actions: []
                    });
                });
            });
        }

        // 4. Standalone Rogue Malware Files & Genuine Webshells
        if (scanData.malware_scan && Array.isArray(scanData.malware_scan.suspicious_files)) {
            scanData.malware_scan.suspicious_files.forEach(function(f, idx) {
                var p = (f.file || '').replace(/\\/g, '/');
                
                // Exclude security plugins and self-code from false positive alarms
                if (/wp-content\/plugins\/(mdefender|md-defender|wp-waf|wordfence)/i.test(p)) {
                    return;
                }

                // Exclude known official plugin assets from false positives
                if (p.indexOf('wp-content/plugins/woocommerce/assets/') !== -1) {
                    return;
                }

                // Core files belong to core checksum divergence, not standalone rogue malware
                if (isCoreFile(p) || p.indexOf('wp-admin/') !== -1 || p.indexOf('wp-includes/') !== -1) {
                    return;
                }

                var isTheme = (p.indexOf('wp-content/themes/') !== -1);
                var isPlugin = (p.indexOf('wp-content/plugins/') !== -1);
                var isUploads = (p.indexOf('wp-content/uploads/') !== -1 || p.indexOf('wp-content/cache/') !== -1);

                var lineNo = f.line_number || (f.line ? f.line : '');
                if (!lineNo && f.findings) {
                    f.findings.forEach(function(ev) {
                        var m = ev.match(/\[Line\s*(\d+)\]/i) || ev.match(/line\s*(\d+)/i);
                        if (m && !lineNo) lineNo = m[1];
                    });
                }
                if (!lineNo) lineNo = '1';

                var snippet = f.snippet || '';
                if (!snippet && f.findings && f.findings.length > 0) {
                    for (var fi = 0; fi < f.findings.length; fi++) {
                        if (f.findings[fi].indexOf('->') !== -1 || f.findings[fi].indexOf('(') !== -1 || f.findings[fi].indexOf('backdoor:') !== -1) {
                            snippet = f.findings[fi].replace(/^backdoor:\s*/i, '');
                            break;
                        }
                    }
                }
                if (!snippet) snippet = 'Dynamic payload or eval sink identified on line ' + lineNo + '.';

                findings.push({
                    id: 'malware_file_' + idx,
                    title: (f.threat || 'Malicious Payload / Webshell Detected') + ': ' + f.file,
                    type: (isTheme ? 'Theme Backdoor Injection' : (isPlugin ? 'Plugin Backdoor Injection' : 'Rogue Standalone Malware')),
                    severity: f.severity || 'critical',
                    severityLabel: (f.severity === 'warning') ? 'Warning' : 'Critical',
                    date: scanDateText,
                    details: (isTheme || isPlugin) ?
                        'Forensic static analysis detected suspicious backdoor pattern inside an installed ' + (isTheme ? 'theme' : 'plugin') + ' component: <code>' + escapeHtml(f.file) + '</code>.<br><strong>Safety Notice:</strong> To protect your WordPress site from breaking, this file cannot be automatically deleted. Use "VIEW FILE" to inspect the code lines and safely clean the backdoor.' :
                        'Forensic static analysis identified rogue malware/webshell in <code>' + escapeHtml(f.file) + '</code>.',
                    evidence: f.findings || [f.threat || 'Dynamic payload signature identified.'],
                    line_number: lineNo,
                    code_snippet: snippet,
                    file: f.file,
                    is_deletable: isUploads, // ONLY standalone rogue files in uploads/cache can be deleted!
                    actions: [
                        { label: 'View File Source', class: 'waf-btn-view-file', file: f.file }
                    ]
                });
            });
        }

        // 5. Sensitive Data / Config Exposures
        if (scanData.malware_scan && Array.isArray(scanData.malware_scan.secrets_found)) {
            scanData.malware_scan.secrets_found.forEach(function(s, idx) {
                var sFile = s.file || '';
                findings.push({
                    id: 'secret_file_' + idx,
                    title: 'Sensitive Configuration / Credentials File Exposed: ' + sFile,
                    type: 'Config Exposure',
                    severity: 'warning',
                    severityLabel: 'Warning',
                    date: scanDateText,
                    details: 'A configuration or sensitive credentials file was identified on server: <code>' + escapeHtml(sFile) + '</code>.',
                    evidence: s.findings || ['Sensitive configuration file exposed in webroot.'],
                    file: sFile,
                    actions: [
                        { label: 'View File Source', class: 'waf-btn-view-file', file: sFile }
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
                        html += '    <td style="font-weight:600;color:#26332f;word-break:break-all;">' + escapeHtml(b.original_path) + '</td>';
                        html += '    <td style="color:#66756d;">' + escapeHtml(b.time) + '</td>';
                        html += '    <td style="color:#66756d;">' + escapeHtml(b.size) + '</td>';
                        html += '    <td style="color:#66756d;font-family:monospace;font-size:11px;">' + escapeHtml(b.hash || 'Verified') + '</td>';
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

                    var origCode = r.data.original_code || r.data.original_content || '';
                    var locCode = r.data.local_code || r.data.local_content || '';
                    var diffRows = computeDiffRows(origCode, locCode);
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
                    updateRadarStatusState('scanning');
                    $('#wafScanProgress').show();
                    updateProgress(scan);
                    scheduleContinue();
                } else {
                    updateRadarStatusState('unscanned');
                }
            }
        }).fail(function() {
            updateRadarStatusState('unknown');
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

                // Details Drawer Toggle (Wordfence-Grade Accordion)
        $(document).on('click', '.mdf-btn-details-toggle, .mdf-finding-header', function(e) {
            // If click was on an action button, don't toggle drawer
            if ($(e.target).closest('.mdf-quick-btn:not(.btn-quick-details), .mdf-copy-path-btn').length > 0) {
                return;
            }
            e.stopPropagation();
            var card = $(this).closest('.mdf-finding-item');
            var drawer = card.find('.mdf-finding-drawer');
            var chevron = card.find('.mdf-details-chevron');
            drawer.slideToggle(200, function() {
                if (drawer.is(':visible')) {
                    chevron.css('transform', 'rotate(180deg)');
                } else {
                    chevron.css('transform', 'rotate(0deg)');
                }
            });
        });

        // Expand All / Collapse All Details
        $('#wafToggleAllDetailsBtn').on('click', function() {
            var drawers = $('.mdf-finding-drawer');
            var chevrons = $('.mdf-details-chevron');
            var text = $('#wafToggleAllText');
            if (drawers.first().is(':visible')) {
                drawers.slideUp(200);
                chevrons.css('transform', 'rotate(0deg)');
                text.text('Expand All');
            } else {
                drawers.slideDown(200);
                chevrons.css('transform', 'rotate(180deg)');
                text.text('Collapse All');
            }
        });

        // Copy Path to Clipboard
        $(document).on('click', '.mdf-copy-path-btn', function(e) {
            e.stopPropagation();
            var path = $(this).attr('data-path');
            var btn = $(this);
            if (navigator.clipboard && path) {
                navigator.clipboard.writeText(path).then(function() {
                    var origHtml = btn.html();
                    btn.html('<span style="color:#10b981;font-size:10px;font-weight:700;">&check;</span>');
                    setTimeout(function() { btn.html(origHtml); }, 1500);
                });
            }
        });

        // Toggle 18 Domains Sentinel Drawer
        $('#mdfToggleDomainsBtn, #mdfDomainsHeaderToggle').on('click', function(e) {
            e.stopPropagation();
            var grid = $('#mdfDomainsGrid');
            var chevron = $('#mdfToggleDomainsBtn .mdf-chevron-icon');
            var text = $('#mdfToggleDomainsText');
            grid.slideToggle(240, function() {
                if (grid.is(':visible')) {
                    chevron.css('transform', 'rotate(180deg)');
                    text.text('Hide 18 Sentinels');
                } else {
                    chevron.css('transform', 'rotate(0deg)');
                    text.text('View 18 Sentinels');
                }
            });
        });

        // Category Filter Tabs
        $('.mdf-filter-tabs-row .mdf-tab-btn').on('click', function() {
            $('.mdf-filter-tabs-row .mdf-tab-btn').removeClass('active');
            $(this).addClass('active');
            var tab = $(this).data('tab');
            if (tab === 'all') {
                $('.mdf-finding-item').show();
            } else if (tab === 'critical') {
                $('.mdf-finding-item').hide();
                $('.mdf-finding-item[data-severity="critical"]').show();
            } else if (tab === 'warning') {
                $('.mdf-finding-item').hide();
                $('.mdf-finding-item[data-severity="warning"]').show();
            } else if (tab === 'ignored') {
                $('.mdf-finding-item').hide();
                $('.mdf-finding-item[data-severity="ignored"]').show();
            }
        });

                // Click history row to load findings
        $(document).on('click', '.mdf-history-clickable-row', function() {
            var scanId = $(this).data('id');
            $('.mdf-history-clickable-row').css('background', '');
            $(this).css('background', '#eff6ff');
            $.get(ajaxurl + '?action=waf_fw_get_active_or_last_scan&scan_id=' + scanId, function(r) {
                if (r.success && r.data) {
                    displayScanResults(r.data);
                    if ($('#wafScanResults').length) {
                        $('html, body').animate({
                            scrollTop: $('#wafScanResults').offset().top - 40
                        }, 250);
                    }
                }
            });
        });

        // View Code Modal with Line Numbers for Manual Forensics & Manual Cleanup
        $(document).on('click', '.waf-btn-view-file', function() {
            var file = $(this).data('file') || $(this).attr('data-file');
            $('#wafCodeModalTitle').text(file);
            $('#wafCodeModalMeta').text('Loading source code from server...');
            $('#wafModalCode').text('Loading file source code...');
            $('#wafCodeModal').css('display', 'flex');

            $.get(ajaxurl, { action: 'waf_fw_view_scan_file', file: file }, function(r) {
                if (r.success && r.data) {
                    var codeText = r.data.code !== undefined ? r.data.code : (r.data.content !== undefined ? r.data.content : '');
                    var lines = codeText ? codeText.split(/\r\n|\r|\n/) : [];
                    var linesCount = lines.length;
                    var sizeStr = r.data.size || '';
                    
                    $('#wafCodeModalMeta').html(
                        '<span>' + linesCount + ' lines • ' + sizeStr + '</span> &bull; ' +
                        '<span style="color:#059669;font-weight:600;">Manual Inspection:</span> ' +
                        '<span style="color:#64748b;">Inspect line numbers below or open in your editor to remove injected lines manually, then click "Mark as Fixed".</span>'
                    );

                    // Add formatted line numbers (e.g. "   1 | <?php")
                    var maxDigits = Math.max(3, linesCount.toString().length);
                    var numberedLines = lines.map(function(line, idx) {
                        var numStr = (idx + 1).toString();
                        while (numStr.length < maxDigits) numStr = ' ' + numStr;
                        return numStr + ' | ' + line;
                    });

                    $('#wafModalCode').text(numberedLines.join('\n'));
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
                frequency: interval,
                email: email,
                nonce: (typeof waf_fw_ajax !== 'undefined') ? waf_fw_ajax.nonce : ''
            }, function(r) {
                if (r && r.success) {
                    alert('Scan schedule saved successfully!');
                    $('#wafScheduleModal').hide();
                } else {
                    alert((r && r.data && r.data.message) ? r.data.message : 'Could not save the scan schedule.');
                }
            }).fail(function(xhr) {
                var message = xhr.responseJSON && xhr.responseJSON.data && xhr.responseJSON.data.message
                    ? xhr.responseJSON.data.message
                    : 'Request failed. The scan schedule was not saved.';
                alert(message);
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

        // --- ACCORDION DRAWER TOGGLE ---
        $(document).on('click', '.mdf-btn-wf-details', function(e) {
            e.stopPropagation();
            e.preventDefault();
            var row = $(this).closest('.mdf-wf-finding-row');
            row.find('.mdf-wf-drawer').stop(true, true).slideToggle(180);
        });

        $(document).on('click', '.mdf-wf-row-main', function(e) {
            if ($(e.target).closest('.mdf-wf-action-btn, a').length > 0) return;
            var row = $(this).closest('.mdf-wf-finding-row');
            row.find('.mdf-wf-drawer').stop(true, true).slideToggle(180);
        });

        // --- WORDFENCE-GRADE REPAIR CONFIRMATION MODAL ---
        $(document).on('click', '.waf-btn-open-repair-modal', function(e) {
            e.stopPropagation();
            var file = $(this).attr('data-file');
            $('#wafRepairTargetFilePath').text(file);
            $('#wafRepairModal').css('display', 'flex');
        });

        $('#wafCloseRepairModalBtn, #wafRepairCancelBtn').on('click', function() {
            $('#wafRepairModal').hide();
        });

        // Download Backup in Repair Modal (Native File Attachment Download)
        $('#wafRepairDownloadBackupBtn').on('click', function() {
            var file = $('#wafRepairTargetFilePath').text().trim();
            if (!file) return;
            var downloadUrl = ajaxurl + '?action=waf_fw_view_scan_file&download=1&file=' + encodeURIComponent(file);
            window.location.href = downloadUrl;
        });

        // Confirm Repair in Repair Modal
        $('#wafRepairConfirmBtn').on('click', function() {
            var file = $('#wafRepairTargetFilePath').text().trim();
            var btn = $(this);
            btn.prop('disabled', true).html('<span>REPAIRING...</span>');
            $.post(ajaxurl + '?action=waf_fw_restore_core_file', { file: file }, function(r) {
                btn.prop('disabled', false).html('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg><span>REPAIR FILE</span>');
                $('#wafRepairModal').hide();
                if (r.success) {
                    var row = $('.mdf-wf-finding-row[data-file="' + file + '"]');
                    row.slideUp(250, function() {
                        row.remove();
                        updateCountsAfterResolution();
                    });
                } else {
                    alert('Restore error: ' + (r.data ? r.data.message : 'Failed to restore file'));
                }
            }).fail(function() {
                btn.prop('disabled', false);
                alert('Network connection error while restoring file.');
            });
        });

        // --- MARK AS FIXED / IGNORE ---
        $(document).on('click', '.waf-btn-ignore-file, .mdf-wf-btn-mark', function(e) {
            e.stopPropagation();
            var btn = $(this);
            var row = btn.closest('.mdf-wf-finding-row');
            var file = btn.attr('data-file') || row.attr('data-file') || '';
            var issueId = btn.attr('data-id') || row.attr('id') || file;
            var title = row.find('.mdf-wf-row-title').text().trim();
            var type = row.find('.mdf-wf-row-type').text().replace(/^Type:\s*/i, '').trim();
            var sev = row.attr('data-severity') || 'medium';

            // Mark locally in state
            ignoredIssuesMap[issueId || file] = {
                id: issueId,
                file: file,
                title: title,
                type: type,
                severity: sev,
                ignored_at: 'Just now'
            };

            // Post to backend database
            $.post(ajaxurl, {
                action: 'waf_fw_ignore_scan_issue',
                op: 'ignore',
                id: issueId,
                file: file,
                title: title,
                type: type,
                severity: sev
            });

            row.slideUp(200, function() {
                renderCurrentTabFindings();
            });
        });

        // --- RESTORE FROM IGNORED ---
        $(document).on('click', '.waf-btn-restore-issue', function(e) {
            e.stopPropagation();
            var btn = $(this);
            var row = btn.closest('.mdf-wf-finding-row');
            var file = btn.attr('data-file') || row.attr('data-file') || '';
            var issueId = btn.attr('data-id') || row.attr('id') || file;

            delete ignoredIssuesMap[issueId];
            delete ignoredIssuesMap[file];

            $.post(ajaxurl, {
                action: 'waf_fw_ignore_scan_issue',
                op: 'restore',
                id: issueId,
                file: file
            });

            row.slideUp(200, function() {
                renderCurrentTabFindings();
            });
        });

        // --- WORDFENCE TABS SWITCHING (PILL TABS MATCHING IMAGE 1) ---
        $(document).on('click', '.mdf-findings-pill-tab, .mdf-wf-tab-btn', function() {
            $('.mdf-findings-pill-tab, .mdf-wf-tab-btn').removeClass('active');
            $(this).addClass('active');
            currentScanTab = $(this).data('tab') || 'all';
            renderCurrentTabFindings();
        });

        // --- EXPAND ALL / COLLAPSE ALL TOGGLE ---
        $(document).on('click', '#wafToggleExpandAllBtn', function() {
            var drawers = $('.mdf-wf-drawer');
            var isAnyClosed = false;
            drawers.each(function() {
                if (!$(this).is(':visible')) isAnyClosed = true;
            });

            if (isAnyClosed) {
                drawers.stop(true, true).slideDown(180);
                $('#wafExpandAllLabel').text('Collapse All');
            } else {
                drawers.stop(true, true).slideUp(180);
                $('#wafExpandAllLabel').text('Expand All');
            }
        });

        // --- BULK REPAIR ALL REPAIRABLE FILES ---
        $('#wafBulkRestoreBtn').on('click', function() {
            var repairButtons = $('.waf-btn-open-repair-modal');
            if (repairButtons.length === 0) {
                alert('No repairable core files found in current scan results.');
                return;
            }
            if (!confirm('Repair all ' + repairButtons.length + ' repairable core files from official WordPress.org release? Automatic snapshots will be preserved.')) return;
            
            var files = [];
            repairButtons.each(function() {
                var f = $(this).attr('data-file');
                if (f && files.indexOf(f) === -1) files.push(f);
            });
            
            var btn = $(this);
            btn.text('REPAIRING ' + files.length + ' FILES...');
            
            var done = 0;
            function restoreNext(i) {
                if (i >= files.length) {
                    btn.text('REPAIR ALL REPAIRABLE FILES');
                    alert('Successfully repaired ' + done + ' files!');
                    checkActiveScanOnLoad();
                    return;
                }
                $.post(ajaxurl + '?action=waf_fw_restore_core_file', { file: files[i] }, function(r) {
                    if (r.success) {
                        done++;
                        $('.mdf-wf-finding-row[data-file="' + files[i] + '"]').remove();
                    }
                    restoreNext(i + 1);
                }).fail(function() {
                    restoreNext(i + 1);
                });
            }
            restoreNext(0);
        });

        // --- BULK DELETE ALL DELETABLE FILES ---
        $('#wafBulkCleanBtn').on('click', function() {
            var cleanButtons = $('.waf-btn-clean-file');
            if (cleanButtons.length === 0) {
                alert('Protection Notice: No deletable files found in this scan. WordPress core files, installed themes, and plugins are protected from deletion so your website does not break. To clean modified core files, use "REPAIR ALL REPAIRABLE FILES" to restore pristine official code.');
                return;
            }
            if (!confirm('Quarantine and remove all ' + cleanButtons.length + ' detected malware files? Backups will be preserved.')) return;
            
            var files = [];
            cleanButtons.each(function() {
                var f = $(this).attr('data-file');
                if (f && files.indexOf(f) === -1) files.push(f);
            });
            
            var btn = $(this);
            btn.text('DELETING ' + files.length + ' FILES...');
            
            var done = 0;
            function cleanNext(i) {
                if (i >= files.length) {
                    btn.text('DELETE ALL DELETABLE FILES');
                    alert('Successfully quarantined ' + done + ' files!');
                    checkActiveScanOnLoad();
                    return;
                }
                $.post(ajaxurl + '?action=waf_fw_delete_scan_file', { file: files[i] }, function(r) {
                    if (r.success) {
                        done++;
                        $('.mdf-wf-finding-row[data-file="' + files[i] + '"]').remove();
                    }
                    cleanNext(i + 1);
                }).fail(function() {
                    cleanNext(i + 1);
                });
            }
            cleanNext(0);
        });

    });

})(jQuery);
